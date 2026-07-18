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

  // 田塊／草地／道路配色：整張畫布先鋪土路色，每格內縮繪製，格與格之間自然露出
  // 田埂道路（參考率土之濱地圖的田字間隔）；水域滿版繪製、與相鄰水格連成河流。
  const ROAD_COLOR = '#9c8c68';
  const TILE_GAP = 2;
  const FIELD_TONES = ['#8aa85e', '#95b063', '#7d9c55', '#a3b56a', '#88a35b', '#90ab60'];
  const VILLAGE_TONES = ['#a8a06a', '#b0a468'];
  const GRASS_TONES = ['#6f9b52', '#79a45a', '#679250'];

  function drawTerrain(ctx, tile, sx, sy, size) {
    const terrain = tile.terrain || 'plain';
    // 水域：滿版、不留路縫，讓相鄰水格連成連續的河流／湖泊。
    if (terrain === 'water') {
      ctx.fillStyle = ['#3d6f96', '#41739b', '#396a90'][Math.floor(hashTile(tile.x, tile.y, 1) * 3)];
      ctx.fillRect(sx - 1, sy - 1, size + 2, size + 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      const wy = sy + size * (0.35 + hashTile(tile.x, tile.y, 5) * 0.35);
      ctx.beginPath();
      ctx.moveTo(sx + size * 0.15, wy);
      ctx.quadraticCurveTo(sx + size * 0.5, wy - size * 0.1, sx + size * 0.85, wy);
      ctx.stroke();
      return;
    }
    const ix = sx + TILE_GAP, iy = sy + TILE_GAP, iw = size - TILE_GAP * 2;
    if (terrain === 'pass') {
      ctx.fillStyle = '#5a4e40';
      ctx.fillRect(ix, iy, iw, iw);
      return;
    }
    if (terrain === 'mountain') {
      ctx.fillStyle = GRASS_TONES[Math.floor(hashTile(tile.x, tile.y, 1) * GRASS_TONES.length)];
      ctx.fillRect(ix, iy, iw, iw);
      drawMountainPeaks(ctx, tile, ix, iy, iw);
      return;
    }
    if (terrain === 'forest') {
      ctx.fillStyle = GRASS_TONES[Math.floor(hashTile(tile.x, tile.y, 1) * GRASS_TONES.length)];
      ctx.fillRect(ix, iy, iw, iw);
      drawTreeCluster(ctx, tile, ix, iy, iw);
      return;
    }
    // 平原：農田（田壟紋理）或聚落（土黃色地基），像照片裡一格格的田塊。
    const isVillage = tile.isLand && tile.resourceType === 'gold';
    const tones = isVillage ? VILLAGE_TONES : FIELD_TONES;
    ctx.fillStyle = tones[Math.floor(hashTile(tile.x, tile.y, 1) * tones.length)];
    ctx.fillRect(ix, iy, iw, iw);
    // 田壟：橫向淺色細紋，做出耕地質感。
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i <= 3; i++) {
      const ly = iy + (iw * i) / 4;
      ctx.moveTo(ix + 1, ly);
      ctx.lineTo(ix + iw - 1, ly);
    }
    ctx.stroke();
    // 聚落畫幾間小屋頂；一般田地偶爾點綴一叢灌木。
    if (isVillage) {
      drawHuts(ctx, tile, ix, iy, iw);
    } else if (hashTile(tile.x, tile.y, 2) < 0.3) {
      drawBush(ctx, ix + iw * (0.2 + hashTile(tile.x, tile.y, 3) * 0.5), iy + iw * (0.2 + hashTile(tile.x, tile.y, 4) * 0.5), iw * 0.1);
    }
  }

  /** 手繪風小樹叢：3~4 棵樹冠＋樹幹，位置由座標 hash 決定（每次重繪都一致）。 */
  function drawTreeCluster(ctx, tile, ix, iy, iw) {
    const count = 3 + Math.floor(hashTile(tile.x, tile.y, 6) * 2);
    for (let i = 0; i < count; i++) {
      const tx = ix + iw * (0.18 + hashTile(tile.x, tile.y, 10 + i) * 0.64);
      const ty = iy + iw * (0.25 + hashTile(tile.x, tile.y, 20 + i) * 0.55);
      const r = iw * (0.11 + hashTile(tile.x, tile.y, 30 + i) * 0.05);
      ctx.fillStyle = '#4a3826';
      ctx.fillRect(tx - 1, ty, 2, r);
      ctx.fillStyle = i % 2 ? '#2f6b3a' : '#3a7a44';
      ctx.beginPath();
      ctx.arc(tx, ty - r * 0.35, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(tx - r * 0.3, ty - r * 0.55, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** 手繪風山峰：主峰＋側峰，灰岩色帶白色雪頂。 */
  function drawMountainPeaks(ctx, tile, ix, iy, iw) {
    const cx = ix + iw / 2;
    ctx.fillStyle = '#7a7266';
    ctx.beginPath();
    ctx.moveTo(ix + iw * 0.08, iy + iw * 0.88);
    ctx.lineTo(cx, iy + iw * 0.16);
    ctx.lineTo(ix + iw * 0.92, iy + iw * 0.88);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#655d51';
    ctx.beginPath();
    ctx.moveTo(ix + iw * 0.45, iy + iw * 0.88);
    ctx.lineTo(ix + iw * 0.72, iy + iw * 0.4);
    ctx.lineTo(ix + iw * 0.95, iy + iw * 0.88);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8e6df';
    ctx.beginPath();
    ctx.moveTo(cx - iw * 0.1, iy + iw * 0.34);
    ctx.lineTo(cx, iy + iw * 0.16);
    ctx.lineTo(cx + iw * 0.1, iy + iw * 0.34);
    ctx.closePath();
    ctx.fill();
  }

  /** 聚落的小屋：兩三間土牆深頂小屋。 */
  function drawHuts(ctx, tile, ix, iy, iw) {
    for (let i = 0; i < 2; i++) {
      const hx = ix + iw * (0.2 + hashTile(tile.x, tile.y, 40 + i) * 0.45);
      const hy = iy + iw * (0.3 + hashTile(tile.x, tile.y, 50 + i) * 0.35);
      const w = iw * 0.22, h = iw * 0.16;
      ctx.fillStyle = '#8a765a';
      ctx.fillRect(hx, hy, w, h);
      ctx.fillStyle = '#5f4632';
      ctx.beginPath();
      ctx.moveTo(hx - 1, hy);
      ctx.lineTo(hx + w / 2, hy - h * 0.7);
      ctx.lineTo(hx + w + 1, hy);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawBush(ctx, bx, by, r) {
    ctx.fillStyle = 'rgba(47,90,54,0.7)';
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /** 勢力旗幟：佔領的土地插上勢力色小旗（旗桿＋三角旗），一眼看出各家領地。 */
  function drawFlag(ctx, sx, sy, size, color) {
    const px = sx + size * 0.7, py = sy + size * 0.1;
    ctx.strokeStyle = '#33261a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py + size * 0.36);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + size * 0.24, py + size * 0.09);
    ctx.lineTo(px, py + size * 0.19);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  function draw() {
    const saveGame = window.GameSave;
    if (!saveGame || !View.ctx) return;
    const ctx = View.ctx, canvas = View.canvas;
    const now = U.now();
    // 背景鋪土路色：每格內縮繪製後，格與格之間自然露出田埂道路。
    ctx.fillStyle = ROAD_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const startTx = Math.floor(View.camX / View.tilePx), startTy = Math.floor(View.camY / View.tilePx);
    const endTx = Math.ceil((View.camX + canvas.width) / View.tilePx), endTy = Math.ceil((View.camY + canvas.height) / View.tilePx);
    const size = View.tilePx;

    // 連鎖佔領視覺化：算出玩家的領土範圍與目前可出兵的目標格，讓「我的地盤到哪、
    // 我現在能打哪」在地圖上一目了然（每次重繪算一次，成本很低）。
    const human = Object.values(saveGame.players).find((p) => p.isHuman);
    const MapSys = window.Game.Systems.Map;
    const reachKeys = human ? MapSys.territoryReachKeys(saveGame.map, human.factionId) : new Set();
    const attackKeys = human ? MapSys.attackableTargetKeys(saveGame.map, human.factionId) : new Set();
    const humanColor = human ? D.factionDefById(human.factionId).color : '#ffe08a';

    for (let ty = Math.max(0, startTy); ty <= Math.min(D.MAP_CONFIG.height - 1, endTy); ty++) {
      for (let tx = Math.max(0, startTx); tx <= Math.min(D.MAP_CONFIG.width - 1, endTx); tx++) {
        const tile = window.Game.Systems.Map.tileAt(saveGame.map, tx, ty);
        const sx = tx * View.tilePx - View.camX, sy = ty * View.tilePx - View.camY;
        drawTerrain(ctx, tile, sx, sy, size);
        // 領土影響範圍：領土往外 2 格內的格子鋪一層淡淡的勢力色，畫出「你的地盤」。
        if (reachKeys.has(tile.id)) {
          ctx.globalAlpha = 0.1;
          ctx.fillStyle = humanColor;
          ctx.fillRect(sx, sy, size, size);
          ctx.globalAlpha = 1;
        }

        if (tile.type === 'capital') {
          drawCapital(ctx, tile, sx, sy, size);
        } else if (tile.type === 'city') {
          drawCity(ctx, tile, sx, sy, size);
        } else if (tile.type === 'resource' && !tile.isLand) {
          drawResource(ctx, tile, sx, sy, size);
        } else if (tile.type === 'monster') {
          ctx.fillStyle = 'rgba(138,43,43,0.35)';
          ctx.fillRect(sx + 2, sy + 2, size - 4, size - 4);
          drawGlyph(ctx, '⚔', sx, sy, 0.42, '#ffd9d9');
        }

        // 勢力旗幟：任何被佔領的土地（含一般土地格）插上該勢力顏色的小旗。
        if (tile.ownerFactionId && (tile.type === 'city' || tile.type === 'resource')) {
          drawFlag(ctx, sx, sy, size, D.factionDefById(tile.ownerFactionId).color);
        }

        // 可出兵目標：與領土相鄰、現在就能派兵攻打的據點／城池，用一圈黃色虛線框標出，
        // 讓玩家清楚看到「連鎖佔領」的下一步能往哪打。
        if (attackKeys.has(tile.id)) {
          ctx.strokeStyle = 'rgba(255,224,138,0.9)';
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = 2;
          ctx.strokeRect(sx + 2.5, sy + 2.5, size - 5, size - 5);
          ctx.setLineDash([]);
        }

        // 只有這格「當下」正有戰鬥在進行時才會顯示這個交戰標記，平時完全看不到，
        // 點進來才會出現觀戰按鈕（見 renderInfoPanel）。
        if (window.Game.Systems.Combat.activeBattleAt(saveGame, tile.id, now)) {
          drawBattleBadge(ctx, sx, sy, size, now);
        }

        if (View.selectedTile && View.selectedTile.x === tx && View.selectedTile.y === ty) {
          ctx.strokeStyle = '#ffe08a';
          ctx.lineWidth = 3;
          ctx.strokeRect(sx + 1, sy + 1, size - 3, size - 3);
        }
      }
    }

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
      drawGlyph(ctx, tile.terrain === 'pass' ? '⛩️' : '🏰', sx, sy, 0.4, '#fff');
    } else {
      ctx.strokeStyle = '#8a8070';
      ctx.setLineDash([3, 2]);
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 3, sy + 3, size - 7, size - 7);
      ctx.setLineDash([]);
      drawGlyph(ctx, tile.terrain === 'pass' ? '⛩️' : '🚩', sx, sy, 0.38, '#d8d0b8');
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

  /** 交戰標記：兩把交叉的劍，疊在原本的地塊圖案上，讓玩家一眼看出「這裡當下正在打仗」。 */
  function drawBattleBadge(ctx, sx, sy, size, now) {
    const pulse = 0.55 + 0.25 * Math.sin(now / 260);
    ctx.fillStyle = 'rgba(200,20,20,' + (0.3 * pulse).toFixed(3) + ')';
    ctx.fillRect(sx + 1, sy + 1, size - 2, size - 2);
    ctx.strokeStyle = 'rgba(255,80,80,' + pulse.toFixed(3) + ')';
    ctx.lineWidth = 3;
    ctx.strokeRect(sx + 2, sy + 2, size - 4, size - 4);
    drawGlyph(ctx, '⚔️', sx, sy, 0.56, '#fff5f5');
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

    // 地形標示：非平原地形顯示守方防禦加成與行軍耗時影響。
    if (tile.terrain && tile.terrain !== 'plain') {
      const tdef = D.terrainDefOf(tile);
      panel.appendChild(U.el('div', 'subHint', (tile.terrain === 'pass' ? '⛩ ' : '') + '地形：' + tdef.name +
        '（守方防禦 +' + tdef.defBonusPct + '%、行軍耗時 ×' + tdef.marchMul + '）'));
    }

    // 地圖上的戰鬥平時完全看不到動畫，只有這格「當下」正有戰鬥在進行（地圖上會顯示交戰標記）
    // 時，點進來才會出現觀戰按鈕；戰鬥一結算完，這個按鈕就會跟著消失。
    const activeBattle = window.Game.Systems.Combat.activeBattleAt(saveGame, tile.id, U.now());
    if (activeBattle) {
      const spectateRow = U.el('div', 'exploreTargetRow');
      spectateRow.appendChild(U.el('span', '', '⚔ 此處正在交戰中！'));
      const spectateBtn = U.el('button', 'smallBtn', '觀戰');
      U.onTap(spectateBtn, () => {
        const attackerState = saveGame.players[activeBattle.attackerFactionId];
        if (!attackerState) return;
        window.Game.UI.BattleScreen.play(attackerState, activeBattle, () => renderInfoPanel(saveGame, playerState));
      });
      spectateRow.appendChild(spectateBtn);
      panel.appendChild(spectateRow);
    }

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
      panel.appendChild(U.el('div', 'subHint', 'Lv.' + (tile.level || 1) + '　每分鐘產量：' + D.RESOURCE_ICONS[tile.resourceType] + tile.yieldPerMin + ' ' + D.RESOURCE_NAMES[tile.resourceType]));
      if (tile.ownerFactionId) {
        if (tile.ownerFactionId === playerState.factionId) {
          panel.appendChild(U.el('div', 'subHint', '已由你佔領，持續產出中，不需再駐守。'));
          const Map = window.Game.Systems.Map;
          if ((tile.level || 1) >= Map.TILE_LEVEL_MAX) {
            panel.appendChild(U.el('div', 'subHint', '已達最高等級。'));
          } else {
            const cost = Map.resourceTileUpgradeCost(tile);
            const upgradeRow = U.el('div', 'exploreTargetRow');
            upgradeRow.appendChild(U.el('span', '', '升級花費：' + D.RESOURCE_ICONS.wood + cost.wood + ' ' + D.RESOURCE_ICONS.stone + cost.stone));
            const upgradeBtn = U.el('button', 'smallBtn', '升級');
            U.onTap(upgradeBtn, () => {
              const r = Map.upgradeResourceTile(playerState, tile);
              if (r.ok) { Dlg.toast('已升級至 Lv.' + tile.level); renderInfoPanel(saveGame, playerState); } else Dlg.toast(r.reason);
            });
            upgradeRow.appendChild(upgradeBtn);
            panel.appendChild(upgradeRow);
          }
        } else {
          panel.appendChild(U.el('div', 'subHint', '已被 ' + D.factionDefById(tile.ownerFactionId).name + ' 佔領。'));
        }
        return;
      }
      panel.appendChild(U.el('div', 'subHint', '尚未有勢力佔領，守備力：約 ' + tile.guardPower + '。擊破守軍即可永久佔領，之後不需再駐守。'));
    } else if (tile.type === 'monster') {
      const onCooldown = tile.cooldownUntil > U.now();
      panel.appendChild(U.el('div', 'subHint', onCooldown ? ('據點恢復中：' + U.formatCountdown(tile.cooldownUntil - U.now())) : ('守備力：約 ' + tile.guardPower)));
    }

    // 連鎖佔領：出兵前先檢查此地是否與玩家領土相鄰，不相鄰就不給出兵按鈕，改顯示提示。
    const reachable = window.Game.Systems.Map.canAttackTile(saveGame.map, playerState.factionId, tile);
    if (!reachable.ok) {
      panel.appendChild(U.el('div', 'emptyHint', reachable.reason));
      return;
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
      // sendArmyToTile 一定會擋下沒有主將、或兵力超出主將統率上限的部隊；這裡先在按鈕
      // 出現前就檢查同一組條件並改顯示原因，避免玩家看到按鈕、點下去卻必定失敗。
      const Hero = window.Game.Systems.Hero;
      if (!army.heroStateId) {
        row.appendChild(U.el('span', 'lockedHint', '尚未指派主將，無法出征'));
      } else if (window.Game.Systems.Army.leadershipUsed(army) > Hero.armyLeadershipCap(playerState, army)) {
        row.appendChild(U.el('span', 'lockedHint', '兵力超出主將統率上限，無法出征'));
      } else {
        const btn = U.el('button', 'smallBtn', purpose === 'attack' ? '出征' : '派遣');
        U.onTap(btn, () => {
          const r = window.Game.Systems.Army.sendArmyToTile(saveGame, playerState, army.id, { x: tile.x, y: tile.y }, purpose, U.now());
          if (r.ok) {
            Dlg.toast(army.name + ' 已出發，預計 ' + U.formatDurationWords(r.etaMs) + ' 後抵達');
            window.Game.UI.Bootstrap.refreshArmyScreenIfActive();
            renderInfoPanel(saveGame, playerState);
          } else Dlg.toast(r.reason);
        });
        row.appendChild(btn);
      }
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
