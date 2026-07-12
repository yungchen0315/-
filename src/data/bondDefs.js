/* ============================================================================
 * bondDefs.js — 武將羈絆（合擊／連攜）靜態資料。
 *
 * 對應《皇者天下》目標「還原三國歷史羈絆，武將之間可觸發合擊、連攜」：特定武將
 * 同在一支部隊（編隊，見 ArmyState.subHeroStateIds）時觸發羈絆，替全隊疊加額外
 * 戰鬥加成，並在戰鬥動畫上閃現羈絆橫幅。
 *
 * 每個羈絆有一組成員 heroIds 與門檻 requireCount：同隊成員數達到門檻即觸發
 * （例如「五虎上將」共 5 人、門檻 3，代表任 3 位在同一隊即觸發）。效果沿用武將
 * 技能／戰法的同一份 effects 格式，由 combatSystem 疊加。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} BondDef
   * @property {string} id
   * @property {string} name
   * @property {'合擊'|'連攜'|'羈絆'} type 純flavor分類，影響動畫顯示用字。
   * @property {string[]} heroIds 成員武將 id 池。
   * @property {number} requireCount 同隊成員達此人數即觸發。
   * @property {string} desc 風味描述。
   * @property {import('./heroDefs').HeroSkillEffect[]} effects 觸發時替全隊疊加的戰鬥加成。
   */

  function bond(id, name, type, heroIds, requireCount, desc, effects) {
    return { id: id, name: name, type: type, heroIds: heroIds, requireCount: requireCount, desc: desc, effects: effects };
  }

  /** @type {BondDef[]} */
  const BOND_DEFS = [
    // 蜀
    bond('taoyuan', '桃園結義', '合擊', ['liubei', 'guanyu', 'zhangfei'], 3,
      '劉關張義結金蘭，全隊攻防與韌性大增',
      [{ stat: 'atkPct', value: 12 }, { stat: 'defPct', value: 12 }, { stat: 'lossReductionPct', value: 8 }]),
    bond('wuhu', '五虎上將', '合擊', ['guanyu', 'zhangfei', 'zhaoyun', 'machao', 'huangzhong'], 3,
      '五虎齊聚，全軍攻擊大幅提升',
      [{ stat: 'atkPct', value: 15 }]),
    bond('wolongfengchu', '臥龍鳳雛', '連攜', ['zhugeliang', 'pangtong'], 2,
      '得一可安天下，智計削敵、廣納戰利',
      [{ stat: 'lootBonusPct', value: 18 }, { stat: 'lossReductionPct', value: 8 }, { stat: 'enemyAtkPct', value: -8 }]),
    bond('wanrendi', '萬人敵', '合擊', ['guanyu', 'zhangfei'], 2,
      '關張之勇，先發制人',
      [{ stat: 'atkPct', value: 10 }, { stat: 'firstStrikePct', value: 8 }]),
    bond('jizhi', '繼志相承', '連攜', ['zhugeliang', 'jiangwei'], 2,
      '孔明姜維衣缽相傳，傷亡大降',
      [{ stat: 'lossReductionPct', value: 10 }]),
    // 魏
    bond('caoshi', '曹氏宗親', '羈絆', ['caocao', 'xiahoudun', 'caoren'], 2,
      '宗族同心，堅守如壁',
      [{ stat: 'defPct', value: 10 }, { stat: 'hpPct', value: 8 }]),
    bond('weiwumouchen', '魏武謀臣', '連攜', ['caocao', 'simayi', 'guojia'], 2,
      '謀臣輔弼，亂敵軍心',
      [{ stat: 'enemyAtkPct', value: -10 }, { stat: 'lossReductionPct', value: 6 }]),
    bond('wuziliangjiang', '五子良將', '合擊', ['zhangliao', 'yuejin', 'yujin', 'zhangjunyi', 'xuhuang'], 3,
      '張遼樂進于禁張郃徐晃，良將協同、攻勢凌厲',
      [{ stat: 'atkPct', value: 14 }]),
    bond('huchielai', '虎痴惡來', '羈絆', ['xuchu', 'dianwei'], 2,
      '許褚典韋護主無雙，生命與防禦大增',
      [{ stat: 'defPct', value: 12 }, { stat: 'hpPct', value: 10 }]),
    bond('xiahou', '夏侯兄弟', '羈絆', ['xiahoudun', 'xiahouyuan'], 2,
      '夏侯惇夏侯淵，宗族猛將、攻守兼備',
      [{ stat: 'atkPct', value: 8 }, { stat: 'defPct', value: 8 }]),
    // 吳
    bond('dongwududu', '東吳都督', '連攜', ['zhouyu', 'lumeng', 'luxun'], 2,
      '歷任都督，火計破敵',
      [{ stat: 'atkPct', value: 8 }, { stat: 'enemyDefPct', value: -10 }]),
    bond('jiangbiao', '江表虎臣', '合擊', ['ganning', 'taishici', 'zhoutai'], 2,
      '江東虎臣，奮勇當先',
      [{ stat: 'atkPct', value: 12 }]),
    bond('sunshi', '孫氏一族', '羈絆', ['sunjian', 'sunce', 'sunquan', 'sunshangxiang'], 2,
      '孫氏同族，據江而守',
      [{ stat: 'defPct', value: 8 }, { stat: 'hpPct', value: 8 }]),
    bond('sunjiance', '江東猛虎', '合擊', ['sunjian', 'sunce'], 2,
      '孫堅孫策父子，勇烈進取',
      [{ stat: 'atkPct', value: 12 }, { stat: 'firstStrikePct', value: 6 }]),
    bond('zhoulu', '周瑜魯肅', '連攜', ['zhouyu', 'lusu'], 2,
      '公瑾子敬，聯盟制勝',
      [{ stat: 'enemyDefPct', value: -8 }, { stat: 'lossReductionPct', value: 6 }]),
    bond('jiangdongsujiang', '江東宿將', '羈絆', ['huanggai', 'chengpu', 'handang'], 2,
      '黃蓋程普韓當，三世老臣、堅毅善戰',
      [{ stat: 'defPct', value: 8 }, { stat: 'lossReductionPct', value: 6 }])
  ];

  const BOND_BY_ID = {};
  BOND_DEFS.forEach(function (b) { BOND_BY_ID[b.id] = b; });

  function bondDefById(id) { return BOND_BY_ID[id]; }

  /** 給定同隊武將 id，回傳目前觸發（成員數達門檻）的羈絆清單。 */
  function activeBonds(heroIds) {
    const present = {};
    (heroIds || []).forEach(function (id) { if (id) present[id] = true; });
    return BOND_DEFS.filter(function (b) {
      return b.heroIds.filter(function (id) { return present[id]; }).length >= b.requireCount;
    });
  }

  /** 差一名成員即可觸發的羈絆（供 UI 提示玩家再湊誰）。 */
  function nearBonds(heroIds) {
    const present = {};
    (heroIds || []).forEach(function (id) { if (id) present[id] = true; });
    return BOND_DEFS.filter(function (b) {
      const have = b.heroIds.filter(function (id) { return present[id]; }).length;
      return have === b.requireCount - 1 && have < b.heroIds.length;
    });
  }

  window.Game.Data.BOND_DEFS = BOND_DEFS;
  window.Game.Data.bondDefById = bondDefById;
  window.Game.Data.activeBonds = activeBonds;
  window.Game.Data.nearBonds = nearBonds;
})();
