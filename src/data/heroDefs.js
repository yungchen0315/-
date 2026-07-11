/* ============================================================================
 * heroDefs.js — 武將靜態資料（HeroData）。
 * 取得方式分兩種：主線劇情解鎖（source.type === 'story'），或酒館招募取得
 * （source.type === 'recruit'，見 src/systems/gachaSystem.js／src/ui/gachaScreen.js）。
 * rarity：2=一般 3=精良 4=名將 5=絕世。growth 影響升級時各屬性成長幅度。
 *
 * 技能的實際戰鬥數值效果（skill.effects）與敘述文字（skill.desc）分開存放，
 * 但兩者是同一份資料——src/systems/combatSystem.js 直接讀 effects 套用到
 * 戰鬥公式，UI（src/ui/heroScreen.js）也直接讀同一份 effects 產生數值說明文字，
 * 兩邊不會有「說明寫的效果」跟「實際套用的效果」對不起來的問題。
 *
 * 對應的動態部分（等級、經驗、裝備、目前領軍的部隊）屬於 HeroState，
 * 定義在 src/models/HeroState.js，不會出現在這份表裡。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} HeroSkillEffect
   * @property {string} stat 效果作用的欄位：'atkPct'|'defPct'|'hpPct'|'lossReductionPct'|
   *   'lootBonusPct'|'enemyAtkPct'|'enemyDefPct'|'firstStrikePct'|'unitAtkPct'。
   * @property {string} [unit] stat 為 'unitAtkPct' 時，指定作用的兵種 id（UnitDef.id）。
   * @property {number} value 數值（百分比），負數代表削弱（通常用在 enemyAtkPct/enemyDefPct）。
   * @property {'attacking'|'defending'} [when] 只在攻方／守方時才生效；不填代表雙方皆生效。
   */

  /**
   * @typedef {Object} HeroSkillDef
   * @property {string} name
   * @property {string} desc 技能敘述文字（風味描述，實際數值見 effects）。
   * @property {HeroSkillEffect[]} effects 實際套用到戰鬥公式的數值效果。
   */

  /**
   * @typedef {Object} HeroSourceDef
   * @property {'story'|'recruit'} type 取得方式：主線劇情解鎖，或酒館招募取得。
   * @property {string} [missionId] type 為 'story' 時，解鎖此武將的關卡 id。
   */

  /**
   * @typedef {Object} HeroData
   * @property {string} id
   * @property {string} name
   * @property {string} factionId 此武將所屬勢力（目前設計上每位武將僅歸屬單一勢力）。
   * @property {number} rarity 2~5。
   * @property {{force:number, cmd:number, intel:number}} baseStats 1 級時的基礎數值。
   * @property {number} growth 每提升 1 級時數值成長的係數。
   * @property {HeroSkillDef} skill
   * @property {HeroSourceDef} source
   * @property {string} portraitColor 依稀有度決定的頭像框顏色，純視覺用。
   * @property {'m'|'f'} gender 純視覺用，供立繪生成器決定髮型。
   */

  function hero(id, name, factionId, rarity, force, cmd, intel, skillName, skillDesc, effects, source, gender) {
    return {
      id, name, factionId, rarity, source,
      baseStats: { force, cmd, intel },
      growth: +(0.9 + rarity * 0.12).toFixed(2),
      skill: { name: skillName, desc: skillDesc, effects },
      portraitColor: rarity >= 5 ? '#d4af37' : rarity === 4 ? '#a15ec5' : rarity === 3 ? '#3a6bb0' : '#7a7a7a',
      gender: gender || 'm'
    };
  }

  /** @type {HeroData[]} */
  const HERO_DEFS = [
    hero('liubei', '劉備', 'shu', 5, 55, 90, 82, '仁德', '全軍傷亡大幅降低，長期作戰更具韌性',
      [{ stat: 'lossReductionPct', value: 15 }],
      { type: 'story', missionId: 'shu_m1' }),
    hero('guanyu', '關羽', 'shu', 5, 97, 93, 75, '武聖', '出戰步兵/槍兵攻擊力大幅提升',
      [{ stat: 'unitAtkPct', unit: 'infantry', value: 15 }, { stat: 'unitAtkPct', unit: 'spearman', value: 15 }],
      { type: 'story', missionId: 'shu_m3' }),
    hero('zhangfei', '張飛', 'shu', 5, 96, 78, 55, '咆哮', '戰鬥開始時使敵軍全體防禦力下降',
      [{ stat: 'enemyDefPct', value: -12 }],
      { type: 'story', missionId: 'shu_m2' }),
    hero('zhaoyun', '趙雲', 'shu', 5, 94, 90, 78, '龍膽', '所率部隊承受的傷害降低',
      [{ stat: 'lossReductionPct', value: 10 }],
      { type: 'recruit' }),
    hero('machao', '馬超', 'shu', 4, 95, 82, 60, '西涼鐵騎', '騎兵攻擊力提升',
      [{ stat: 'unitAtkPct', unit: 'cavalry', value: 18 }],
      { type: 'recruit' }),
    hero('huangzhong', '黃忠', 'shu', 4, 92, 79, 65, '百步穿楊', '弓騎兵/弩兵造成的傷害提升',
      [{ stat: 'unitAtkPct', unit: 'crossbowman', value: 16 }, { stat: 'unitAtkPct', unit: 'horsearcher', value: 16 }],
      { type: 'recruit' }),
    hero('zhugeliang', '諸葛亮', 'shu', 5, 38, 92, 100, '奇謀', '戰鬥中我軍傷亡降低且獲得額外資源',
      [{ stat: 'lossReductionPct', value: 12 }, { stat: 'lootBonusPct', value: 15 }],
      { type: 'story', missionId: 'shu_m4' }),
    hero('jiangwei', '姜維', 'shu', 3, 85, 80, 82, '繼志', '統率部隊在攻城戰中傷害提升',
      [{ stat: 'atkPct', value: 8 }],
      { type: 'story', missionId: 'shu_m11' }),
    hero('weiyan', '魏延', 'shu', 3, 88, 79, 62, '奇襲', '主動進攻時首輪傷害提升',
      [{ stat: 'firstStrikePct', value: 15 }],
      { type: 'story', missionId: 'shu_m5' }),
    hero('pangtong', '龐統', 'shu', 4, 45, 85, 96, '連環', '戰鬥中削弱敵軍全體攻擊力',
      [{ stat: 'enemyAtkPct', value: -12 }],
      { type: 'recruit' }),
    hero('liyan', '李嚴', 'shu', 2, 70, 68, 70, '治政', '主城資源產出小幅提升',
      [{ stat: 'lootBonusPct', value: 10 }],
      { type: 'recruit' }),

    hero('caocao', '曹操', 'wei', 5, 80, 96, 92, '梟雄', '全軍士氣與攻擊力提升',
      [{ stat: 'atkPct', value: 10 }],
      { type: 'story', missionId: 'wei_m1' }),
    hero('simayi', '司馬懿', 'wei', 5, 70, 95, 97, '鷹視', '防守時大幅削弱敵軍攻擊力',
      [{ stat: 'enemyAtkPct', value: -15, when: 'defending' }],
      { type: 'recruit' }),
    hero('xiahoudun', '夏侯惇', 'wei', 4, 90, 82, 58, '拔矢', '受到致命傷害後短暫免疫死亡',
      [{ stat: 'hpPct', value: 12 }],
      { type: 'recruit' }),
    hero('zhangliao', '張遼', 'wei', 4, 91, 88, 68, '威震', '突襲敵軍時造成額外傷害',
      [{ stat: 'firstStrikePct', value: 18, when: 'attacking' }],
      { type: 'story', missionId: 'wei_m3' }),
    hero('xuhuang', '徐晃', 'wei', 3, 87, 82, 64, '斷金', '對攻城器械造成額外傷害',
      [{ stat: 'atkPct', value: 8 }],
      { type: 'recruit' }),
    hero('dianwei', '典韋', 'wei', 3, 93, 70, 40, '惡來', '自身防禦力大幅提升',
      [{ stat: 'defPct', value: 15 }],
      { type: 'story', missionId: 'wei_m2' }),
    hero('xuchu', '許褚', 'wei', 3, 92, 68, 38, '虎癡', '所率部隊生命上限提升',
      [{ stat: 'hpPct', value: 15 }],
      { type: 'story', missionId: 'wei_m5' }),
    hero('guojia', '郭嘉', 'wei', 4, 40, 84, 95, '遺計', '戰前可預知敵軍配置並提升先攻',
      [{ stat: 'firstStrikePct', value: 10, when: 'attacking' }],
      { type: 'story', missionId: 'wei_m4' }),
    hero('zhangjunyi', '張郃', 'wei', 3, 86, 83, 63, '巧變', '地形不利時仍維持部隊戰力',
      [{ stat: 'defPct', value: 8 }],
      { type: 'story', missionId: 'wei_m6' }),
    hero('caoren', '曹仁', 'wei', 2, 84, 78, 55, '堅守', '駐守城池時防禦力提升',
      [{ stat: 'defPct', value: 15, when: 'defending' }],
      { type: 'recruit' }),

    hero('sunquan', '孫權', 'wu', 4, 68, 88, 80, '據江', '水域附近作戰時全軍戰力提升',
      [{ stat: 'atkPct', value: 6 }, { stat: 'defPct', value: 6 }],
      { type: 'story', missionId: 'wu_m1' }),
    hero('zhouyu', '周瑜', 'wu', 5, 71, 94, 93, '火攻', '戰鬥開始對敵軍造成一波火焰傷害',
      [{ stat: 'enemyDefPct', value: -10, when: 'attacking' }],
      { type: 'story', missionId: 'wu_m6' }),
    hero('luxun', '陸遜', 'wu', 5, 75, 92, 90, '連營', '反擊時造成的傷害大幅提升',
      [{ stat: 'enemyAtkPct', value: -12, when: 'defending' }],
      { type: 'story', missionId: 'wu_m10' }),
    hero('ganning', '甘寧', 'wu', 4, 90, 80, 60, '錦帆', '奇襲敵軍時速度與傷害提升',
      [{ stat: 'atkPct', value: 14, when: 'attacking' }],
      { type: 'story', missionId: 'wu_m3' }),
    hero('taishici', '太史慈', 'wu', 3, 89, 78, 58, '猛擊', '單挑戰鬥中攻擊力大幅提升',
      [{ stat: 'atkPct', value: 10 }],
      { type: 'story', missionId: 'wu_m2' }),
    hero('lumeng', '呂蒙', 'wu', 4, 82, 85, 78, '奇襲荊州', '攻城戰中兵力損耗降低',
      [{ stat: 'lossReductionPct', value: 10 }],
      { type: 'story', missionId: 'wu_m9' }),
    hero('huanggai', '黃蓋', 'wu', 2, 79, 74, 55, '苦肉', '偽裝撤退後造成反擊傷害',
      [{ stat: 'enemyAtkPct', value: -8, when: 'defending' }],
      { type: 'recruit' }),
    hero('lusu', '魯肅', 'wu', 3, 55, 80, 82, '聯盟', '與其他勢力交戰時減少資源損耗',
      [{ stat: 'lossReductionPct', value: 6 }],
      { type: 'recruit' }),
    hero('sunshangxiang', '孫尚香', 'wu', 3, 85, 76, 66, '弓馬嫻熟', '弓騎兵造成的傷害提升',
      [{ stat: 'unitAtkPct', unit: 'horsearcher', value: 16 }],
      { type: 'recruit' }, 'f'),
    hero('zhoutai', '周泰', 'wu', 2, 86, 70, 45, '捨身', '守護主將，承受本應由主將承受的傷害',
      [{ stat: 'hpPct', value: 10 }],
      { type: 'recruit' })
  ];

  function heroDefById(id) { return HERO_DEFS.find((h) => h.id === id); }
  function heroDefsByFaction(factionId) { return HERO_DEFS.filter((h) => h.factionId === factionId); }

  const STAT_LABELS = {
    atkPct: '全軍攻擊', defPct: '全軍防禦', hpPct: '全軍生命上限',
    lootBonusPct: '戰利品',
    enemyAtkPct: '敵軍攻擊', enemyDefPct: '敵軍防禦', firstStrikePct: '首輪傷害'
  };
  // lossReductionPct 存的是「傷亡降低的幅度」，數值越大代表我軍傷亡越少（正面效果）；
  // 若沿用其他欄位「+15%」的顯示方式會讓人誤讀成「傷亡增加 15%」，因此獨立處理，
  // 直接顯示成「我軍傷亡降低 15%」，不套用通用的正負號前綴。
  const WHEN_LABELS = { attacking: '（進攻時）', defending: '（防守時）' };

  /**
   * 把 HeroSkillDef.effects 轉成人類可讀的數值說明，例如
   * 「我軍傷亡降低 15%」或「步兵攻擊 +15%、槍兵攻擊 +15%」，供武將名錄等 UI 顯示，
   * 與 combatSystem.js 實際套用的效果完全來自同一份資料，不會有兜不起來的情況。
   * @param {HeroSkillEffect[]} effects
   * @returns {string}
   */
  function describeSkillEffects(effects) {
    if (!effects || effects.length === 0) return '';
    return effects.map((e) => {
      if (e.stat === 'lossReductionPct') return '我軍傷亡降低 ' + Math.abs(e.value) + '%' + (WHEN_LABELS[e.when] || '');
      const sign = e.value >= 0 ? '+' : '';
      const label = e.stat === 'unitAtkPct'
        ? ((window.Game.Data.unitDefById(e.unit) || {}).name || e.unit) + '攻擊'
        : (STAT_LABELS[e.stat] || e.stat);
      return label + ' ' + sign + e.value + '%' + (WHEN_LABELS[e.when] || '');
    }).join('、');
  }

  window.Game.Data.HERO_DEFS = HERO_DEFS;
  window.Game.Data.heroDefById = heroDefById;
  window.Game.Data.heroDefsByFaction = heroDefsByFaction;
  window.Game.Data.describeSkillEffects = describeSkillEffects;
})();
