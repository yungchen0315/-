/* ============================================================================
 * tacticDefs.js — 戰法靜態資料（率土之濱式的「戰法」系統，對應《皇者天下》
 * 「近 70 種技能供你選擇，自由搭配」的目標）。
 *
 * 戰法分兩類：
 *  1. 武將招牌戰法（sourceHeroId 有值）——直接取材自各武將的招牌技能（heroDefs 的
 *     skill），擁有該武將即可把牠的招牌戰法傳授給其他武將。
 *  2. 獨立戰法（sourceHeroId 為 null）——不綁武將的通用兵法，靠擊破據點掉落的兵書
 *     習得（PlayerState.learnedTactics），開局也會贈送幾個基礎戰法。
 *
 * 兩類戰法都用同一份 effects 格式（與武將技能共用），戰鬥效果由 combatSystem 疊加，
 * 一份戰法同時只能裝配在一名武將身上。unitAtkPct 的 unit 一律用「兵種角色」
 * （infantry／cavalry／ranged／siege），與 combatSystem 的判定一致。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} TacticDef
   * @property {string} id
   * @property {string} name
   * @property {string} desc
   * @property {import('./heroDefs').HeroSkillEffect[]} effects
   * @property {string|null} sourceHeroId 招牌戰法的來源武將；獨立戰法為 null。
   * @property {number} rarity 2~5。
   */

  // 每位武將的招牌技能都對應一個可傳授的招牌戰法。
  const HERO_TACTICS = window.Game.Data.HERO_DEFS.map(function (h) {
    return { id: 'tactic_' + h.id, name: h.skill.name, desc: h.skill.desc, effects: h.skill.effects, sourceHeroId: h.id, rarity: h.rarity };
  });

  function st(id, name, rarity, desc, effects) {
    return { id: 'st_' + id, name: name, desc: desc, effects: effects, sourceHeroId: null, rarity: rarity };
  }

  // 獨立戰法庫（通用兵法）。效果沿用武將技能的同一套欄位，靠掉落／開局贈送取得。
  const STANDALONE_TACTICS = [
    // 攻擊型
    st('fenzhan', '奮戰', 2, '全軍攻擊小幅提升', [{ stat: 'atkPct', value: 8 }]),
    st('mengong', '猛攻', 3, '全軍攻擊提升', [{ stat: 'atkPct', value: 12 }]),
    st('pojun', '破軍', 4, '進攻時全軍攻擊大幅提升', [{ stat: 'atkPct', value: 15, when: 'attacking' }]),
    st('xiansheng', '先聲奪人', 3, '進攻時首輪傷害提升', [{ stat: 'firstStrikePct', value: 12, when: 'attacking' }]),
    st('ruiqi', '銳氣', 3, '攻擊與首輪傷害小幅提升', [{ stat: 'atkPct', value: 9 }, { stat: 'firstStrikePct', value: 6 }]),
    st('beishui', '背水一戰', 4, '全軍攻擊大幅提升', [{ stat: 'atkPct', value: 18 }]),
    st('suzhan', '速戰', 3, '進攻時首輪傷害大幅提升', [{ stat: 'firstStrikePct', value: 15, when: 'attacking' }]),
    st('yonglie', '勇烈', 2, '進攻時攻擊提升', [{ stat: 'atkPct', value: 10, when: 'attacking' }]),
    // 防禦型
    st('tiebi', '鐵壁', 2, '全軍防禦提升', [{ stat: 'defPct', value: 12 }]),
    st('jianshou', '堅守', 3, '防守時防禦大幅提升', [{ stat: 'defPct', value: 16, when: 'defending' }]),
    st('jintang', '金湯', 3, '防禦與生命上限提升', [{ stat: 'defPct', value: 10 }, { stat: 'hpPct', value: 8 }]),
    st('guijia', '龜甲陣', 3, '全軍生命上限大幅提升', [{ stat: 'hpPct', value: 16 }]),
    st('budong', '不動如山', 4, '防守時防禦極大幅提升', [{ stat: 'defPct', value: 20, when: 'defending' }]),
    st('panshi', '磐石', 2, '防禦與生命上限小幅提升', [{ stat: 'defPct', value: 9 }, { stat: 'hpPct', value: 9 }]),
    st('shouyu', '守禦', 2, '防守時防禦提升、傷亡降低', [{ stat: 'defPct', value: 11, when: 'defending' }, { stat: 'lossReductionPct', value: 5 }]),
    // 韌性型
    st('taolue', '韜略', 3, '我軍傷亡降低', [{ stat: 'lossReductionPct', value: 10 }]),
    st('yangjing', '養精蓄銳', 2, '傷亡降低、生命上限小幅提升', [{ stat: 'lossReductionPct', value: 7 }, { stat: 'hpPct', value: 6 }]),
    st('fuxu', '撫恤', 4, '我軍傷亡大幅降低', [{ stat: 'lossReductionPct', value: 13 }]),
    st('miaoshou', '妙手', 3, '我軍傷亡降低', [{ stat: 'lossReductionPct', value: 9 }]),
    // 資源型
    st('lueduo', '掠奪', 2, '戰利品提升', [{ stat: 'lootBonusPct', value: 15 }]),
    st('yinliang', '因糧於敵', 3, '戰利品大幅提升', [{ stat: 'lootBonusPct', value: 22 }]),
    st('soukua', '搜刮', 2, '戰利品提升、傷亡降低', [{ stat: 'lootBonusPct', value: 12 }, { stat: 'lossReductionPct', value: 4 }]),
    // 削弱敵軍
    st('raodi', '擾敵', 3, '削弱敵軍攻擊', [{ stat: 'enemyAtkPct', value: -11 }]),
    st('luanjun', '亂軍', 3, '防守時大幅削弱敵軍攻擊', [{ stat: 'enemyAtkPct', value: -14, when: 'defending' }]),
    st('yibing', '疑兵', 4, '削弱敵軍攻防', [{ stat: 'enemyAtkPct', value: -8 }, { stat: 'enemyDefPct', value: -8 }]),
    st('huoji', '火計', 4, '進攻時大幅削弱敵軍防禦', [{ stat: 'enemyDefPct', value: -16, when: 'attacking' }]),
    st('shuiyan', '水淹', 4, '削弱敵軍防禦', [{ stat: 'enemyDefPct', value: -13 }]),
    st('lijian', '離間', 5, '防守時極大幅削弱敵軍攻擊', [{ stat: 'enemyAtkPct', value: -16, when: 'defending' }]),
    // 兵種操典（依兵種角色）
    st('bubing', '步兵操典', 3, '步兵攻擊提升', [{ stat: 'unitAtkPct', unit: 'infantry', value: 14 }]),
    st('qibing', '騎兵操典', 3, '騎兵攻擊提升', [{ stat: 'unitAtkPct', unit: 'cavalry', value: 14 }]),
    st('gongnu', '弓弩操典', 3, '弓弩攻擊提升', [{ stat: 'unitAtkPct', unit: 'ranged', value: 16 }]),
    st('gongcheng', '攻城術', 3, '攻城器械攻擊大幅提升', [{ stat: 'unitAtkPct', unit: 'siege', value: 22 }]),
    st('tieqi', '鐵騎', 4, '進攻時騎兵攻擊大幅提升', [{ stat: 'unitAtkPct', unit: 'cavalry', value: 18, when: 'attacking' }]),
    st('qiangnu', '強弩', 4, '進攻時弓弩攻擊大幅提升', [{ stat: 'unitAtkPct', unit: 'ranged', value: 18, when: 'attacking' }]),
    st('xianzhen', '陷陣', 4, '進攻時步兵攻擊大幅提升', [{ stat: 'unitAtkPct', unit: 'infantry', value: 18, when: 'attacking' }]),
    // 名法（多重效果稀有戰法）
    st('bazhentu', '八陣圖', 5, '防禦提升並削弱敵軍攻擊', [{ stat: 'defPct', value: 12 }, { stat: 'enemyAtkPct', value: -10 }]),
    st('fenglin', '風林火山', 5, '攻擊與首輪傷害提升', [{ stat: 'atkPct', value: 11 }, { stat: 'firstStrikePct', value: 8 }]),
    st('taiping', '太平要術', 4, '傷亡降低並提升戰利品', [{ stat: 'lossReductionPct', value: 10 }, { stat: 'lootBonusPct', value: 10 }]),
    st('qimen', '奇門遁甲', 5, '防禦提升並削弱敵軍防禦', [{ stat: 'defPct', value: 10 }, { stat: 'enemyDefPct', value: -10 }]),
    st('changqu', '長驅', 4, '進攻時攻擊與首輪傷害提升', [{ stat: 'atkPct', value: 9, when: 'attacking' }, { stat: 'firstStrikePct', value: 9, when: 'attacking' }])
  ];

  /** @type {TacticDef[]} */
  const TACTIC_DEFS = HERO_TACTICS.concat(STANDALONE_TACTICS);

  const TACTIC_BY_ID = {};
  TACTIC_DEFS.forEach(function (t) { TACTIC_BY_ID[t.id] = t; });

  function tacticDefById(id) { return TACTIC_BY_ID[id]; }
  function tacticIdForHero(heroId) { return 'tactic_' + heroId; }
  function isStandaloneTactic(id) { const t = TACTIC_BY_ID[id]; return !!(t && !t.sourceHeroId); }

  window.Game.Data.TACTIC_DEFS = TACTIC_DEFS;
  window.Game.Data.STANDALONE_TACTICS = STANDALONE_TACTICS;
  window.Game.Data.tacticDefById = tacticDefById;
  window.Game.Data.tacticIdForHero = tacticIdForHero;
  window.Game.Data.isStandaloneTactic = isStandaloneTactic;
})();
