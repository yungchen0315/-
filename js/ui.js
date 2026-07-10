/* ============================================================================
 * ui.js — 頂部狀態列、底部分頁導覽、畫面切換調度。
 * ==========================================================================*/

const SCREENS = ['city', 'map', 'generals', 'army', 'campaign', 'report'];
const SCREEN_LABELS = { city: '城池', map: '地圖', generals: '武將', army: '軍隊', campaign: '戰役', report: '戰報' };

function switchScreen(name) {
  const state = window.GameState;
  if (!state || SCREENS.indexOf(name) < 0) return;
  state.activeScreen = name;
  SCREENS.forEach((s) => {
    const node = document.getElementById('screen' + capitalize(s));
    if (node) node.classList.toggle('activeScreen', s === name);
  });
  document.querySelectorAll('#bottomNav .navBtn').forEach((btn) => {
    btn.classList.toggle('navActive', btn.dataset.screen === name);
  });
  renderCurrentScreen();
  if (name === 'map') {
    resizeMapCanvas();
    if (!MapView.selectedTile) centerMapOnFaction(state, 'shu');
    drawMap();
    renderMapInfoPanel();
  }
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function renderCurrentScreen() {
  const state = window.GameState;
  if (!state) return;
  const player = state.factions.shu;
  const name = state.activeScreen;
  if (name === 'city') renderCityScreen(document.getElementById('screenCity'), player);
  else if (name === 'generals') renderGeneralsScreen(document.getElementById('screenGenerals'), player);
  else if (name === 'army') renderArmyScreen(document.getElementById('screenArmy'), player);
  else if (name === 'campaign') renderCampaignScreen(document.getElementById('screenCampaign'), state, player);
  else if (name === 'report') renderReportScreen(document.getElementById('screenReport'), player);
  else if (name === 'map') drawMap();
}

function refreshTopBar() {
  const state = window.GameState;
  if (!state) return;
  const player = state.factions.shu;
  const eff = factionEffects(player);
  RESOURCE_TYPES.forEach((r) => {
    const node = document.getElementById('topRes_' + r);
    if (node) node.textContent = RESOURCE_ICONS[r] + formatNumber(player.resources[r]) + '/' + formatNumber(eff.storageCap[r]);
  });
  const powerNode = document.getElementById('topPower');
  if (powerNode) powerNode.textContent = '國力 ' + formatNumber(factionPower(player));
}

function initBottomNav() {
  document.querySelectorAll('#bottomNav .navBtn').forEach((btn) => {
    onTap(btn, () => switchScreen(btn.dataset.screen));
  });
}

window.__pushToast = function (text) { toast(text); };
