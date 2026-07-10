/* ============================================================================
 * missionDefs.js — 主線戰役／劇情任務靜態資料。10~15 個關卡＋官渡/赤壁/夷陵
 * 三場史詩事件戰。每位玩家的過關進度屬於 MissionState
 * （src/models/MissionState.js），不存在這裡。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} MissionEnemyDef
   * @property {string|null} heroId 敵方主將 id（劇情任務多半留空，由後續版本擴充）。
   * @property {string} name 敵軍番號顯示名稱。
   * @property {Object<string,number>} units 敵軍兵種組成。
   */

  /**
   * @typedef {Object} MissionRewardDef
   * @property {Object<string,number>} resources
   * @property {string|null} [unlockHeroId] 過關後解鎖的武將 id。
   * @property {string} [itemReward] 過關後獲得的裝備 id。
   */

  /**
   * @typedef {Object} MissionDef
   * @property {string} id
   * @property {number} chapter
   * @property {string} name
   * @property {boolean} [epic] 是否為史詩事件戰（官渡/赤壁/夷陵等），UI 會特別標示。
   * @property {string} flavor 劇情敘述文字。
   * @property {MissionEnemyDef} enemy
   * @property {MissionRewardDef} reward
   * @property {string[]} requires 前置關卡 id 列表。
   */

  /** @type {MissionDef[]} */
  const MISSION_DEFS = [
    { id: 'm1', chapter: 1, name: '桃園再會', flavor: '長坂坡外，趙雲單騎救主，殺出重圍。',
      enemy: { heroId: null, name: '曹軍游騎', units: { infantry: 20, cavalry: 10 } },
      reward: { resources: { food: 300, wood: 200 }, unlockHeroId: 'zhaoyun' }, requires: [] },
    { id: 'm2', chapter: 1, name: '古城會', flavor: '張飛據守古城，疑心關羽變節，需以武力說明忠義。',
      enemy: { heroId: null, name: '蔡陽部', units: { infantry: 25, spearman: 10 } },
      reward: { resources: { wood: 300, stone: 150 }, unlockHeroId: 'zhangfei' }, requires: ['m1'] },
    { id: 'm3', chapter: 1, name: '過五關斬六將', flavor: '關羽護送二位嫂嫂北返，沿途需連破數道關卡。',
      enemy: { heroId: null, name: '把關諸將', units: { infantry: 30, crossbowman: 15 } },
      reward: { resources: { gold: 250 }, unlockHeroId: 'guanyu', itemReward: 'sword_bronze_dragon' }, requires: ['m2'] },
    { id: 'm4', chapter: 2, name: '隆中對', flavor: '三顧茅廬，求得諸葛亮、龐統獻上鼎足三分之策。',
      enemy: { heroId: null, name: '山寨土匪', units: { infantry: 15, cavalry: 10 } },
      reward: { resources: { food: 400, gold: 300 }, unlockHeroId: 'zhugeliang', itemReward: 'fan_feather' }, requires: ['m3'] },
    { id: 'm5', chapter: 2, name: '入川之戰', flavor: '魏延獻計奇襲，助劉備奪取益州立足之地。',
      enemy: { heroId: null, name: '劉璋守軍', units: { infantry: 35, spearman: 20 } },
      reward: { resources: { stone: 350, gold: 200 }, unlockHeroId: 'weiyan' }, requires: ['m4'] },

    { id: 'm6', chapter: 3, name: '官渡之戰', epic: true, flavor: '曹操以寡擊眾，奇襲烏巢糧倉，一舉扭轉北方局勢。',
      enemy: { heroId: null, name: '袁紹大軍', units: { infantry: 80, cavalry: 40, crossbowman: 20 } },
      reward: { resources: { food: 600, wood: 400, gold: 400 }, unlockHeroId: 'dianwei', itemReward: 'armor_black_iron' }, requires: ['m5'] },
    { id: 'm7', chapter: 3, name: '許都定策', flavor: '司馬懿與郭嘉先後獻策，助曹魏穩固中原根基。',
      enemy: { heroId: null, name: '流寇餘黨', units: { infantry: 40, cavalry: 20 } },
      reward: { resources: { gold: 350 }, unlockHeroId: 'simayi' }, requires: ['m6'] },

    { id: 'm8', chapter: 4, name: '江東立業', flavor: '孫權承父兄之業，穩守江東，靜待天時。',
      enemy: { heroId: null, name: '山越叛軍', units: { infantry: 30, spearman: 15 } },
      reward: { resources: { food: 350, stone: 250 }, unlockHeroId: 'sunquan' }, requires: ['m5'] },
    { id: 'm9', chapter: 4, name: '赤壁之戰', epic: true, flavor: '周瑜黃蓋合演苦肉連環，一炬燒盡曹軍戰船。',
      enemy: { heroId: null, name: '曹軍水師', units: { infantry: 60, cavalry: 30, siege: 15 } },
      reward: { resources: { wood: 500, gold: 500 }, unlockHeroId: 'zhouyu', itemReward: 'incense_east_wind' }, requires: ['m8', 'm6'] },
    { id: 'm10', chapter: 5, name: '夷陵之戰', epic: true, flavor: '陸遜連營七百里，火燒劉備連營，蜀漢元氣大傷。',
      enemy: { heroId: null, name: '陸遜守軍', units: { infantry: 70, crossbowman: 30, siege: 10 } },
      reward: { resources: { gold: 600 }, unlockHeroId: 'luxun', itemReward: 'horse_hualiu' }, requires: ['m9'] },

    { id: 'm11', chapter: 5, name: '七擒孟獲', flavor: '諸葛亮南征，七擒七縱，以德服人平定南中。',
      enemy: { heroId: null, name: '南蠻聯軍', units: { infantry: 50, cavalry: 25 } },
      reward: { resources: { food: 500, gold: 300 }, unlockHeroId: 'jiangwei' }, requires: ['m10'] },
    { id: 'm12', chapter: 6, name: '六出祁山', flavor: '諸葛亮北伐中原，欲以攻代守，延續漢室氣運。',
      enemy: { heroId: null, name: '魏國邊軍', units: { infantry: 60, cavalry: 30, crossbowman: 20 } },
      reward: { resources: { stone: 400, gold: 350 }, unlockHeroId: 'zhangjunyi' }, requires: ['m11'] },
    { id: 'm13', chapter: 6, name: '合肥之圍', flavor: '張遼威震江東，以少勝多守住合肥要地。',
      enemy: { heroId: null, name: '吳軍前鋒', units: { infantry: 45, cavalry: 20 } },
      reward: { resources: { wood: 350, gold: 300 }, unlockHeroId: 'zhangliao' }, requires: ['m9'] },
    { id: 'm14', chapter: 7, name: '荊州爭奪', flavor: '呂蒙奇襲荊州，三方勢力爲此戰略要地反覆交鋒。',
      enemy: { heroId: null, name: '荊州守軍', units: { infantry: 55, spearman: 25, siege: 10 } },
      reward: { resources: { gold: 450 }, unlockHeroId: 'lumeng' }, requires: ['m13'] },
    { id: 'm15', chapter: 7, name: '天下歸一', epic: true, flavor: '三分歸一的最終決戰，誰主天下就在此役。',
      enemy: { heroId: null, name: '聯合大軍', units: { infantry: 100, cavalry: 50, crossbowman: 30, siege: 20 } },
      reward: { resources: { food: 800, wood: 800, stone: 800, gold: 800 }, unlockHeroId: null, itemReward: 'jade_heshi' }, requires: ['m12', 'm14'] }
  ];

  function missionDefById(id) { return MISSION_DEFS.find((m) => m.id === id); }

  /**
   * 純函式：給定「已完成關卡 id 列表」，回傳目前滿足前置條件、可挑戰的關卡。
   * 只依賴靜態的 requires 欄位，不觸碰任何 PlayerState，所以放在資料層即可。
   * @param {string[]} completedMissionIds
   * @returns {MissionDef[]}
   */
  function missionsUnlockedFrom(completedMissionIds) {
    const done = new Set(completedMissionIds);
    return MISSION_DEFS.filter((m) => !done.has(m.id) && m.requires.every((r) => done.has(r)));
  }

  window.Game.Data.MISSION_DEFS = MISSION_DEFS;
  window.Game.Data.missionDefById = missionDefById;
  window.Game.Data.missionsUnlockedFrom = missionsUnlockedFrom;
})();
