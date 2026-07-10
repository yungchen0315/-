/* ============================================================================
 * technologyDefs.js — 科技樹靜態資料。動態的研究進度屬於 TechnologyState
 * （src/models/TechnologyState.js），不存在這裡。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} TechnologyDef
   * @property {string} id
   * @property {string} name
   * @property {'economy'|'military'|'city'} category
   * @property {number} tier 1~3，對應學院等級解鎖門檻。
   * @property {number} timeMs 研究耗時。
   * @property {Object<string,number>} cost
   * @property {Object<string,number>} effect 效果欄位依科技類別而不同（例如 foodPerHourPct）。
   * @property {string[]} requires 前置科技 id 列表。
   */

  /** @type {TechnologyDef[]} */
  const TECHNOLOGY_DEFS = [
    { id: 'farming1', name: '農耕術·一', category: 'economy', tier: 1, timeMs: 3 * 60000,
      cost: { food: 200, wood: 100 }, effect: { foodPerHourPct: 10 }, requires: [] },
    { id: 'farming2', name: '農耕術·二', category: 'economy', tier: 2, timeMs: 8 * 60000,
      cost: { food: 500, wood: 200, gold: 100 }, effect: { foodPerHourPct: 15 }, requires: ['farming1'] },
    { id: 'forestry1', name: '伐木術·一', category: 'economy', tier: 1, timeMs: 3 * 60000,
      cost: { food: 100, wood: 200 }, effect: { woodPerHourPct: 10 }, requires: [] },
    { id: 'forestry2', name: '伐木術·二', category: 'economy', tier: 2, timeMs: 8 * 60000,
      cost: { food: 200, wood: 500, gold: 100 }, effect: { woodPerHourPct: 15 }, requires: ['forestry1'] },
    { id: 'mining1', name: '採礦術·一', category: 'economy', tier: 1, timeMs: 4 * 60000,
      cost: { wood: 150, stone: 150 }, effect: { stonePerHourPct: 10, goldPerHourPct: 5 }, requires: [] },
    { id: 'commerce1', name: '通商術·一', category: 'economy', tier: 2, timeMs: 6 * 60000,
      cost: { stone: 200, gold: 200 }, effect: { goldPerHourPct: 15 }, requires: ['mining1'] },
    { id: 'storage1', name: '倉儲術·一', category: 'economy', tier: 1, timeMs: 5 * 60000,
      cost: { wood: 200, stone: 200 }, effect: { storageCapAllPct: 15 }, requires: [] },

    { id: 'blades1', name: '鍛刃術·一', category: 'military', tier: 1, timeMs: 5 * 60000,
      cost: { wood: 150, gold: 100 }, effect: { infantryAtkPct: 8 }, requires: [] },
    { id: 'blades2', name: '鍛刃術·二', category: 'military', tier: 2, timeMs: 10 * 60000,
      cost: { wood: 300, gold: 250 }, effect: { infantryAtkPct: 10 }, requires: ['blades1'] },
    { id: 'horsemanship1', name: '騎術·一', category: 'military', tier: 1, timeMs: 5 * 60000,
      cost: { food: 150, gold: 100 }, effect: { cavalryAtkPct: 8 }, requires: [] },
    { id: 'archery1', name: '弓術·一', category: 'military', tier: 1, timeMs: 5 * 60000,
      cost: { wood: 150, gold: 100 }, effect: { rangedAtkPct: 8 }, requires: [] },
    { id: 'siegecraft1', name: '器械術·一', category: 'military', tier: 2, timeMs: 12 * 60000,
      cost: { wood: 400, stone: 300 }, effect: { siegeAtkPct: 15 }, requires: ['blades1'] },
    { id: 'training1', name: '練兵術·一', category: 'military', tier: 1, timeMs: 6 * 60000,
      cost: { food: 200, gold: 150 }, effect: { trainSpeedPct: 10 }, requires: [] },
    { id: 'armor1', name: '護甲術·一', category: 'military', tier: 1, timeMs: 6 * 60000,
      cost: { stone: 200, gold: 100 }, effect: { allDefPct: 8 }, requires: [] },

    { id: 'masonry1', name: '築城術·一', category: 'city', tier: 1, timeMs: 6 * 60000,
      cost: { stone: 250, wood: 100 }, effect: { wallDefPct: 10 }, requires: [] },
    { id: 'masonry2', name: '築城術·二', category: 'city', tier: 3, timeMs: 15 * 60000,
      cost: { stone: 600, gold: 300 }, effect: { wallDefPct: 15 }, requires: ['masonry1'] },
    { id: 'scouting1', name: '探查術·一', category: 'city', tier: 1, timeMs: 4 * 60000,
      cost: { food: 100, gold: 100 }, effect: { exploreSpeedPct: 15 }, requires: [] }
  ];

  function technologyDefById(id) { return TECHNOLOGY_DEFS.find((t) => t.id === id); }

  window.Game.Data.TECHNOLOGY_DEFS = TECHNOLOGY_DEFS;
  window.Game.Data.technologyDefById = technologyDefById;
})();
