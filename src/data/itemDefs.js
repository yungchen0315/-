/* ============================================================================
 * itemDefs.js — 武將裝備靜態資料（武器／甲冑／坐騎／寶物）。
 * 皆透過戰役獎勵或擊破野外據點取得，不涉及任何抽卡機率。
 * ==========================================================================*/

(function () {
  /** @type {string[]} */
  const ITEM_SLOTS = ['weapon', 'armor', 'mount', 'accessory'];

  /**
   * @typedef {Object} ItemDef
   * @property {string} id
   * @property {string} name
   * @property {'weapon'|'armor'|'mount'|'accessory'} slot
   * @property {number} tier 1~5，數字越大越稀有。
   * @property {Object<string,number|Object<string,number>>} effect 裝備後套用在武將／部隊上的加成。
   */

  /** @type {ItemDef[]} */
  const ITEM_DEFS = [
    { id: 'sword_iron', name: '鐵劍', slot: 'weapon', tier: 1, effect: { atkPct: 4 } },
    { id: 'sword_bronze_dragon', name: '青龍偃月刀', slot: 'weapon', tier: 4, effect: { atkPct: 16, unitAtkPct: { infantry: 6 } } },
    { id: 'spear_serpent', name: '丈八蛇矛', slot: 'weapon', tier: 4, effect: { atkPct: 15 } },
    { id: 'bow_han', name: '漢家強弓', slot: 'weapon', tier: 3, effect: { atkPct: 10, unitAtkPct: { ranged: 8 } } },
    { id: 'halberd_sky', name: '方天畫戟', slot: 'weapon', tier: 5, effect: { atkPct: 22 } },
    { id: 'blade_double', name: '雙股劍', slot: 'weapon', tier: 2, effect: { atkPct: 7 } },
    { id: 'fan_feather', name: '鵝毛羽扇', slot: 'weapon', tier: 4, effect: { intelPct: 20, lossReductionPct: 5 } },

    { id: 'armor_leather', name: '皮甲', slot: 'armor', tier: 1, effect: { defPct: 4 } },
    { id: 'armor_silver_lion', name: '銀獅戰甲', slot: 'armor', tier: 4, effect: { defPct: 16, hpPct: 8 } },
    { id: 'armor_black_iron', name: '玄鐵重甲', slot: 'armor', tier: 3, effect: { defPct: 12 } },
    { id: 'armor_phoenix', name: '鳳翎戰袍', slot: 'armor', tier: 5, effect: { defPct: 18, hpPct: 12 } },
    { id: 'robe_scholar', name: '儒士長袍', slot: 'armor', tier: 2, effect: { intelPct: 8 } },

    { id: 'horse_common', name: '駿馬', slot: 'mount', tier: 1, effect: { unitAtkPct: { cavalry: 5 } } },
    { id: 'horse_red_hare', name: '赤兔馬', slot: 'mount', tier: 5, effect: { unitAtkPct: { cavalry: 20 }, speedBonus: 2 } },
    { id: 'horse_hualiu', name: '的盧馬', slot: 'mount', tier: 4, effect: { unitAtkPct: { cavalry: 14 }, speedBonus: 1 } },
    { id: 'horse_jueying', name: '絕影', slot: 'mount', tier: 3, effect: { unitAtkPct: { cavalry: 10 } } },

    { id: 'seal_general', name: '將軍印', slot: 'accessory', tier: 2, effect: { cmdPct: 8 } },
    { id: 'jade_heshi', name: '和氏璧', slot: 'accessory', tier: 5, effect: { cmdPct: 15, intelPct: 15 } },
    { id: 'scroll_bingfa', name: '兵法竹簡', slot: 'accessory', tier: 3, effect: { lossReductionPct: 8 } },
    { id: 'token_tiger', name: '虎符', slot: 'accessory', tier: 4, effect: { cmdPct: 12, lootBonusPct: 10 } },
    { id: 'incense_east_wind', name: '東風香爇', slot: 'accessory', tier: 4, effect: { lootBonusPct: 15 } }
  ];

  function itemDefById(id) { return ITEM_DEFS.find((i) => i.id === id); }

  window.Game.Data.ITEM_SLOTS = ITEM_SLOTS;
  window.Game.Data.ITEM_DEFS = ITEM_DEFS;
  window.Game.Data.itemDefById = itemDefById;
})();
