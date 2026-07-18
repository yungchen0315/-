/* ============================================================================
 * saveSystem.js — localStorage 讀寫＋版本遷移。存檔就是一個可直接
 * JSON.stringify/parse 的 SaveGame 物件（src/models/SaveGame.js）。
 * ==========================================================================*/
(function () {
  const SAVE_KEY = 'deeplight_save_v1';

  /** 補齊舊存檔／手動編輯遺漏的欄位，避免之後讀到 undefined 就拋例外。 */
  function migrate(saveGame) {
    const def = window.App.Models.createDefaultSave(Date.now());
    Object.keys(def).forEach((k) => { if (saveGame[k] === undefined) saveGame[k] = def[k]; });
    if (!saveGame.modules) saveGame.modules = {};
    if (!saveGame.bestiary) saveGame.bestiary = {};
    if (!Array.isArray(saveGame.research)) saveGame.research = [];
    if (!Array.isArray(saveGame.refits)) saveGame.refits = [];
    if (!Array.isArray(saveGame.achievements)) saveGame.achievements = [];
    if (!saveGame.stats) saveGame.stats = def.stats;
    if (!saveGame.settings) saveGame.settings = def.settings;
    saveGame.version = 1;
    return saveGame;
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return migrate(JSON.parse(raw));
    } catch (e) {
      return null;
    }
  }

  function save(saveGame) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveGame));
      return true;
    } catch (e) {
      return false;
    }
  }

  function reset() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }

  window.App.Systems.Save = { load, save, reset, SAVE_KEY };
})();
