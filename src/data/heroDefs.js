/* ============================================================================
 * heroDefs.js — 武將靜態資料（HeroData）。
 * 取得方式分兩種：主線劇情解鎖（source.type === 'story'），或酒館招募取得
 * （source.type === 'recruit'，見 src/systems/gachaSystem.js／src/ui/gachaScreen.js）。
 * rarity：2=一般 3=精良 4=名將 5=絕世。growth 影響升級時各屬性成長幅度。
 *
 * 對應的動態部分（等級、經驗、裝備、目前領軍的部隊）屬於 HeroState，
 * 定義在 src/models/HeroState.js，不會出現在這份表裡。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} HeroSkillDef
   * @property {string} name
   * @property {string} desc 技能敘述文字（實際數值效果由 heroSkillSystem 依 id 查表套用）。
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

  function hero(id, name, factionId, rarity, force, cmd, intel, skillName, skillDesc, source, gender) {
    return {
      id, name, factionId, rarity, source,
      baseStats: { force, cmd, intel },
      growth: +(0.9 + rarity * 0.12).toFixed(2),
      skill: { name: skillName, desc: skillDesc },
      portraitColor: rarity >= 5 ? '#d4af37' : rarity === 4 ? '#a15ec5' : rarity === 3 ? '#3a6bb0' : '#7a7a7a',
      gender: gender || 'm'
    };
  }

  /** @type {HeroData[]} */
  const HERO_DEFS = [
    hero('guanyu', '關羽', 'shu', 5, 97, 93, 75, '武聖', '出戰步兵/槍兵攻擊力大幅提升', { type: 'story', missionId: 'm3' }),
    hero('zhangfei', '張飛', 'shu', 5, 96, 78, 55, '咆哮', '戰鬥開始時使敵軍全體防禦力下降', { type: 'story', missionId: 'm2' }),
    hero('zhaoyun', '趙雲', 'shu', 5, 94, 90, 78, '龍膽', '所率部隊承受的傷害降低', { type: 'story', missionId: 'm1' }),
    hero('machao', '馬超', 'shu', 4, 95, 82, 60, '西涼鐵騎', '騎兵攻擊力提升', { type: 'recruit' }),
    hero('huangzhong', '黃忠', 'shu', 4, 92, 79, 65, '百步穿楊', '弓騎兵/弩兵造成的傷害提升', { type: 'recruit' }),
    hero('zhugeliang', '諸葛亮', 'shu', 5, 38, 92, 100, '奇謀', '戰鬥中我軍傷亡降低且獲得額外資源', { type: 'story', missionId: 'm4' }),
    hero('jiangwei', '姜維', 'shu', 3, 85, 80, 82, '繼志', '統率部隊在攻城戰中傷害提升', { type: 'recruit' }),
    hero('weiyan', '魏延', 'shu', 3, 88, 79, 62, '奇襲', '主動進攻時首輪傷害提升', { type: 'story', missionId: 'm5' }),
    hero('pangtong', '龐統', 'shu', 4, 45, 85, 96, '連環', '戰鬥中削弱敵軍全體攻擊力', { type: 'story', missionId: 'm4' }),
    hero('liyan', '李嚴', 'shu', 2, 70, 68, 70, '治政', '主城資源產出小幅提升', { type: 'recruit' }),

    hero('caocao', '曹操', 'wei', 5, 80, 96, 92, '梟雄', '全軍士氣與攻擊力提升', { type: 'story', missionId: 'm6' }),
    hero('simayi', '司馬懿', 'wei', 5, 70, 95, 97, '鷹視', '防守時大幅削弱敵軍攻擊力', { type: 'story', missionId: 'm7' }),
    hero('xiahoudun', '夏侯惇', 'wei', 4, 90, 82, 58, '拔矢', '受到致命傷害後短暫免疫死亡', { type: 'recruit' }),
    hero('zhangliao', '張遼', 'wei', 4, 91, 88, 68, '威震', '突襲敵軍時造成額外傷害', { type: 'recruit' }),
    hero('xuhuang', '徐晃', 'wei', 3, 87, 82, 64, '斷金', '對攻城器械造成額外傷害', { type: 'recruit' }),
    hero('dianwei', '典韋', 'wei', 3, 93, 70, 40, '惡來', '自身防禦力大幅提升', { type: 'story', missionId: 'm6' }),
    hero('xuchu', '許褚', 'wei', 3, 92, 68, 38, '虎癡', '所率部隊生命上限提升', { type: 'recruit' }),
    hero('guojia', '郭嘉', 'wei', 4, 40, 84, 95, '遺計', '戰前可預知敵軍配置並提升先攻', { type: 'story', missionId: 'm7' }),
    hero('zhangjunyi', '張郃', 'wei', 3, 86, 83, 63, '巧變', '地形不利時仍維持部隊戰力', { type: 'recruit' }),
    hero('caoren', '曹仁', 'wei', 2, 84, 78, 55, '堅守', '駐守城池時防禦力提升', { type: 'recruit' }),

    hero('sunquan', '孫權', 'wu', 4, 68, 88, 80, '據江', '水域附近作戰時全軍戰力提升', { type: 'story', missionId: 'm8' }),
    hero('zhouyu', '周瑜', 'wu', 5, 71, 94, 93, '火攻', '戰鬥開始對敵軍造成一波火焰傷害', { type: 'story', missionId: 'm9' }),
    hero('luxun', '陸遜', 'wu', 5, 75, 92, 90, '連營', '反擊時造成的傷害大幅提升', { type: 'story', missionId: 'm10' }),
    hero('ganning', '甘寧', 'wu', 4, 90, 80, 60, '錦帆', '奇襲敵軍時速度與傷害提升', { type: 'recruit' }),
    hero('taishici', '太史慈', 'wu', 3, 89, 78, 58, '猛擊', '單挑戰鬥中攻擊力大幅提升', { type: 'recruit' }),
    hero('lumeng', '呂蒙', 'wu', 4, 82, 85, 78, '奇襲荊州', '攻城戰中兵力損耗降低', { type: 'story', missionId: 'm10' }),
    hero('huanggai', '黃蓋', 'wu', 2, 79, 74, 55, '苦肉', '偽裝撤退後造成反擊傷害', { type: 'recruit' }),
    hero('lusu', '魯肅', 'wu', 3, 55, 80, 82, '聯盟', '與其他勢力交戰時減少資源損耗', { type: 'recruit' }),
    hero('sunshangxiang', '孫尚香', 'wu', 3, 85, 76, 66, '弓馬嫻熟', '弓騎兵造成的傷害提升', { type: 'recruit' }, 'f'),
    hero('zhoutai', '周泰', 'wu', 2, 86, 70, 45, '捨身', '守護主將，承受本應由主將承受的傷害', { type: 'recruit' })
  ];

  function heroDefById(id) { return HERO_DEFS.find((h) => h.id === id); }
  function heroDefsByFaction(factionId) { return HERO_DEFS.filter((h) => h.factionId === factionId); }

  window.Game.Data.HERO_DEFS = HERO_DEFS;
  window.Game.Data.heroDefById = heroDefById;
  window.Game.Data.heroDefsByFaction = heroDefsByFaction;
})();
