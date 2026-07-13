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
   * @property {number} rarity 武將招牌戰法 2~5（跟隨來源武將稀有度）；獨立戰法 1~5
   *   （見兵法閣獎池 GACHA_RARITY_WEIGHT 抽取權重）。
   */

  // 每位武將的招牌技能都對應一個可傳授的招牌戰法。
  const HERO_TACTICS = window.Game.Data.HERO_DEFS.map(function (h) {
    return { id: 'tactic_' + h.id, name: h.skill.name, desc: h.skill.desc, effects: h.skill.effects, sourceHeroId: h.id, rarity: h.rarity };
  });

  function st(id, name, rarity, desc, effects) {
    return { id: 'st_' + id, name: name, desc: desc, effects: effects, sourceHeroId: null, rarity: rarity };
  }

  /**
   * 獨立戰法庫（通用兵法）。效果沿用武將技能的同一套欄位，靠掉落／獎池抽取／
   * 開局贈送取得。數值刻意依「每級戰力預算」設計（1★≈6.5、2★≈10、3★≈14、
   * 4★≈18.5、5★≈24，多效果戰法把預算拆給各效果），確保星級越高、戰法實際
   * 強度越明顯拉開差距，不會出現「4★反而比 3★弱」的情況。
   */
  const STANDALONE_TACTICS = [
    // 攻擊型
    st('qingrui', '輕銳', 1, '全軍攻擊小幅提升', [{ stat: 'atkPct', value: 7 }]),
    st('fenzhan', '奮戰', 2, '全軍攻擊小幅提升', [{ stat: 'atkPct', value: 10 }]),
    st('mengong', '猛攻', 3, '全軍攻擊提升', [{ stat: 'atkPct', value: 14 }]),
    st('pojun', '破軍', 4, '進攻時全軍攻擊大幅提升', [{ stat: 'atkPct', value: 19, when: 'attacking' }]),
    st('xiansheng', '先聲奪人', 3, '進攻時首輪傷害提升', [{ stat: 'firstStrikePct', value: 14, when: 'attacking' }]),
    st('ruiqi', '銳氣', 3, '攻擊與首輪傷害小幅提升', [{ stat: 'atkPct', value: 8 }, { stat: 'firstStrikePct', value: 6 }]),
    st('beishui', '背水一戰', 4, '全軍攻擊大幅提升', [{ stat: 'atkPct', value: 19 }]),
    st('suzhan', '速戰', 3, '進攻時首輪傷害大幅提升', [{ stat: 'firstStrikePct', value: 14, when: 'attacking' }]),
    st('yonglie', '勇烈', 2, '進攻時攻擊提升', [{ stat: 'atkPct', value: 10, when: 'attacking' }]),
    st('xianji', '先機', 1, '進攻時首輪傷害小幅提升', [{ stat: 'firstStrikePct', value: 7, when: 'attacking' }]),
    // 防禦型
    st('jianren', '堅韌', 1, '全軍防禦小幅提升', [{ stat: 'defPct', value: 7 }]),
    st('tiebi', '鐵壁', 2, '全軍防禦提升', [{ stat: 'defPct', value: 10 }]),
    st('jianshou', '堅守', 3, '防守時防禦大幅提升', [{ stat: 'defPct', value: 14, when: 'defending' }]),
    st('jintang', '金湯', 3, '防禦與生命上限提升', [{ stat: 'defPct', value: 8 }, { stat: 'hpPct', value: 6 }]),
    st('guijia', '龜甲陣', 3, '全軍生命上限大幅提升', [{ stat: 'hpPct', value: 14 }]),
    st('budong', '不動如山', 4, '防守時防禦極大幅提升', [{ stat: 'defPct', value: 19, when: 'defending' }]),
    st('panshi', '磐石', 2, '防禦與生命上限小幅提升', [{ stat: 'defPct', value: 5 }, { stat: 'hpPct', value: 5 }]),
    st('shouyu', '守禦', 2, '防守時防禦提升、傷亡降低', [{ stat: 'defPct', value: 7, when: 'defending' }, { stat: 'lossReductionPct', value: 3 }]),
    st('shoucheng', '守成', 1, '防守時防禦小幅提升', [{ stat: 'defPct', value: 7, when: 'defending' }]),
    // 韌性型
    st('yangbing', '養兵', 1, '我軍傷亡小幅降低', [{ stat: 'lossReductionPct', value: 6 }]),
    st('taolue', '韜略', 3, '我軍傷亡降低', [{ stat: 'lossReductionPct', value: 14 }]),
    st('yangjing', '養精蓄銳', 2, '傷亡降低、生命上限小幅提升', [{ stat: 'lossReductionPct', value: 5 }, { stat: 'hpPct', value: 5 }]),
    st('fuxu', '撫恤', 4, '我軍傷亡大幅降低', [{ stat: 'lossReductionPct', value: 19 }]),
    st('miaoshou', '妙手', 3, '我軍傷亡降低', [{ stat: 'lossReductionPct', value: 14 }]),
    // 資源型
    st('xiaolue', '小掠', 1, '戰利品小幅提升', [{ stat: 'lootBonusPct', value: 7 }]),
    st('lueduo', '掠奪', 2, '戰利品提升', [{ stat: 'lootBonusPct', value: 10 }]),
    st('yinliang', '因糧於敵', 3, '戰利品大幅提升', [{ stat: 'lootBonusPct', value: 14 }]),
    st('soukua', '搜刮', 2, '戰利品提升、傷亡降低', [{ stat: 'lootBonusPct', value: 8 }, { stat: 'lossReductionPct', value: 3 }]),
    // 削弱敵軍
    st('saorao', '騷擾', 1, '小幅削弱敵軍攻擊', [{ stat: 'enemyAtkPct', value: -6 }]),
    st('raodi', '擾敵', 3, '削弱敵軍攻擊', [{ stat: 'enemyAtkPct', value: -14 }]),
    st('luanjun', '亂軍', 3, '防守時大幅削弱敵軍攻擊', [{ stat: 'enemyAtkPct', value: -14, when: 'defending' }]),
    st('yibing', '疑兵', 4, '削弱敵軍攻防', [{ stat: 'enemyAtkPct', value: -9 }, { stat: 'enemyDefPct', value: -9 }]),
    st('huoji', '火計', 4, '進攻時大幅削弱敵軍防禦', [{ stat: 'enemyDefPct', value: -18, when: 'attacking' }]),
    st('shuiyan', '水淹', 4, '削弱敵軍防禦', [{ stat: 'enemyDefPct', value: -18 }]),
    st('lijian', '離間', 5, '防守時極大幅削弱敵軍攻擊', [{ stat: 'enemyAtkPct', value: -24, when: 'defending' }]),
    // 兵種操典（依兵種角色）
    st('bubing', '步兵操典', 3, '步兵攻擊提升', [{ stat: 'unitAtkPct', unit: 'infantry', value: 14 }]),
    st('qibing', '騎兵操典', 3, '騎兵攻擊提升', [{ stat: 'unitAtkPct', unit: 'cavalry', value: 14 }]),
    st('gongnu', '弓弩操典', 3, '弓弩攻擊提升', [{ stat: 'unitAtkPct', unit: 'ranged', value: 14 }]),
    st('gongcheng', '攻城術', 3, '攻城器械攻擊提升', [{ stat: 'unitAtkPct', unit: 'siege', value: 14 }]),
    st('tieqi', '鐵騎', 4, '進攻時騎兵攻擊大幅提升', [{ stat: 'unitAtkPct', unit: 'cavalry', value: 19, when: 'attacking' }]),
    st('qiangnu', '強弩', 4, '進攻時弓弩攻擊大幅提升', [{ stat: 'unitAtkPct', unit: 'ranged', value: 19, when: 'attacking' }]),
    st('xianzhen', '陷陣', 4, '進攻時步兵攻擊大幅提升', [{ stat: 'unitAtkPct', unit: 'infantry', value: 19, when: 'attacking' }]),
    // 名法（多重效果稀有戰法，5★戰法效果總量明顯高於其他星級）
    st('bazhentu', '八陣圖', 5, '防禦提升並削弱敵軍攻擊', [{ stat: 'defPct', value: 13 }, { stat: 'enemyAtkPct', value: -11 }]),
    st('fenglin', '風林火山', 5, '攻擊與首輪傷害提升', [{ stat: 'atkPct', value: 14 }, { stat: 'firstStrikePct', value: 10 }]),
    st('taiping', '太平要術', 4, '傷亡降低並提升戰利品', [{ stat: 'lossReductionPct', value: 9 }, { stat: 'lootBonusPct', value: 9 }]),
    st('qimen', '奇門遁甲', 5, '防禦提升並削弱敵軍防禦', [{ stat: 'defPct', value: 12 }, { stat: 'enemyDefPct', value: -12 }]),
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
