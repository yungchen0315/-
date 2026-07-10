/* ============================================================================
 * unitDefs.js — 兵種靜態資料。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} UnitDef
   * @property {string} id
   * @property {string} name
   * @property {string} icon
   * @property {number} tier 1~3，對應訓練建築等級解鎖門檻。
   * @property {'infantry'|'cavalry'|'ranged'|'siege'} role
   * @property {{atk:number, def:number, hp:number, speed:number}} stats
   * @property {number} upkeep 每單位每小時消耗糧食（保留給未來的維持費系統使用）。
   * @property {number} leadership 每單位佔用的統率需求，用於武將帶兵上限計算。
   * @property {Object<string,number>} cost 訓練單一個體所需資源。
   * @property {number} trainTimeMs 訓練單一個體所需時間。
   * @property {string} trainedBy 可訓練此兵種的建築 id。
   * @property {string[]} [counters] 此兵種相剋的目標兵種角色（保留給未來的兵種剋制系統）。
   * @property {number} [siegeBonusPct] 攻城時的額外傷害加成（攻城兵種才有）。
   */

  /** @type {Object<string,UnitDef>} */
  const UNIT_DEFS = {
    infantry: { id: 'infantry', name: '步兵', icon: '🛡️', tier: 1, role: 'infantry',
      stats: { atk: 8, def: 10, hp: 60, speed: 4 }, upkeep: 1, leadership: 1,
      cost: { food: 30, wood: 15 }, trainTimeMs: 40000, trainedBy: 'barracks' },
    spearman: { id: 'spearman', name: '槍兵', icon: '🔱', tier: 2, role: 'infantry',
      stats: { atk: 12, def: 8, hp: 55, speed: 4 }, upkeep: 1, leadership: 1,
      cost: { food: 35, wood: 25 }, trainTimeMs: 55000, trainedBy: 'barracks',
      counters: ['cavalry'] },
    crossbowman: { id: 'crossbowman', name: '弩兵', icon: '🏹', tier: 3, role: 'ranged',
      stats: { atk: 16, def: 4, hp: 40, speed: 4 }, upkeep: 2, leadership: 2,
      cost: { food: 30, wood: 40, gold: 10 }, trainTimeMs: 70000, trainedBy: 'barracks',
      counters: ['infantry'] },
    cavalry: { id: 'cavalry', name: '騎兵', icon: '🐎', tier: 1, role: 'cavalry',
      stats: { atk: 14, def: 8, hp: 70, speed: 9 }, upkeep: 2, leadership: 2,
      cost: { food: 40, gold: 20 }, trainTimeMs: 60000, trainedBy: 'drillground',
      counters: ['ranged'] },
    horsearcher: { id: 'horsearcher', name: '弓騎兵', icon: '🏇', tier: 3, role: 'cavalry',
      stats: { atk: 18, def: 5, hp: 55, speed: 10 }, upkeep: 3, leadership: 2,
      cost: { food: 45, gold: 35 }, trainTimeMs: 85000, trainedBy: 'drillground',
      counters: ['infantry'] },
    siege: { id: 'siege', name: '攻城車', icon: '🪤', tier: 2, role: 'siege',
      stats: { atk: 30, def: 3, hp: 90, speed: 2 }, upkeep: 4, leadership: 3,
      cost: { wood: 100, stone: 60, gold: 30 }, trainTimeMs: 150000, trainedBy: 'workshop',
      siegeBonusPct: 60 }
  };

  const UNIT_IDS = Object.keys(UNIT_DEFS);

  function unitDefById(type) { return UNIT_DEFS[type]; }
  function unitDefsTrainedBy(buildingType) { return UNIT_IDS.filter((u) => UNIT_DEFS[u].trainedBy === buildingType); }

  window.Game.Data.UNIT_DEFS = UNIT_DEFS;
  window.Game.Data.UNIT_IDS = UNIT_IDS;
  window.Game.Data.unitDefById = unitDefById;
  window.Game.Data.unitDefsTrainedBy = unitDefsTrainedBy;
})();
