/* ============================================================================
 * saveSystem.js — localStorage 存讀檔。對應舊版 js/save.js。
 * ==========================================================================*/

(function () {
  const SAVE_KEY = 'huangzhe_tianxia_save_v2_src';

  function hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  }

  /** @param {SaveGame} saveGame */
  function saveToLocalStorage(saveGame) {
    try {
      localStorage.setItem(SAVE_KEY, window.Game.Models.serializeSaveGame(saveGame));
      return true;
    } catch (e) {
      console.error('saveToLocalStorage failed', e);
      return false;
    }
  }

  /** @returns {SaveGame|null} */
  function loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return window.Game.Models.deserializeSaveGame(raw);
    } catch (e) {
      console.error('loadFromLocalStorage failed', e);
      return null;
    }
  }

  function deleteSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }

  window.Game.Systems.Save = { SAVE_KEY, hasSave, saveToLocalStorage, loadFromLocalStorage, deleteSave };
})();
