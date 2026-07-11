/* ============================================================================
 * mapScreen.js — 「地圖」分頁：觸控地圖（單指拖曳平移／單指輕點選取）、
 * 各勢力首都／城池、產地、野怪營地。對應舊版 js/map.js。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;
  const M = window.Game.Models;
  const Dlg = window.Game.UI.Dialog;

  const View = {
    canvas: null, ctx: null,
    camX: 0, camY: 0, tilePx: 40,
    selectedTile: null,
    dragging: false, dragStartX: 0, dragStartY: 0, dragStartCamX: 0, dragStartCamY: 0,
    moved: false, touchStartAt: 0,
    pendingArmyId: null
  };

  function init(canvas) {
    View.canvas = canvas;
    View.ctx = canvas.getContext('2d');
    resize();
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('click', onClickFallback);

    // 選取地塊後 #mapInfoPanel 內容變長，flexbox 會把畫布的實際版面高度往上擠壓，
    // 但 canvas 的繪圖緩衝區尺寸（canvas.width/height）不會自動跟著變，兩者一旦
    // 不同步，之後每次點擊换算出來的世界座標就會跟畫面上看到的格子對不起來
    // （點到的格子跟顯示的格子錯位）。用 ResizeObserver 讓緩衝區尺寸即時跟上。
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(() => { resize(); draw(); });
      observer.observe(canvas.parentElement);
    }
  }

  function resize() {
    const canvas = View.canvas;
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = Math.floor(rect.width);
    canvas.height = Math.floor(rect.height);
  }

  function eventPos(e) {
    const rect = View.canvas.getBoundingClientRect();
    const t = e.touches && e.touches.length ? e.touches[0] : (e.changedTouches && e.changedTouches.length ? e.changedTouches[0] : e);
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const p = eventPos(e);
    View.dragging = true;
    View.moved = false;
    View.dragStartX = p.x; View.dragStartY = p.y;
    View.dragStartCamX = View.camX; View.dragStartCamY = View.camY;
    View.touchStartAt = Date.now();
  }

  function onTouchMove(e) {
    if (!View.dragging) return;
    e.preventDefault();
    const p = eventPos(e);
    const dx = p.x - View.dragStartX, dy = p.y - View.dragStartY;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) View.moved = true;
    View.camX = clampCamX(View.dragStartCamX - dx);
    View.camY = clampCamY(View.dragStartCamY - dy);
    draw();
  }

  function onTouchEnd(e) {
    if (!View.dragging) return;
    View.dragging = false;
    if (!View.moved && Date.now() - View.touchStartAt < 600) {
      const p = eventPos(e);
      handleTap(p.x, p.y);
    }
  }

  let lastClickAt = 0;
  function onClickFallback(e) {
    if (Date.now() - lastClickAt < 700) return;
    const rect = View.canvas.getBoundingClientRect();
    handleTap(e.clientX - rect.left, e.clientY - rect.top);
  }

  function clampCamX(v) {
    const worldPx = D.MAP_CONFIG.width * View.tilePx;
    return U.clamp(v, 0, Math.max(0, worldPx - View.canvas.width));
  }
  function clampCamY(v) {
    const worldPx = D.MAP_CONFIG.height * View.tilePx;
    return U.clamp(v, 0, Math.max(0, worldPx - View.canvas.height));
  }

  function handleTap(px, py) {
    lastClickAt = Date.now();
    const wx = px + View.camX, wy = py + View.camY;
    const tx = Math.floor(wx / View.tilePx), ty = Math.floor(wy / View.tilePx);
    if (tx < 0 || ty < 0 || tx >= D.MAP_CONFIG.width || ty >= D.MAP_CONFIG.height) return;
    View.selectedTile = { x: tx, y: ty };
    renderInfoPanel(window.GameSave, Object.values(window.GameSave.players).find((p) => p.isHuman));
    draw();
  }

  function centerOnFaction(saveGame, factionId) {
    const cap = window.Game.Systems.Map.capitalTileOf(saveGame.map, factionId);
    if (!cap) return;
    View.camX = clampCamX(cap.x * View.tilePx - View.canvas.width / 2);
    View.camY = clampCamY(cap.y * View.tilePx - View.canvas.height / 2);
  }

  /* ------------------------------------------------------------------------
   * 地形視覺：以格座標做確定性 hash（同一格每次畫出來的紋理都一樣，不需要
   * 額外存進存檔），讓草地帶一點深淺變化與零星「灌木/土塊」斑點，取代原本
   * 純色平塗的格子，看起來更接近率土之濱一類 SLG 的手繪古戰場地圖質感。
   * ------------------------------------------------------------------------ */
  function hashTile(x, y, salt) {
    let h = (x * 374761393 + y * 668265263 + (salt || 0) * 2654435761) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    h = h ^ (h >>> 16);
    return ((h >>> 0) % 1000) / 1000;
  }

  const GRASS_SHADES = ['#3f6b45', '#456f4a', '#3a6440', '#4a7550'];
  const REGION_TINT = { shu: '#3aa15c', wei: '#3a6bb0', wu: '#c0392b' };

  function drawTerrain(ctx, tile, sx, sy, size) {
    const shadeIdx = Math.floor(hashTile(tile.x, tile.y, 1) * GRASS_SHADES.length);
    ctx.fillStyle = GRASS_SHADES[shadeIdx];
    ctx.fillRect(sx, sy, size, size);
    // 淡淡的勢力區域色調，讓玩家一眼看出地圖上哪一塊大致是哪個勢力的地盤。
    if (tile.regionFactionId && REGION_TINT[tile.regionFactionId]) {
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = REGION_TINT[tile.regionFactionId];
      ctx.fillRect(sx, sy, size, size);
      ctx.globalAlpha = 1;
    }
    // 零星斑點，增加手繪紋理感。
    const speckRoll = hashTile(tile.x, tile.y, 2);
    if (speckRoll < 0.35) {
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      const px = sx + size * (0.2 + hashTile(tile.x, tile.y, 3) * 0.5);
      const py = sy + size * (0.2 + hashTile(tile.x, tile.y, 4) * 0.5);
      ctx.beginPath();
      ctx.arc(px, py, size * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    const saveGame = window.GameSave;
    if (!saveGame || !View.ctx) return;
    const ctx = View.ctx, canvas = View.canvas;
    ctx.fillStyle = '#141f16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const startTx = Math.floor(View.camX / View.tilePx), startTy = Math.floor(View.camY / View.tilePx);
    const endTx = Math.ceil((View.camX + canvas.width) / View.tilePx), endTy = Math.ceil((View.camY + canvas.height) / View.tilePx);
    const size = View.tilePx;

    for (let ty = Math.max(0, startTy); ty <= Math.min(D.MAP_CONFIG.height - 1, endTy); ty++) {
      for (let tx = Math.max(0, startTx); tx <= Math.min(D.MAP_CONFIG.width - 1, endTx); tx++) {
        const tile = window.Game.Systems.Map.tileAt(saveGame.map, tx, ty);
        const sx = tx * View.tilePx - View.camX, sy = ty * View.tilePx - View.camY;
        drawTerrain(ctx, tile, sx, sy, size - 1);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 0.5, sy + 0.5, size - 2, size - 2);

        if (tile.type === 'capital') {
          drawCapital(ctx, tile, sx, sy, size);
        } else if (tile.type === 'city') {
          drawCity(ctx, tile, sx, sy, size);
        } else if (tile.type === 'resource') {
          drawResource(ctx, tile, sx, sy, size);
        } else if (tile.type === 'monster') {
          ctx.fillStyle = 'rgba(138,43,43,0.35)';
          ctx.fillRect(sx + 1, sy + 1, size - 3, size - 3);
          drawGlyph(ctx, '⚔', sx, sy, 0.42, '#ffd9d9');
        }

        if (View.selectedTile && View.selectedTile.x === tx && View.selectedTile.y === ty) {
          ctx.strokeStyle = '#ffe08a';
          ctx.lineWidth = 3;
          ctx.strokeRect(sx + 1, sy + 1, size - 3, size - 3);
        }
      }
    }

    const now = U.now();
    Object.values(saveGame.players).forEach((p) => {
      Object.values(p.armies).forEach((army) => {
        if (army.status !== 'marching' && army.status !== 'returning') return;
        const originCity = p.cities[army.originCityId] || Object.values(p.cities)[0];
        if (!originCity || !army.targetTileId) return;
        const parts = army.targetTileId.split('_');
        const targetX = parseInt(parts[0], 10), targetY = parseInt(parts[1], 10);
        const t = U.clamp((now - army.departAt) / Math.max(1, army.arriveAt - army.departAt), 0, 1);
        const fromX = army.status === 'marching' ? originCity.tileX : targetX;
        const fromY = army.status === 'marching' ? originCity.tileY : targetY;
        const toX = army.status === 'marching' ? targetX : originCity.tileX;
        const toY = army.status === 'marching' ? targetY : originCity.tileY;
        const wx = U.lerp(fromX, toX, t) * View.tilePx + View.tilePx / 2 - View.camX;
        const wy = U.lerp(fromY, toY, t) * View.tilePx + View.tilePx / 2 - View.camY;
        ctx.fillStyle = p.isHuman ? '#ffe08a' : '#ff6b6b';
        ctx.beginPath();
        ctx.arc(wx, wy, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  function drawCapital(ctx, tile, sx, sy, size) {
    const color = D.factionDefById(tile.ownerFactionId).color;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(sx + 2, sy + 2, size - 5, size - 5);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sx + size / 2, sy + size / 2, size * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e0b25a';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawGlyph(ctx, '🏯', sx, sy, 0.46, '#fff');
    drawLabel(ctx, tile.name, sx, sy, size, '#ffe08a');
  }

  function drawCity(ctx, tile, sx, sy, size) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(sx + 3, sy + 3, size - 7, size - 7);
    if (tile.ownerFactionId) {
      ctx.strokeStyle = D.factionDefById(tile.ownerFactionId).color;
      ctx.lineWidth = 3;
      ctx.strokeRect(sx + 3, sy + 3, size - 7, size - 7);
      drawGlyph(ctx, '🏰', sx, sy, 0.4, '#fff');
    } else {
      ctx.strokeStyle = '#8a8070';
      ctx.setLineDash([3, 2]);
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 3, sy + 3, size - 7, size - 7);
      ctx.setLineDash([]);
      drawGlyph(ctx, '🚩', sx, sy, 0.38, '#d8d0b8');
    }
    drawLabel(ctx, tile.name, sx, sy, size, tile.ownerFactionId ? '#fff' : '#c9c0a8');
  }

  function drawResource(ctx, tile, sx, sy, size) {
    ctx.fillStyle = 'rgba(58,107,176,0.22)';
    ctx.fillRect(sx + 3, sy + 3, size - 7, size - 7);
    if (tile.ownerFactionId) {
      ctx.strokeStyle = D.factionDefById(tile.ownerFactionId).color;
      ctx.lineWidth = 3;
      ctx.strokeRect(sx + 2, sy + 2, size - 5, size - 5);
    }
    drawGlyph(ctx, D.RESOURCE_ICONS[tile.resourceType], sx, sy, 0.4, '#fff');
  }

  function drawLabel(ctx, text, sx, sy, size, color) {
    if (!text || size < 28) return;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(sx, sy + size - 13, size, 13);
    ctx.fillStyle = color || '#fff';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, sx + size / 2, sy + size - 6, size - 2);
  }

  function drawGlyph(ctx, glyph, sx, sy, sizeRatio, color) {
    ctx.fillStyle = color || '#fff';
    ctx.font = (View.tilePx * sizeRatio) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, sx + View.tilePx / 2, sy + View.tilePx / 2);
  }

  function renderInfoPanel(saveGame, playerState) {
    const panel = document.getElementById('mapInfoPanel');
    if (!panel) return;
    U.clearNode(panel);
    const sel = View.selectedTile;
    if (!sel) { panel.appendChild(U.el('div', 'emptyHint', '點選地圖上的目標查看詳情')); return; }
    const tile = window.Game.Systems.Map.tileAt(saveGame.map, sel.x, sel.y);
    if (!tile || tile.type === 'empty') { panel.appendChild(U.el('div', 'emptyHint', '此處為空地')); return; }

    panel.appendChild(U.el('div', 'panelTitle', tile.name || '未知地點'));

    if (tile.type === 'capital') {
      panel.appendChild(U.el('div', 'subHint', D.factionDefById(tile.ownerFactionId).desc));
      if (tile.ownerFactionId === playerState.factionId) { panel.appendChild(U.el('div', 'subHint', '這是你的首都。')); return; }
    } else if (tile.type === 'city') {
      if (tile.ownerFactionId === playerState.factionId) {
        panel.appendChild(U.el('div', 'subHint', '已收復，屬於你的城池，可在「城池」分頁選擇此城管理建設。'));
        return;
      }
      if (tile.ownerFactionId) {
        panel.appendChild(U.el('div', 'subHint', '已被 ' + D.factionDefById(tile.ownerFactionId).name + ' 佔領，攻下後即可收為己有。'));
      } else {
        panel.appendChild(U.el('div', 'subHint', '仍由叛軍佔據，守備力：約 ' + tile.guardPower + '。擊破後即可收復，成為你的城池。'));
      }
    } else if (tile.type === 'resource') {
      panel.appendChild(U.el('div', 'subHint', '每分鐘產量：' + D.RESOURCE_ICONS[tile.resourceType] + tile.yieldPerMin + ' ' + D.RESOURCE_NAMES[tile.resourceType]));
      if (tile.ownerFactionId) {
        panel.appendChild(U.el('div', 'subHint', tile.ownerFactionId === playerState.factionId
          ? '已由你佔領，持續產出中，不需再駐守。'
          : '已被 ' + D.factionDefById(tile.ownerFactionId).name + ' 佔領。'));
        return;
      }
      panel.appendChild(U.el('div', 'subHint', '尚未有勢力佔領，守備力：約 ' + tile.guardPower + '。擊破守軍即可永久佔領，之後不需再駐守。'));
    } else if (tile.type === 'monster') {
      const onCooldown = tile.cooldownUntil > U.now();
      panel.appendChild(U.el('div', 'subHint', onCooldown ? ('據點恢復中：' + U.formatCountdown(tile.cooldownUntil - U.now())) : ('守備力：約 ' + tile.guardPower)));
    }

    const garrisonArmies = Object.values(playerState.armies).filter((a) => a.status === 'garrison' && window.Game.Systems.Army.unitCount(a) > 0);
    if (garrisonArmies.length === 0) {
      panel.appendChild(U.el('div', 'emptyHint', '目前沒有可派遣的駐守部隊。'));
      return;
    }
    const purpose = (tile.type === 'capital' || tile.type === 'city') ? 'attack' : 'raid';
    garrisonArmies.forEach((army) => {
      const row = U.el('div', 'exploreTargetRow');
      row.appendChild(U.el('span', '', army.name + '（' + window.Game.Systems.Army.unitCount(army) + ' 兵）'));
      const btn = U.el('button', 'smallBtn', purpose === 'attack' ? '出征' : '派遣');
      U.onTap(btn, () => {
        const r = window.Game.Systems.Army.sendArmyToTile(playerState, army.id, { x: tile.x, y: tile.y }, purpose, U.now());
        if (r.ok) {
          Dlg.toast(army.name + ' 已出發，預計 ' + U.formatDurationWords(r.etaMs) + ' 後抵達');
          window.Game.UI.Bootstrap.refreshArmyScreenIfActive();
          renderInfoPanel(saveGame, playerState);
        } else Dlg.toast(r.reason);
      });
      row.appendChild(btn);
      panel.appendChild(row);
    });
  }

  function setPendingArmy(armyId) { View.pendingArmyId = armyId; }

  function onActivate(saveGame, playerState) {
    resize();
    if (!View.selectedTile) centerOnFaction(saveGame, playerState.factionId);
    draw();
    renderInfoPanel(saveGame, playerState);
  }

  /** 以格座標選取一格地圖（等同於在該格上點擊一下），供程式化導覽或測試使用。 */
  function selectTile(saveGame, playerState, x, y) {
    View.selectedTile = { x, y };
    draw();
    renderInfoPanel(saveGame, playerState);
  }

  window.Game.UI.MapScreen = { init, resize, draw, renderInfoPanel, setPendingArmy, onActivate, centerOnFaction, selectTile };
})();
