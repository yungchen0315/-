/* ============================================================================
 * buildingDefs.js — 建築靜態資料：每種建築 10 個等級，cost/time/effect 依等級遞增。
 * BuildingState（見 src/models/BuildingState.js）只記錄「目前是幾級、有沒有在升級」，
 * 升級需要多少資源、多久時間、效果多少，一律查這裡的表，不重複存進存檔。
 * ==========================================================================*/

(function () {
  const MAX_BUILDING_LEVEL = 10;

  // base * growth^(level-1)，四捨五入到最接近的 step。
  function scale(base, growth, level, step) {
    const s = step || 1;
    const v = base * Math.pow(growth, level - 1);
    return Math.max(s, Math.round(v / s) * s);
  }

  function buildLevels(count, fn) {
    const levels = [];
    for (let lv = 1; lv <= count; lv++) levels.push(fn(lv));
    return levels;
  }

  /**
   * @typedef {Object} BuildingLevelDef
   * @property {number} level
   * @property {Object<string,number>} cost 升級到此等級所需資源。
   * @property {number} timeMs 升級耗時（毫秒）。
   * @property {Object<string,number|boolean>} effect 此等級提供的效果（欄位依建築種類而不同）。
   */

  /**
   * @typedef {Object} BuildingDef
   * @property {string} id
   * @property {string} name
   * @property {string} icon
   * @property {'core'|'economy'|'military'|'general'|'tech'|'defense'} category
   * @property {string} desc
   * @property {boolean} [unique] 是否為城池唯一建築（例如主城）。
   * @property {string[]} [trains] 此建築可訓練的兵種 id 列表（軍事類建築才有）。
   * @property {BuildingLevelDef[]} levels 索引 0 對應 1 級。
   */

  /** @type {Object<string,BuildingDef>} */
  const BUILDING_DEFS = {
    capital: {
      id: 'capital', name: '主城', icon: '🏯', category: 'core',
      desc: '勢力根基所在，等級決定整體城池規模與其他建築等級上限。',
      unique: true,
      levels: buildLevels(MAX_BUILDING_LEVEL, (lv) => ({
        level: lv,
        cost: { wood: scale(200, 1.55, lv, 10), stone: scale(200, 1.55, lv, 10), gold: scale(100, 1.6, lv, 10) },
        timeMs: scale(5 * 60000, 1.4, lv),
        effect: { maxOtherBuildingLevel: lv, popCap: scale(20, 1.25, lv, 1) }
      }))
    },
    // 糧倉／伐木場／採石場／金礦（單一資源每小時產出）已移除：一般資源產出改由
    // 地圖上實際佔領的產地／土地格提供（見 mapSystem／economySystem.tick），城池
    // 分頁不再重複一套「建築生產」機制。原本這四棟建築同時兼職提升四種資源的
    // 存量上限，這部分功能整併進倉庫——升級倉庫即可一次提升全部資源的存量上限。
    warehouse: {
      id: 'warehouse', name: '倉庫', icon: '📦', category: 'economy',
      desc: '提升四種資源的存量上限，避免產出溢出浪費。',
      levels: buildLevels(MAX_BUILDING_LEVEL, (lv) => ({
        level: lv,
        cost: { wood: scale(120, 1.5, lv, 10), stone: scale(120, 1.5, lv, 10) },
        timeMs: scale(90000, 1.35, lv),
        effect: { storageCapAll: scale(1000, 1.42, lv, 50) }
      }))
    },
    barracks: {
      id: 'barracks', name: '兵營', icon: '⚔️', category: 'military',
      desc: '可訓練步兵與槍兵，等級提升訓練速度並解鎖更高階兵種。',
      levels: buildLevels(MAX_BUILDING_LEVEL, (lv) => ({
        level: lv,
        cost: { wood: scale(120, 1.5, lv, 10), stone: scale(60, 1.5, lv, 10) },
        timeMs: scale(150000, 1.35, lv),
        effect: { trainSpeedMul: +(1 + 0.08 * (lv - 1)).toFixed(2), unlockUnitTier: Math.min(3, Math.ceil(lv / 4)) }
      })),
      trains: ['infantry', 'spearman', 'crossbowman']
    },
    drillground: {
      id: 'drillground', name: '校場', icon: '🐎', category: 'military',
      desc: '可訓練騎兵與弓騎兵，等級提升訓練速度並解鎖更高階兵種。',
      levels: buildLevels(MAX_BUILDING_LEVEL, (lv) => ({
        level: lv,
        cost: { wood: scale(150, 1.5, lv, 10), gold: scale(60, 1.5, lv, 10) },
        timeMs: scale(180000, 1.35, lv),
        effect: { trainSpeedMul: +(1 + 0.08 * (lv - 1)).toFixed(2), unlockUnitTier: Math.min(3, Math.ceil(lv / 4)) }
      })),
      trains: ['cavalry', 'horsearcher']
    },
    workshop: {
      id: 'workshop', name: '工坊', icon: '🛠️', category: 'military',
      desc: '可製造攻城器械，用於攻城作戰時大幅削弱敵方城防。',
      levels: buildLevels(MAX_BUILDING_LEVEL, (lv) => ({
        level: lv,
        cost: { wood: scale(200, 1.5, lv, 10), stone: scale(150, 1.5, lv, 10) },
        timeMs: scale(240000, 1.35, lv),
        effect: { trainSpeedMul: +(1 + 0.08 * (lv - 1)).toFixed(2) }
      })),
      trains: ['siege']
    },
    tavern: {
      id: 'tavern', name: '酒館', icon: '🍶', category: 'general',
      desc: '招募武將的地方。建成後即可在「招募」分頁以元寶延攬人才，等級越高招募花費越省。',
      levels: buildLevels(MAX_BUILDING_LEVEL, (lv) => ({
        level: lv,
        cost: { gold: scale(150, 1.5, lv, 10), food: scale(80, 1.5, lv, 10) },
        timeMs: scale(200000, 1.35, lv),
        effect: { gachaDiscountPct: Math.min(20, (lv - 1) * 2) }
      }))
    },
    academy: {
      id: 'academy', name: '學院', icon: '📚', category: 'tech',
      desc: '研究科技，提升經濟、軍事與城池的長期效益。',
      levels: buildLevels(MAX_BUILDING_LEVEL, (lv) => ({
        level: lv,
        cost: { gold: scale(180, 1.5, lv, 10), stone: scale(100, 1.5, lv, 10) },
        timeMs: scale(220000, 1.35, lv),
        effect: { researchSpeedMul: +(1 + 0.08 * (lv - 1)).toFixed(2), unlockTechTier: Math.min(3, Math.ceil(lv / 4)) }
      }))
    },
    wall: {
      id: 'wall', name: '城牆', icon: '🧱', category: 'defense',
      desc: '提升城池防禦力與駐守部隊的戰力加成。',
      levels: buildLevels(MAX_BUILDING_LEVEL, (lv) => ({
        level: lv,
        cost: { stone: scale(200, 1.55, lv, 10), wood: scale(80, 1.55, lv, 10) },
        timeMs: scale(200000, 1.4, lv),
        effect: { defenseBonusPct: scale(10, 1.22, lv, 1), garrisonDefMul: +(1 + 0.05 * (lv - 1)).toFixed(2) }
      }))
    }
  };

  /** 城池建築的預設建造順序，UI 依此順序排列。 */
  const BUILDING_ORDER = ['capital', 'warehouse', 'barracks', 'drillground', 'workshop', 'tavern', 'academy', 'wall'];

  function buildingDefById(type) { return BUILDING_DEFS[type]; }
  function buildingLevelDef(type, level) {
    const def = BUILDING_DEFS[type];
    if (!def) return null;
    return def.levels[window.Game.Utils.clamp(level, 1, def.levels.length) - 1];
  }

  window.Game.Data.MAX_BUILDING_LEVEL = MAX_BUILDING_LEVEL;
  window.Game.Data.BUILDING_DEFS = BUILDING_DEFS;
  window.Game.Data.BUILDING_ORDER = BUILDING_ORDER;
  window.Game.Data.buildingDefById = buildingDefById;
  window.Game.Data.buildingLevelDef = buildingLevelDef;
})();
