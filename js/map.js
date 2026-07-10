/* ============================================================================
 * map.js — 世界地圖：觸控（單指拖曳平移／單指輕點選取）、勢力主城、資源點、野怪營地。
 * ==========================================================================*/

const MapView = {
  canvas: null,
  ctx: null,
  camX: 0,
  camY: 0,
  tilePx: 40,
  selectedTile: null,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragStartCamX: 0,
  dragStartCamY: 0,
  moved: false,
  touchStartAt: 0
};

function initMapView(canvas) {
  MapView.canvas = canvas;
  MapView.ctx = canvas.getContext('2d');
  resizeMapCanvas();

  canvas.addEventListener('touchstart', onMapTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onMapTouchMove, { passive: false });
  window.addEventListener('touchend', onMapTouchEnd, { passive: false });
  canvas.addEventListener('click', onMapClickFallback);
}

function resizeMapCanvas() {
  const canvas = MapView.canvas;
  if (!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = Math.floor(rect.width);
  canvas.height = Math.floor(rect.height);
}

function mapEventPos(e) {
  const rect = MapView.canvas.getBoundingClientRect();
  const t = e.touches && e.touches.length ? e.touches[0] : (e.changedTouches && e.changedTouches.length ? e.changedTouches[0] : e);
  return { x: t.clientX - rect.left, y: t.clientY - rect.top };
}

function onMapTouchStart(e) {
  if (e.touches.length !== 1) return;
  e.preventDefault();
  const p = mapEventPos(e);
  MapView.dragging = true;
  MapView.moved = false;
  MapView.dragStartX = p.x;
  MapView.dragStartY = p.y;
  MapView.dragStartCamX = MapView.camX;
  MapView.dragStartCamY = MapView.camY;
  MapView.touchStartAt = Date.now();
}

function onMapTouchMove(e) {
  if (!MapView.dragging) return;
  e.preventDefault();
  const p = mapEventPos(e);
  const dx = p.x - MapView.dragStartX;
  const dy = p.y - MapView.dragStartY;
  if (Math.abs(dx) > 6 || Math.abs(dy) > 6) MapView.moved = true;
  MapView.camX = clampCamX(MapView.dragStartCamX - dx);
  MapView.camY = clampCamY(MapView.dragStartCamY - dy);
  drawMap();
}

function onMapTouchEnd(e) {
  if (!MapView.dragging) return;
  MapView.dragging = false;
  if (!MapView.moved && Date.now() - MapView.touchStartAt < 600) {
    const p = mapEventPos(e);
    handleMapTap(p.x, p.y);
  }
}

let __lastMapClickAt = 0;
function onMapClickFallback(e) {
  if (Date.now() - __lastMapClickAt < 700) return;
  const rect = MapView.canvas.getBoundingClientRect();
  handleMapTap(e.clientX - rect.left, e.clientY - rect.top);
}

function clampCamX(v) {
  const worldPx = MAP_CONFIG.width * MapView.tilePx;
  const max = Math.max(0, worldPx - MapView.canvas.width);
  return clamp(v, 0, max);
}
function clampCamY(v) {
  const worldPx = MAP_CONFIG.height * MapView.tilePx;
  const max = Math.max(0, worldPx - MapView.canvas.height);
  return clamp(v, 0, max);
}

function handleMapTap(px, py) {
  __lastMapClickAt = Date.now();
  const wx = px + MapView.camX;
  const wy = py + MapView.camY;
  const tx = Math.floor(wx / MapView.tilePx);
  const ty = Math.floor(wy / MapView.tilePx);
  if (tx < 0 || ty < 0 || tx >= MAP_CONFIG.width || ty >= MAP_CONFIG.height) return;
  MapView.selectedTile = { x: tx, y: ty };
  renderMapInfoPanel();
  drawMap();
}

function centerMapOnFaction(state, factionId) {
  const cap = capitalTileOf(state.world, factionId);
  if (!cap) return;
  MapView.camX = clampCamX(cap.x * MapView.tilePx - MapView.canvas.width / 2);
  MapView.camY = clampCamY(cap.y * MapView.tilePx - MapView.canvas.height / 2);
}

const TILE_COLORS = {
  empty: '#4a7a4f',
  capital: '#8a5a2b',
  resource: '#3a6bb0',
  monster: '#8a2b2b',
  landmark: '#6b5a8a'
};

function drawMap() {
  const state = window.GameState;
  if (!state || !MapView.ctx) return;
  const ctx = MapView.ctx;
  const canvas = MapView.canvas;
  ctx.fillStyle = '#1b2a1e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const startTx = Math.floor(MapView.camX / MapView.tilePx);
  const startTy = Math.floor(MapView.camY / MapView.tilePx);
  const endTx = Math.ceil((MapView.camX + canvas.width) / MapView.tilePx);
  const endTy = Math.ceil((MapView.camY + canvas.height) / MapView.tilePx);

  for (let ty = Math.max(0, startTy); ty <= Math.min(MAP_CONFIG.height - 1, endTy); ty++) {
    for (let tx = Math.max(0, startTx); tx <= Math.min(MAP_CONFIG.width - 1, endTx); tx++) {
      const tile = tileAt(state.world, tx, ty);
      const sx = tx * MapView.tilePx - MapView.camX;
      const sy = ty * MapView.tilePx - MapView.camY;
      ctx.fillStyle = TILE_COLORS[tile.type] || TILE_COLORS.empty;
      ctx.fillRect(sx, sy, MapView.tilePx - 1, MapView.tilePx - 1);

      if (tile.type === 'capital') {
        ctx.fillStyle = factionById(tile.ownerId).color;
        ctx.beginPath();
        ctx.arc(sx + MapView.tilePx / 2, sy + MapView.tilePx / 2, MapView.tilePx * 0.32, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile.type === 'resource') {
        if (tile.cooldownUntil > nowMs()) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(sx, sy, MapView.tilePx - 1, MapView.tilePx - 1); }
        ctx.fillStyle = '#fff';
        ctx.font = (MapView.tilePx * 0.4) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(RESOURCE_ICONS[tile.resourceType], sx + MapView.tilePx / 2, sy + MapView.tilePx / 2);
      } else if (tile.type === 'monster') {
        if (tile.cooldownUntil > nowMs()) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(sx, sy, MapView.tilePx - 1, MapView.tilePx - 1); }
        ctx.fillStyle = '#fff';
        ctx.font = (MapView.tilePx * 0.45) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚔', sx + MapView.tilePx / 2, sy + MapView.tilePx / 2);
      } else if (tile.type === 'landmark') {
        ctx.fillStyle = '#fff';
        ctx.font = (MapView.tilePx * 0.4) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📍', sx + MapView.tilePx / 2, sy + MapView.tilePx / 2);
      }

      if (MapView.selectedTile && MapView.selectedTile.x === tx && MapView.selectedTile.y === ty) {
        ctx.strokeStyle = '#ffe08a';
        ctx.lineWidth = 3;
        ctx.strokeRect(sx + 1, sy + 1, MapView.tilePx - 3, MapView.tilePx - 3);
      }
    }
  }

  // 行軍中的部隊以移動中的小點呈現（依起訖時間內插位置）
  const now = nowMs();
  Object.values(state.factions).forEach((f) => {
    f.armies.forEach((army) => {
      if (army.status !== 'marching' && army.status !== 'returning') return;
      const originTile = army.originTileId ? state.world.tiles[army.originTileId] : null;
      const targetTile = army.targetTileId ? state.world.tiles[army.targetTileId] : null;
      if (!originTile || !targetTile) return;
      const t = clamp((now - army.departAt) / Math.max(1, army.arriveAt - army.departAt), 0, 1);
      const fromX = army.status === 'marching' ? originTile.x : targetTile.x;
      const fromY = army.status === 'marching' ? originTile.y : targetTile.y;
      const toX = army.status === 'marching' ? targetTile.x : originTile.x;
      const toY = army.status === 'marching' ? targetTile.y : originTile.y;
      const wx = lerp(fromX, toX, t) * MapView.tilePx + MapView.tilePx / 2 - MapView.camX;
      const wy = lerp(fromY, toY, t) * MapView.tilePx + MapView.tilePx / 2 - MapView.camY;
      ctx.fillStyle = f.isPlayer ? '#ffe08a' : '#ff6b6b';
      ctx.beginPath();
      ctx.arc(wx, wy, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

function renderMapInfoPanel() {
  const panel = document.getElementById('mapInfoPanel');
  const state = window.GameState;
  if (!panel || !state) return;
  clearNode(panel);
  const sel = MapView.selectedTile;
  if (!sel) { panel.appendChild(el('div', 'emptyHint', '點選地圖上的目標查看詳情')); return; }
  const tile = tileAt(state.world, sel.x, sel.y);
  if (!tile || tile.type === 'empty') { panel.appendChild(el('div', 'emptyHint', '此處為空地')); return; }

  const player = state.factions.shu;
  panel.appendChild(el('div', 'panelTitle', tile.name || '未知地點'));

  if (tile.type === 'capital') {
    panel.appendChild(el('div', 'subHint', factionById(tile.ownerId).desc));
    if (tile.ownerId === 'shu') { panel.appendChild(el('div', 'subHint', '這是你的主城。')); return; }
  } else if (tile.type === 'resource' || tile.type === 'monster') {
    const onCooldown = tile.cooldownUntil > nowMs();
    panel.appendChild(el('div', 'subHint', onCooldown
      ? ('據點恢復中：' + formatDuration(tile.cooldownUntil - nowMs()))
      : ('守備力：約 ' + tile.guardPower)));
  } else if (tile.type === 'landmark') {
    panel.appendChild(el('div', 'subHint', '此處與武將「地圖探索」劇情相關，請於武將分頁的酒館探索取得對應人物。'));
    return;
  }

  const garrisonArmies = player.armies.filter((a) => a.status === 'garrison' && armyUnitCount(a) > 0);
  if (garrisonArmies.length === 0) {
    panel.appendChild(el('div', 'emptyHint', '目前沒有可派遣的駐守部隊。'));
    return;
  }
  const purpose = tile.type === 'capital' ? 'attack' : 'raid';
  garrisonArmies.forEach((army) => {
    const row = el('div', 'exploreTargetRow');
    row.appendChild(el('span', '', army.name + '（' + armyUnitCount(army) + ' 兵）'));
    const btn = el('button', 'smallBtn', purpose === 'attack' ? '出征' : '派遣');
    onTap(btn, () => {
      const r = sendArmyToTile(state, player, army.id, { x: tile.x, y: tile.y }, purpose);
      if (r.ok) { toast(army.name + ' 已出發，預計 ' + formatDurationShort(r.etaMs) + ' 後抵達'); renderArmyScreenIfActive(); renderMapInfoPanel(); }
      else toast(r.reason);
    });
    row.appendChild(btn);
    panel.appendChild(row);
  });
}

function setActiveArmyForMarch(faction, armyId) {
  MapView.pendingArmyId = armyId;
}

function renderArmyScreenIfActive() {
  const state = window.GameState;
  if (state && state.activeScreen === 'army') renderArmyScreen(document.getElementById('screenArmy'), state.factions.shu);
}
