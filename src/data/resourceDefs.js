/* ============================================================================
 * resourceDefs.js — 資源種類靜態資料。
 * ==========================================================================*/

(function () {
  /** @type {string[]} */
  const RESOURCE_TYPES = ['food', 'wood', 'stone', 'gold'];

  /** @type {Object<string,string>} */
  const RESOURCE_NAMES = { food: '糧食', wood: '木材', stone: '石料', gold: '銀兩' };

  /** @type {Object<string,string>} */
  const RESOURCE_ICONS = { food: '🌾', wood: '🪵', stone: '🪨', gold: '💰' };

  window.Game.Data.RESOURCE_TYPES = RESOURCE_TYPES;
  window.Game.Data.RESOURCE_NAMES = RESOURCE_NAMES;
  window.Game.Data.RESOURCE_ICONS = RESOURCE_ICONS;
})();
