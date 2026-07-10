/* ============================================================================
 * save.js — localStorage 存讀檔。所有計時皆為絕對時間戳，
 * 離線進度追趕只需在載入後呼叫一次 advanceTime(state, Date.now())。
 * ==========================================================================*/

const SAVE_KEY = 'huangzhe_tianxia_save_v1';

function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}

function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error('saveGame failed', e);
    return false;
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (!state || state.version !== SAVE_VERSION) return null;
    return state;
  } catch (e) {
    console.error('loadGame failed', e);
    return null;
  }
}

function deleteSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}
