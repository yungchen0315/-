/* ============================================================================
 * missionDefs.js — 主線戰役／劇情任務靜態資料。每個勢力各有一套獨立的
 * 15 個關卡＋4 場史詩事件戰，劇情皆從該勢力自身視角出發。章節 1~3 陸續解鎖
 * 6 位「自家」武將；中後期章節雖然仍會描繪與其餘兩勢力的歷史大戰（官渡/
 * 赤壁/夷陵/合肥等），但純粹作為劇情帶入，只給資源與裝備，不再有「收服敵將」
 * 的劇情與武將獎勵——其餘勢力的武將一律只能透過酒館招募（抽獎）取得，且
 * 抽獎本身只會抽到玩家自己勢力的武將，因此每個存檔裡「別的勢力的武將」
 * 就只能改玩該勢力才能取得，不會有跨勢力collect的設計。
 * 每位玩家的過關進度屬於 MissionState（src/models/MissionState.js），
 * 不存在這裡。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} MissionEnemyDef
   * @property {string|null} heroId 敵方主將 id（劇情任務多半留空，由後續版本擴充）。
   * @property {string} name 敵軍番號顯示名稱。
   * @property {Object<string,number>} units 敵軍兵種組成。
   * @property {string} [factionId] 敵軍所屬勢力（僅在敵軍明確為蜀/魏/吳其中一方時填寫，
   *   供戰鬥動畫畫面決定敵方主帥的立繪配色；一般草寇/軍閥留空即可）。
   */

  /**
   * @typedef {Object} MissionRewardDef
   * @property {Object<string,number>} resources
   * @property {string|null} [unlockHeroId] 過關後解鎖的武將 id（僅限與此關卡同勢力的
   *   自家武將；絕不會是其他勢力的武將——那些一律只透過酒館招募取得）。
   * @property {string} [itemReward] 過關後獲得的裝備 id。
   * @property {number} [ingot] 過關後獲得的元寶（抽獎貨幣），史詩事件戰數量較高。
   */

  /**
   * @typedef {Object} MissionDef
   * @property {string} id 全域唯一，格式為 `<factionId>_m<序號>`。
   * @property {number} chapter
   * @property {string} name
   * @property {boolean} [epic] 是否為史詩事件戰（官渡/赤壁/夷陵等），UI 會特別標示。
   * @property {string} flavor 劇情敘述文字。
   * @property {MissionEnemyDef} enemy
   * @property {MissionRewardDef} reward
   * @property {string[]} requires 前置關卡 id 列表。
   */

  /** @type {MissionDef[]} 蜀漢戰役——劉備已是開局起始武將（原起始武將趙雲改為酒館招募取得），
   *  m1 不再重複解鎖劉備。 */
  const SHU_MISSIONS = [
    { id: 'shu_m1', chapter: 1, name: '桃園再會', flavor: '長坂坡外，趙雲單騎救主，殺出重圍，劉備自此決心成就大業。',
      enemy: { heroId: null, name: '曹軍游騎', units: { infantry: 20, cavalry: 10 } },
      reward: { resources: { food: 300, wood: 200 }, unlockHeroId: null, ingot: 30 }, requires: [] },
    { id: 'shu_m2', chapter: 1, name: '古城會', flavor: '張飛據守古城，疑心關羽變節，需以武力說明忠義。',
      enemy: { heroId: null, name: '蔡陽部', units: { infantry: 25, spearman: 10 } },
      reward: { resources: { wood: 300, stone: 150 }, unlockHeroId: 'zhangfei', ingot: 30 }, requires: ['shu_m1'] },
    { id: 'shu_m3', chapter: 1, name: '過五關斬六將', flavor: '關羽護送二位嫂嫂北返，沿途需連破數道關卡。',
      enemy: { heroId: null, name: '把關諸將', units: { infantry: 30, crossbowman: 15 } },
      reward: { resources: { gold: 250 }, unlockHeroId: 'guanyu', itemReward: 'sword_bronze_dragon', ingot: 40 }, requires: ['shu_m2'] },
    { id: 'shu_m4', chapter: 2, name: '隆中對', flavor: '三顧茅廬，求得諸葛亮獻上鼎足三分之策。',
      enemy: { heroId: null, name: '山寨土匪', units: { infantry: 15, cavalry: 10 } },
      reward: { resources: { food: 400, gold: 300 }, unlockHeroId: 'zhugeliang', itemReward: 'fan_feather', ingot: 40 }, requires: ['shu_m3'] },
    { id: 'shu_m5', chapter: 2, name: '入川之戰', flavor: '魏延獻計奇襲，助劉備奪取益州立足之地。',
      enemy: { heroId: null, name: '劉璋守軍', units: { infantry: 35, spearman: 20 } },
      reward: { resources: { stone: 350, gold: 200 }, unlockHeroId: 'weiyan', ingot: 40 }, requires: ['shu_m4'] },

    { id: 'shu_m6', chapter: 3, epic: true, name: '官渡之戰', flavor: '曹操以寡擊眾，奇襲烏巢糧倉，一舉扭轉北方局勢。',
      enemy: { heroId: null, name: '袁紹大軍', units: { infantry: 80, cavalry: 40, crossbowman: 20 } },
      reward: { resources: { food: 600, wood: 400, gold: 400 }, unlockHeroId: null, itemReward: 'armor_black_iron', ingot: 150 }, requires: ['shu_m5'] },
    { id: 'shu_m7', chapter: 3, name: '許都定策', flavor: '司馬懿與郭嘉先後獻策，助曹魏穩固中原根基。',
      enemy: { heroId: null, name: '流寇餘黨', units: { infantry: 40, cavalry: 20 } },
      reward: { resources: { gold: 350 }, unlockHeroId: null, ingot: 50 }, requires: ['shu_m6'] },

    { id: 'shu_m8', chapter: 4, name: '江東立業', flavor: '孫權承父兄之業，穩守江東，靜待天時。',
      enemy: { heroId: null, name: '山越叛軍', units: { infantry: 30, spearman: 15 } },
      reward: { resources: { food: 350, stone: 250 }, unlockHeroId: null, ingot: 40 }, requires: ['shu_m5'] },
    { id: 'shu_m9', chapter: 4, epic: true, name: '赤壁之戰', flavor: '周瑜黃蓋合演苦肉連環，一炬燒盡曹軍戰船。',
      enemy: { heroId: null, name: '曹軍水師', units: { infantry: 60, cavalry: 30, siege: 15 }, factionId: 'wei' },
      reward: { resources: { wood: 500, gold: 500 }, unlockHeroId: null, itemReward: 'incense_east_wind', ingot: 150 }, requires: ['shu_m8', 'shu_m6'] },
    { id: 'shu_m10', chapter: 5, epic: true, name: '夷陵之戰', flavor: '陸遜連營七百里，火燒劉備連營，蜀漢元氣大傷。',
      enemy: { heroId: null, name: '陸遜守軍', units: { infantry: 70, crossbowman: 30, siege: 10 }, factionId: 'wu' },
      reward: { resources: { gold: 600 }, unlockHeroId: null, itemReward: 'horse_hualiu', ingot: 150 }, requires: ['shu_m9'] },

    { id: 'shu_m11', chapter: 5, name: '七擒孟獲', flavor: '諸葛亮南征，七擒七縱，以德服人平定南中。',
      enemy: { heroId: null, name: '南蠻聯軍', units: { infantry: 50, cavalry: 25 } },
      reward: { resources: { food: 500, gold: 300 }, unlockHeroId: 'jiangwei', ingot: 60 }, requires: ['shu_m10'] },
    { id: 'shu_m12', chapter: 6, name: '六出祁山', flavor: '諸葛亮北伐中原，欲以攻代守，延續漢室氣運。',
      enemy: { heroId: null, name: '魏國邊軍', units: { infantry: 60, cavalry: 30, crossbowman: 20 }, factionId: 'wei' },
      reward: { resources: { stone: 400, gold: 350 }, unlockHeroId: null, ingot: 60 }, requires: ['shu_m11'] },
    { id: 'shu_m13', chapter: 6, name: '合肥之圍', flavor: '張遼威震江東，以少勝多守住合肥要地，天下局勢因此愈趨僵持。',
      enemy: { heroId: null, name: '吳軍前鋒', units: { infantry: 45, cavalry: 20 }, factionId: 'wu' },
      reward: { resources: { wood: 350, gold: 300 }, unlockHeroId: null, ingot: 60 }, requires: ['shu_m9'] },
    { id: 'shu_m14', chapter: 7, name: '荊州爭奪', flavor: '呂蒙奇襲荊州，三方勢力爲此戰略要地反覆交鋒。',
      enemy: { heroId: null, name: '荊州守軍', units: { infantry: 55, spearman: 25, siege: 10 }, factionId: 'wu' },
      reward: { resources: { gold: 450 }, unlockHeroId: null, ingot: 70 }, requires: ['shu_m13'] },
    { id: 'shu_m15', chapter: 7, epic: true, name: '天下歸一', flavor: '三分歸一的最終決戰，誰主天下就在此役。',
      enemy: { heroId: null, name: '聯合大軍', units: { infantry: 100, cavalry: 50, crossbowman: 30, siege: 20 } },
      reward: { resources: { food: 800, wood: 800, stone: 800, gold: 800 }, unlockHeroId: null, itemReward: 'jade_heshi', ingot: 300 }, requires: ['shu_m12', 'shu_m14'] }
  ];

  /** @type {MissionDef[]} 曹魏戰役——以曹操崛起、官渡定北方為主軸，中後期各場大戰皆只是
   *  劇情帶入的世界大事，不再附帶「收服敵將」的武將獎勵。 */
  const WEI_MISSIONS = [
    { id: 'wei_m1', chapter: 1, name: '陳留起兵', flavor: '曹操散盡家財，於陳留起兵討伐董卓，正式踏上爭雄之路。',
      enemy: { heroId: null, name: '董卓遊騎', units: { infantry: 20, cavalry: 10 } },
      reward: { resources: { food: 300, wood: 200 }, unlockHeroId: null, ingot: 30 }, requires: [] },
    { id: 'wei_m2', chapter: 1, name: '濮陽救主', flavor: '呂布奇襲濮陽，典韋捨命斷後，殺退追兵救回曹操。',
      enemy: { heroId: null, name: '呂布奇兵', units: { infantry: 25, spearman: 10 } },
      reward: { resources: { wood: 300, stone: 150 }, unlockHeroId: 'dianwei', ingot: 30 }, requires: ['wei_m1'] },
    { id: 'wei_m3', chapter: 1, name: '下邳擒呂布', flavor: '曹操會同劉備圍攻下邳，呂布兵敗被縛，麾下猛將張遼就此歸降。',
      enemy: { heroId: null, name: '呂布殘部', units: { infantry: 30, crossbowman: 15 } },
      reward: { resources: { gold: 250 }, unlockHeroId: 'zhangliao', itemReward: 'blade_double', ingot: 40 }, requires: ['wei_m2'] },
    { id: 'wei_m4', chapter: 2, name: '許都納賢', flavor: '郭嘉自袁紹處轉投曹操，獻策連連，深得倚重。',
      enemy: { heroId: null, name: '山寨遊寇', units: { infantry: 15, cavalry: 10 } },
      reward: { resources: { food: 400, gold: 300 }, unlockHeroId: 'guojia', itemReward: 'robe_scholar', ingot: 40 }, requires: ['wei_m3'] },
    { id: 'wei_m5', chapter: 2, name: '虎癡許褚', flavor: '許褚勇力過人，與典韋當眾比武不分勝負，曹操大喜，收為帳前護衛。',
      enemy: { heroId: null, name: '山賊悍卒', units: { infantry: 35, spearman: 20 } },
      reward: { resources: { stone: 350, gold: 200 }, unlockHeroId: 'xuchu', ingot: 40 }, requires: ['wei_m4'] },

    { id: 'wei_m6', chapter: 3, epic: true, name: '官渡之戰', flavor: '曹操奇襲烏巢，火燒袁紹糧草，以寡擊眾底定北方大局。',
      enemy: { heroId: null, name: '袁紹大軍', units: { infantry: 80, cavalry: 40, crossbowman: 20 } },
      reward: { resources: { food: 600, wood: 400, gold: 400 }, unlockHeroId: 'zhangjunyi', itemReward: 'armor_black_iron', ingot: 150 }, requires: ['wei_m5'] },
    { id: 'wei_m7', chapter: 3, name: '潼關之戰', flavor: '曹操親征關中，潼關一役大破馬超、韓遂聯軍，關中自此底定。',
      enemy: { heroId: null, name: '西涼鐵騎', units: { infantry: 40, cavalry: 20 } },
      reward: { resources: { gold: 350 }, unlockHeroId: null, ingot: 50 }, requires: ['wei_m6'] },

    { id: 'wei_m8', chapter: 4, name: '濡須對峙', flavor: '孫吳屢遣悍將襲擾濡須一線，魏軍嚴陣以待，終使敵軍無功而返。',
      enemy: { heroId: null, name: '江東水師', units: { infantry: 30, spearman: 15 }, factionId: 'wu' },
      reward: { resources: { food: 350, stone: 250 }, unlockHeroId: null, ingot: 40 }, requires: ['wei_m6'] },
    { id: 'wei_m9', chapter: 4, epic: true, name: '赤壁之戰', flavor: '大軍南征直逼江東，赤壁一役遭遇大火，被迫撤軍北返，暫緩一統之勢。',
      enemy: { heroId: null, name: '江東聯軍', units: { infantry: 60, cavalry: 30, siege: 15 }, factionId: 'wu' },
      reward: { resources: { wood: 500, gold: 500 }, unlockHeroId: null, itemReward: 'scroll_bingfa', ingot: 150 }, requires: ['wei_m8', 'wei_m6'] },
    { id: 'wei_m10', chapter: 5, epic: true, name: '合肥鏖兵', flavor: '張遼威震逍遙津，以八百精兵力挫孫權十萬大軍，江東從此不敢輕犯合肥。',
      enemy: { heroId: null, name: '孫吳精銳', units: { infantry: 70, crossbowman: 30, siege: 10 }, factionId: 'wu' },
      reward: { resources: { gold: 600 }, unlockHeroId: null, itemReward: 'bow_han', ingot: 150 }, requires: ['wei_m9'] },

    { id: 'wei_m11', chapter: 5, name: '定軍山後', flavor: '漢中一役雖折損夏侯淵，然魏軍穩住防線，蜀軍終未能長驅直入。',
      enemy: { heroId: null, name: '蜀漢殘部', units: { infantry: 50, cavalry: 25 }, factionId: 'shu' },
      reward: { resources: { food: 500, gold: 300 }, unlockHeroId: null, ingot: 60 }, requires: ['wei_m9'] },
    { id: 'wei_m12', chapter: 6, name: '劍閣阻敵', flavor: '蜀軍偏師犯境，魏軍嚴防劍閣一線，終將來犯之敵擊退。',
      enemy: { heroId: null, name: '蜀軍伏兵', units: { infantry: 60, cavalry: 30, crossbowman: 20 }, factionId: 'shu' },
      reward: { resources: { stone: 400, gold: 350 }, unlockHeroId: null, ingot: 60 }, requires: ['wei_m11'] },
    { id: 'wei_m13', chapter: 6, name: '劫糧奇襲', flavor: '蜀軍糧道遭魏軍游擊劫奪，後勤大亂，被迫暫緩攻勢。',
      enemy: { heroId: null, name: '蜀道劫糧隊', units: { infantry: 45, cavalry: 20 }, factionId: 'shu' },
      reward: { resources: { wood: 350, gold: 300 }, unlockHeroId: null, ingot: 60 }, requires: ['wei_m10'] },
    { id: 'wei_m14', chapter: 7, name: '江東細作', flavor: '曹軍細作深入江東刺探軍情，摸清水軍虛實，為日後再戰預作準備。',
      enemy: { heroId: null, name: '江東游騎', units: { infantry: 55, spearman: 25, siege: 10 }, factionId: 'wu' },
      reward: { resources: { gold: 450 }, unlockHeroId: null, ingot: 70 }, requires: ['wei_m13'] },
    { id: 'wei_m15', chapter: 7, epic: true, name: '普天歸魏', flavor: '三分歸一的最終決戰，誰主天下就在此役。',
      enemy: { heroId: null, name: '三國聯軍', units: { infantry: 100, cavalry: 50, crossbowman: 30, siege: 20 } },
      reward: { resources: { food: 800, wood: 800, stone: 800, gold: 800 }, unlockHeroId: null, itemReward: 'halberd_sky', ingot: 300 }, requires: ['wei_m12', 'wei_m14'] }
  ];

  /** @type {MissionDef[]} 東吳戰役——以江東基業、赤壁夷陵兩場立國之戰為主軸，中後期各場大戰
   *  皆只是劇情帶入的世界大事，不再附帶「收服敵將」的武將獎勵。 */
  const WU_MISSIONS = [
    { id: 'wu_m1', chapter: 1, name: '江東基業', flavor: '孫權承父兄之業，穩守江東，靜待天時。',
      enemy: { heroId: null, name: '山越叛軍', units: { infantry: 20, cavalry: 10 } },
      reward: { resources: { food: 300, wood: 200 }, unlockHeroId: null, ingot: 30 }, requires: [] },
    { id: 'wu_m2', chapter: 1, name: '神亭鬥將', flavor: '孫策與太史慈神亭嶺上一場惡鬥，終為其膽識折服，收歸帳下。',
      enemy: { heroId: null, name: '劉繇部曲', units: { infantry: 25, spearman: 10 } },
      reward: { resources: { wood: 300, stone: 150 }, unlockHeroId: 'taishici', ingot: 30 }, requires: ['wu_m1'] },
    { id: 'wu_m3', chapter: 1, name: '錦帆歸心', flavor: '甘寧率錦帆水賊歸附江東，屢立奇功。',
      enemy: { heroId: null, name: '黃祖水寨', units: { infantry: 30, crossbowman: 15 } },
      reward: { resources: { gold: 250 }, unlockHeroId: 'ganning', itemReward: 'bow_han', ingot: 40 }, requires: ['wu_m2'] },
    { id: 'wu_m4', chapter: 2, name: '邊境遊擊', flavor: '蜀漢遊騎屢屢襲擾邊境，江東守軍以逸待勞，將其擊退。',
      enemy: { heroId: null, name: '蜀軍游哨', units: { infantry: 15, cavalry: 10 }, factionId: 'shu' },
      reward: { resources: { food: 400, gold: 300 }, unlockHeroId: null, itemReward: 'horse_jueying', ingot: 40 }, requires: ['wu_m3'] },
    { id: 'wu_m5', chapter: 2, name: '荊州布防', flavor: '江東整頓荊州防務，鞏固長江中游門戶，擋下蜀軍試探。',
      enemy: { heroId: null, name: '荊州散兵', units: { infantry: 35, spearman: 20 }, factionId: 'shu' },
      reward: { resources: { stone: 350, gold: 200 }, unlockHeroId: null, ingot: 40 }, requires: ['wu_m4'] },

    { id: 'wu_m6', chapter: 3, epic: true, name: '赤壁之戰', flavor: '周瑜統帥聯軍，火燒赤壁，一舉擊潰曹操南征大軍，江東立國之基自此穩固。',
      enemy: { heroId: null, name: '曹軍水師', units: { infantry: 80, cavalry: 40, crossbowman: 20 }, factionId: 'wei' },
      reward: { resources: { food: 600, wood: 400, gold: 400 }, unlockHeroId: 'zhouyu', itemReward: 'incense_east_wind', ingot: 150 }, requires: ['wu_m5'] },
    { id: 'wu_m7', chapter: 3, name: '蜀道疑兵', flavor: '江東斥候深入蜀地刺探軍情，途中遭遇蜀軍伏擊，苦戰突圍而出。',
      enemy: { heroId: null, name: '蜀軍散卒', units: { infantry: 40, cavalry: 20 }, factionId: 'shu' },
      reward: { resources: { gold: 350 }, unlockHeroId: null, ingot: 50 }, requires: ['wu_m6'] },

    { id: 'wu_m8', chapter: 4, name: '糧道布局', flavor: '江東於荊蜀邊境布置眼線，掌握敵軍糧道動向，伺機而動。',
      enemy: { heroId: null, name: '蜀道守軍', units: { infantry: 30, spearman: 15 }, factionId: 'shu' },
      reward: { resources: { food: 350, stone: 250 }, unlockHeroId: null, ingot: 40 }, requires: ['wu_m6'] },
    { id: 'wu_m9', chapter: 4, epic: true, name: '白衣渡江', flavor: '呂蒙裝病麻痺關羽，白衣渡江奇襲荊州，一舉奪回失地。',
      enemy: { heroId: null, name: '荊州守軍', units: { infantry: 60, cavalry: 30, siege: 15 }, factionId: 'shu' },
      reward: { resources: { wood: 500, gold: 500 }, unlockHeroId: 'lumeng', itemReward: 'armor_silver_lion', ingot: 150 }, requires: ['wu_m8', 'wu_m6'] },
    { id: 'wu_m10', chapter: 5, epic: true, name: '夷陵之戰', flavor: '陸遜連營七百里，火燒劉備連營，蜀漢元氣大傷，江東由此三分鼎立。',
      enemy: { heroId: null, name: '蜀漢大軍', units: { infantry: 70, crossbowman: 30, siege: 10 }, factionId: 'shu' },
      reward: { resources: { gold: 600 }, unlockHeroId: 'luxun', itemReward: 'horse_hualiu', ingot: 150 }, requires: ['wu_m9'] },

    { id: 'wu_m11', chapter: 5, name: '淮南對峙', flavor: '江東與魏軍於淮南一線長期對峙，互有勝負，終佔上風。',
      enemy: { heroId: null, name: '魏軍游騎', units: { infantry: 50, cavalry: 25 }, factionId: 'wei' },
      reward: { resources: { food: 500, gold: 300 }, unlockHeroId: null, ingot: 60 }, requires: ['wu_m10'] },
    { id: 'wu_m12', chapter: 6, name: '水軍演練', flavor: '江東水軍演練有成，屢挫魏軍南征意圖，聲勢更盛。',
      enemy: { heroId: null, name: '魏軍精銳', units: { infantry: 60, cavalry: 30, crossbowman: 20 }, factionId: 'wei' },
      reward: { resources: { stone: 400, gold: 350 }, unlockHeroId: null, ingot: 60 }, requires: ['wu_m11'] },
    { id: 'wu_m13', chapter: 6, name: '細作交鋒', flavor: '魏國細作潛入江東刺探軍情，為孫吳暗探所識破，反遭挫敗。',
      enemy: { heroId: null, name: '魏軍使團護衛', units: { infantry: 45, cavalry: 20 }, factionId: 'wei' },
      reward: { resources: { wood: 350, gold: 300 }, unlockHeroId: null, ingot: 60 }, requires: ['wu_m10'] },
    { id: 'wu_m14', chapter: 7, name: '合肥再戰', flavor: '江東再攻合肥，雖未能奪城，仍重創魏軍守備，揚威淮南。',
      enemy: { heroId: null, name: '合肥守軍', units: { infantry: 55, spearman: 25, siege: 10 }, factionId: 'wei' },
      reward: { resources: { gold: 450 }, unlockHeroId: null, ingot: 70 }, requires: ['wu_m13'] },
    { id: 'wu_m15', chapter: 7, epic: true, name: '江東一統', flavor: '三分歸一的最終決戰，誰主天下就在此役。',
      enemy: { heroId: null, name: '三國聯軍', units: { infantry: 100, cavalry: 50, crossbowman: 30, siege: 20 } },
      reward: { resources: { food: 800, wood: 800, stone: 800, gold: 800 }, unlockHeroId: null, itemReward: 'horse_red_hare', ingot: 300 }, requires: ['wu_m12', 'wu_m14'] }
  ];

  /** @type {Object<string,MissionDef[]>} */
  const MISSION_DEFS_BY_FACTION = { shu: SHU_MISSIONS, wei: WEI_MISSIONS, wu: WU_MISSIONS };

  /** @returns {MissionDef[]} */
  function missionDefsForFaction(factionId) { return MISSION_DEFS_BY_FACTION[factionId] || []; }

  function missionDefById(id) {
    for (const factionId in MISSION_DEFS_BY_FACTION) {
      const found = MISSION_DEFS_BY_FACTION[factionId].find((m) => m.id === id);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * 純函式：給定某勢力「已完成關卡 id 列表」，回傳目前滿足前置條件、可挑戰的關卡。
   * 只依賴靜態的 requires 欄位，不觸碰任何 PlayerState，所以放在資料層即可。
   * @param {string} factionId
   * @param {string[]} completedMissionIds
   * @returns {MissionDef[]}
   */
  function missionsUnlockedFrom(factionId, completedMissionIds) {
    const done = new Set(completedMissionIds);
    return missionDefsForFaction(factionId).filter((m) => !done.has(m.id) && m.requires.every((r) => done.has(r)));
  }

  window.Game.Data.MISSION_DEFS_BY_FACTION = MISSION_DEFS_BY_FACTION;
  window.Game.Data.missionDefsForFaction = missionDefsForFaction;
  window.Game.Data.missionDefById = missionDefById;
  window.Game.Data.missionsUnlockedFrom = missionsUnlockedFrom;
})();
