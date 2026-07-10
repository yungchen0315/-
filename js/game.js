/* ============================================================================
 * game.js — 主流程：載入/新遊戲、主迴圈（每秒推進一次）、自動存檔。
 * ==========================================================================*/

window.GameState = null;
let __tickHandle = null;
let __saveHandle = null;

function bootGame() {
  const saved = hasSave();
  const overlay = document.getElementById('setupOverlay');
  if (saved) {
    document.getElementById('continueBtn').style.display = '';
  } else {
    document.getElementById('continueBtn').style.display = 'none';
  }
  overlay.classList.add('activeOverlay');

  onTap(document.getElementById('continueBtn'), () => { overlay.classList.remove('activeOverlay'); startWithSave(); });
  onTap(document.getElementById('newGameBtn'), async () => {
    if (saved) {
      const confirmed = await showConfirm('已有存檔，開始新遊戲將會覆蓋現有進度，確定要繼續嗎？');
      if (!confirmed) return;
    }
    overlay.classList.remove('activeOverlay');
    deleteSave();
    startFresh();
  });
}

function startWithSave() {
  const state = loadGame();
  window.GameState = state || createNewGame();
  const now = nowMs();
  advanceTime(window.GameState, now);
  afterGameReady();
}

function startFresh() {
  window.GameState = createNewGame();
  afterGameReady();
}

function afterGameReady() {
  initBottomNav();
  initMapView(document.getElementById('mapCanvas'));
  window.addEventListener('resize', () => { if (window.GameState.activeScreen === 'map') { resizeMapCanvas(); drawMap(); } });
  switchScreen(window.GameState.activeScreen || 'city');
  refreshTopBar();
  startMainLoop();
  saveGame(window.GameState);
}

function startMainLoop() {
  if (__tickHandle) clearInterval(__tickHandle);
  if (__saveHandle) clearInterval(__saveHandle);
  __tickHandle = setInterval(gameTick, 1000);
  __saveHandle = setInterval(() => saveGame(window.GameState), 20000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(window.GameState); });
  window.addEventListener('beforeunload', () => saveGame(window.GameState));
}

function gameTick() {
  const state = window.GameState;
  if (!state) return;
  advanceTime(state, nowMs());
  refreshTopBar();
  const screen = state.activeScreen;
  if (screen === 'city' || screen === 'army' || screen === 'generals' || screen === 'map') {
    renderCurrentScreen();
    if (screen === 'map') renderMapInfoPanel();
  }
}

document.addEventListener('DOMContentLoaded', bootGame);
