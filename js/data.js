/* ============================================================================
 * data.js — 皇者天下（單機版）靜態資料表
 * 勢力 / 建築 / 兵種 / 武將 / 科技 / 戰役 全部定義於此，其餘模組只讀取不修改。
 * ==========================================================================*/

/* ---------------------------------------------------------------------- */
/* 勢力                                                                    */
/* ---------------------------------------------------------------------- */
const FACTIONS = [
  { id: 'shu', name: '蜀漢', short: '蜀', color: '#3aa15c', isPlayer: true,
    desc: '劉備一統天下的最後希望，兵少而將精，長於防守與奇襲。' },
  { id: 'wei', name: '魏', short: '魏', color: '#3a6bb0', isPlayer: false,
    desc: '曹氏根基最厚，地廣糧多，長於堂堂正正的國力壓制。' },
  { id: 'wu', name: '吳', short: '吳', color: '#c0392b', isPlayer: false,
    desc: '孫氏割據江東，長於水戰與快速擴張，善於見縫插針。' }
];

function factionById(id) { return FACTIONS.find((f) => f.id === id); }

/* ---------------------------------------------------------------------- */
/* 資源                                                                    */
/* ---------------------------------------------------------------------- */
const RESOURCE_TYPES = ['food', 'wood', 'stone', 'gold'];
const RESOURCE_NAMES = { food: '糧食', wood: '木材', stone: '石料', gold: '銀兩' };
const RESOURCE_ICONS = { food: '🌾', wood: '🪵', stone: '🪨', gold: '💰' };

/* ---------------------------------------------------------------------- */
/* 建築                                                                    */
/* 每種建築有 10 個等級，cost/time/effect 依等級遞增。                        */
/* level 索引從 1 開始（levels[0] 對應 1 級）。                              */
/* ---------------------------------------------------------------------- */

// 產生等級遞增數列：base * growth^(level-1)，四捨五入到最接近的 step
function scale(base, growth, level, step) {
  step = step || 1;
  const v = base * Math.pow(growth, level - 1);
  return Math.max(step, Math.round(v / step) * step);
}

function buildLevels(count, fn) {
  const levels = [];
  for (let lv = 1; lv <= count; lv++) levels.push(fn(lv));
  return levels;
}

const MAX_BUILDING_LEVEL = 10;

const BUILDINGS = {
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
  granary: {
    id: 'granary', name: '糧倉', icon: '🌾', category: 'economy',
    desc: '提升糧食每小時產量與存量上限。',
    levels: buildLevels(MAX_BUILDING_LEVEL, (lv) => ({
      level: lv,
      cost: { wood: scale(60, 1.5, lv, 5), stone: scale(20, 1.5, lv, 5) },
      timeMs: scale(60000, 1.35, lv),
      effect: { foodPerHour: scale(80, 1.3, lv, 5), storageCap: scale(1000, 1.4, lv, 50) }
    }))
  },
  sawmill: {
    id: 'sawmill', name: '伐木場', icon: '🪵', category: 'economy',
    desc: '提升木材每小時產量與存量上限。',
    levels: buildLevels(MAX_BUILDING_LEVEL, (lv) => ({
      level: lv,
      cost: { food: scale(60, 1.5, lv, 5), stone: scale(20, 1.5, lv, 5) },
      timeMs: scale(60000, 1.35, lv),
      effect: { woodPerHour: scale(80, 1.3, lv, 5), storageCap: scale(1000, 1.4, lv, 50) }
    }))
  },
  quarry: {
    id: 'quarry', name: '採石場', icon: '🪨', category: 'economy',
    desc: '提升石料每小時產量與存量上限。',
    levels: buildLevels(MAX_BUILDING_LEVEL, (lv) => ({
      level: lv,
      cost: { food: scale(60, 1.5, lv, 5), wood: scale(20, 1.5, lv, 5) },
      timeMs: scale(60000, 1.35, lv),
      effect: { stonePerHour: scale(60, 1.3, lv, 5), storageCap: scale(1000, 1.4, lv, 50) }
    }))
  },
  goldmine: {
    id: 'goldmine', name: '金礦', icon: '💰', category: 'economy',
    desc: '提升銀兩每小時產量與存量上限。',
    levels: buildLevels(MAX_BUILDING_LEVEL, (lv) => ({
      level: lv,
      cost: { wood: scale(80, 1.5, lv, 5), stone: scale(80, 1.5, lv, 5) },
      timeMs: scale(90000, 1.35, lv),
      effect: { goldPerHour: scale(40, 1.3, lv, 5), storageCap: scale(800, 1.4, lv, 50) }
    }))
  },
  warehouse: {
    id: 'warehouse', name: '倉庫', icon: '📦', category: 'economy',
    desc: '額外提升四種資源的存量上限，避免產出溢出浪費。',
    levels: buildLevels(MAX_BUILDING_LEVEL, (lv) => ({
      level: lv,
      cost: { wood: scale(100, 1.5, lv, 10), stone: scale(100, 1.5, lv, 10) },
      timeMs: scale(120000, 1.35, lv),
      effect: { storageCapAll: scale(500, 1.4, lv, 50) }
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
    desc: '武將於此登場──派遣說客劇情探訪或酒館偶遇，皆不使用抽卡機率。',
    levels: buildLevels(MAX_BUILDING_LEVEL, (lv) => ({
      level: lv,
      cost: { gold: scale(150, 1.5, lv, 10), food: scale(80, 1.5, lv, 10) },
      timeMs: scale(200000, 1.35, lv),
      effect: { exploreSlots: Math.min(3, 1 + Math.floor((lv - 1) / 4)), exploreSpeedMul: +(1 + 0.06 * (lv - 1)).toFixed(2) }
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

const BUILDING_IDS = Object.keys(BUILDINGS);
const BUILDING_ORDER = ['capital', 'granary', 'sawmill', 'quarry', 'goldmine', 'warehouse', 'barracks', 'drillground', 'workshop', 'tavern', 'academy', 'wall'];

function buildingDef(type) { return BUILDINGS[type]; }
function buildingLevelDef(type, level) {
  const def = BUILDINGS[type];
  if (!def) return null;
  return def.levels[Math.max(1, Math.min(def.levels.length, level)) - 1];
}

/* ---------------------------------------------------------------------- */
/* 兵種                                                                    */
/* ---------------------------------------------------------------------- */
const UNITS = {
  infantry:   { id: 'infantry',   name: '步兵',   icon: '🛡️', tier: 1, role: 'infantry',
                stats: { atk: 8,  def: 10, hp: 60,  speed: 4 }, upkeep: 1, leadership: 1,
                cost: { food: 30, wood: 15 }, trainTimeMs: 40000, trainedBy: 'barracks' },
  spearman:   { id: 'spearman',   name: '槍兵',   icon: '🔱', tier: 2, role: 'infantry',
                stats: { atk: 12, def: 8,  hp: 55,  speed: 4 }, upkeep: 1, leadership: 1,
                cost: { food: 35, wood: 25 }, trainTimeMs: 55000, trainedBy: 'barracks',
                counters: ['cavalry'] },
  crossbowman:{ id: 'crossbowman',name: '弩兵',   icon: '🏹', tier: 3, role: 'ranged',
                stats: { atk: 16, def: 4,  hp: 40,  speed: 4 }, upkeep: 2, leadership: 2,
                cost: { food: 30, wood: 40, gold: 10 }, trainTimeMs: 70000, trainedBy: 'barracks',
                counters: ['infantry'] },
  cavalry:    { id: 'cavalry',    name: '騎兵',   icon: '🐎', tier: 1, role: 'cavalry',
                stats: { atk: 14, def: 8,  hp: 70,  speed: 9 }, upkeep: 2, leadership: 2,
                cost: { food: 40, gold: 20 }, trainTimeMs: 60000, trainedBy: 'drillground',
                counters: ['ranged'] },
  horsearcher:{ id: 'horsearcher',name: '弓騎兵', icon: '🏇', tier: 3, role: 'cavalry',
                stats: { atk: 18, def: 5,  hp: 55,  speed: 10 }, upkeep: 3, leadership: 2,
                cost: { food: 45, gold: 35 }, trainTimeMs: 85000, trainedBy: 'drillground',
                counters: ['infantry'] },
  siege:      { id: 'siege',      name: '攻城車', icon: '🪤', tier: 2, role: 'siege',
                stats: { atk: 30, def: 3,  hp: 90,  speed: 2 }, upkeep: 4, leadership: 3,
                cost: { wood: 100, stone: 60, gold: 30 }, trainTimeMs: 150000, trainedBy: 'workshop',
                siegeBonusPct: 60 }
};
const UNIT_IDS = Object.keys(UNITS);

function unitDef(type) { return UNITS[type]; }

/* ---------------------------------------------------------------------- */
/* 武將                                                                    */
/* 全部透過劇情任務或地圖探索取得，不做抽卡機制。                              */
/* rarity: 2=一般 3=精良 4=名將 5=絕世                                       */
/* growth 影響升級時各屬性成長幅度。                                          */
/* ---------------------------------------------------------------------- */
function gen(id, name, faction, rarity, force, cmd, intel, skillName, skillDesc, source) {
  return {
    id, name, faction, rarity, source,
    baseStats: { force, cmd, intel },
    growth: +(0.9 + rarity * 0.12).toFixed(2),
    skill: { name: skillName, desc: skillDesc },
    portraitColor: rarity >= 5 ? '#d4af37' : rarity === 4 ? '#a15ec5' : rarity === 3 ? '#3a6bb0' : '#7a7a7a'
  };
}

const GENERALS = [
  gen('guanyu', '關羽', 'shu', 5, 97, 93, 75, '武聖', '出戰步兵/槍兵攻擊力大幅提升', { type: 'story', missionId: 'm3' }),
  gen('zhangfei', '張飛', 'shu', 5, 96, 78, 55, '咆哮', '戰鬥開始時使敵軍全體防禦力下降', { type: 'story', missionId: 'm2' }),
  gen('zhaoyun', '趙雲', 'shu', 5, 94, 90, 78, '龍膽', '所率部隊承受的傷害降低', { type: 'story', missionId: 'm1' }),
  gen('machao', '馬超', 'shu', 4, 95, 82, 60, '西涼鐵騎', '騎兵攻擊力提升', { type: 'explore', tileTag: 'xiliang' }),
  gen('huangzhong', '黃忠', 'shu', 4, 92, 79, 65, '百步穿楊', '弓騎兵/弩兵造成的傷害提升', { type: 'explore', tileTag: 'nanjun' }),
  gen('zhugeliang', '諸葛亮', 'shu', 5, 38, 92, 100, '奇謀', '戰鬥中我軍傷亡降低且獲得額外資源', { type: 'story', missionId: 'm4' }),
  gen('jiangwei', '姜維', 'shu', 3, 85, 80, 82, '繼志', '統率部隊在攻城戰中傷害提升', { type: 'explore', tileTag: 'tianshui' }),
  gen('weiyan', '魏延', 'shu', 3, 88, 79, 62, '奇襲', '主動進攻時首輪傷害提升', { type: 'story', missionId: 'm5' }),
  gen('pangtong', '龐統', 'shu', 4, 45, 85, 96, '連環', '戰鬥中削弱敵軍全體攻擊力', { type: 'story', missionId: 'm4' }),
  gen('liyan', '李嚴', 'shu', 2, 70, 68, 70, '治政', '主城資源產出小幅提升', { type: 'explore', tileTag: 'jiangzhou' }),

  gen('caocao', '曹操', 'wei', 5, 80, 96, 92, '梟雄', '全軍士氣與攻擊力提升', { type: 'story', missionId: 'm6' }),
  gen('simayi', '司馬懿', 'wei', 5, 70, 95, 97, '鷹視', '防守時大幅削弱敵軍攻擊力', { type: 'story', missionId: 'm7' }),
  gen('xiahoudun', '夏侯惇', 'wei', 4, 90, 82, 58, '拔矢', '受到致命傷害後短暫免疫死亡', { type: 'explore', tileTag: 'puyang' }),
  gen('zhangliao', '張遼', 'wei', 4, 91, 88, 68, '威震', '突襲敵軍時造成額外傷害', { type: 'explore', tileTag: 'hefei' }),
  gen('xuhuang', '徐晃', 'wei', 3, 87, 82, 64, '斷金', '對攻城器械造成額外傷害', { type: 'explore', tileTag: 'yangping' }),
  gen('dianwei', '典韋', 'wei', 3, 93, 70, 40, '惡來', '自身防禦力大幅提升', { type: 'story', missionId: 'm6' }),
  gen('xuchu', '許褚', 'wei', 3, 92, 68, 38, '虎癡', '所率部隊生命上限提升', { type: 'explore', tileTag: 'qiao' }),
  gen('guojia', '郭嘉', 'wei', 4, 40, 84, 95, '遺計', '戰前可預知敵軍配置並提升先攻', { type: 'story', missionId: 'm7' }),
  gen('zhangjunyi', '張郃', 'wei', 3, 86, 83, 63, '巧變', '地形不利時仍維持部隊戰力', { type: 'explore', tileTag: 'hanzhong' }),
  gen('caoren', '曹仁', 'wei', 2, 84, 78, 55, '堅守', '駐守城池時防禦力提升', { type: 'explore', tileTag: 'nanyang' }),

  gen('sunquan', '孫權', 'wu', 4, 68, 88, 80, '據江', '水域附近作戰時全軍戰力提升', { type: 'story', missionId: 'm8' }),
  gen('zhouyu', '周瑜', 'wu', 5, 71, 94, 93, '火攻', '戰鬥開始對敵軍造成一波火焰傷害', { type: 'story', missionId: 'm9' }),
  gen('luxun', '陸遜', 'wu', 5, 75, 92, 90, '連營', '反擊時造成的傷害大幅提升', { type: 'story', missionId: 'm10' }),
  gen('ganning', '甘寧', 'wu', 4, 90, 80, 60, '錦帆', '奇襲敵軍時速度與傷害提升', { type: 'explore', tileTag: 'jiangxia' }),
  gen('taishici', '太史慈', 'wu', 3, 89, 78, 58, '猛擊', '單挑戰鬥中攻擊力大幅提升', { type: 'explore', tileTag: 'shenting' }),
  gen('lumeng', '呂蒙', 'wu', 4, 82, 85, 78, '奇襲荊州', '攻城戰中兵力損耗降低', { type: 'story', missionId: 'm10' }),
  gen('huanggai', '黃蓋', 'wu', 2, 79, 74, 55, '苦肉', '偽裝撤退後造成反擊傷害', { type: 'explore', tileTag: 'chibi' }),
  gen('lusu', '魯肅', 'wu', 3, 55, 80, 82, '聯盟', '與其他勢力交戰時減少資源損耗', { type: 'explore', tileTag: 'luyang' }),
  gen('sunshangxiang', '孫尚香', 'wu', 3, 85, 76, 66, '弓馬嫻熟', '弓騎兵造成的傷害提升', { type: 'explore', tileTag: 'jianye' }),
  gen('zhoutai', '周泰', 'wu', 2, 86, 70, 45, '捨身', '守護主將，承受本應由主將承受的傷害', { type: 'explore', tileTag: 'yuzhang' })
];

function generalById(id) { return GENERALS.find((g) => g.id === id); }
function generalsByFaction(factionId) { return GENERALS.filter((g) => g.faction === factionId); }

/* ---------------------------------------------------------------------- */
/* 科技樹                                                                  */
/* ---------------------------------------------------------------------- */
const TECHS = [
  { id: 'farming1', name: '農耕術·一', category: 'economy', tier: 1, timeMs: 3 * 60000,
    cost: { food: 200, wood: 100 }, effect: { foodPerHourPct: 10 }, requires: [] },
  { id: 'farming2', name: '農耕術·二', category: 'economy', tier: 2, timeMs: 8 * 60000,
    cost: { food: 500, wood: 200, gold: 100 }, effect: { foodPerHourPct: 15 }, requires: ['farming1'] },
  { id: 'forestry1', name: '伐木術·一', category: 'economy', tier: 1, timeMs: 3 * 60000,
    cost: { food: 100, wood: 200 }, effect: { woodPerHourPct: 10 }, requires: [] },
  { id: 'forestry2', name: '伐木術·二', category: 'economy', tier: 2, timeMs: 8 * 60000,
    cost: { food: 200, wood: 500, gold: 100 }, effect: { woodPerHourPct: 15 }, requires: ['forestry1'] },
  { id: 'mining1', name: '採礦術·一', category: 'economy', tier: 1, timeMs: 4 * 60000,
    cost: { wood: 150, stone: 150 }, effect: { stonePerHourPct: 10, goldPerHourPct: 5 }, requires: [] },
  { id: 'commerce1', name: '通商術·一', category: 'economy', tier: 2, timeMs: 6 * 60000,
    cost: { stone: 200, gold: 200 }, effect: { goldPerHourPct: 15 }, requires: ['mining1'] },
  { id: 'storage1', name: '倉儲術·一', category: 'economy', tier: 1, timeMs: 5 * 60000,
    cost: { wood: 200, stone: 200 }, effect: { storageCapAllPct: 15 }, requires: [] },

  { id: 'blades1', name: '鍛刃術·一', category: 'military', tier: 1, timeMs: 5 * 60000,
    cost: { wood: 150, gold: 100 }, effect: { infantryAtkPct: 8 }, requires: [] },
  { id: 'blades2', name: '鍛刃術·二', category: 'military', tier: 2, timeMs: 10 * 60000,
    cost: { wood: 300, gold: 250 }, effect: { infantryAtkPct: 10 }, requires: ['blades1'] },
  { id: 'horsemanship1', name: '騎術·一', category: 'military', tier: 1, timeMs: 5 * 60000,
    cost: { food: 150, gold: 100 }, effect: { cavalryAtkPct: 8 }, requires: [] },
  { id: 'archery1', name: '弓術·一', category: 'military', tier: 1, timeMs: 5 * 60000,
    cost: { wood: 150, gold: 100 }, effect: { rangedAtkPct: 8 }, requires: [] },
  { id: 'siegecraft1', name: '器械術·一', category: 'military', tier: 2, timeMs: 12 * 60000,
    cost: { wood: 400, stone: 300 }, effect: { siegeAtkPct: 15 }, requires: ['blades1'] },
  { id: 'training1', name: '練兵術·一', category: 'military', tier: 1, timeMs: 6 * 60000,
    cost: { food: 200, gold: 150 }, effect: { trainSpeedPct: 10 }, requires: [] },
  { id: 'armor1', name: '護甲術·一', category: 'military', tier: 1, timeMs: 6 * 60000,
    cost: { stone: 200, gold: 100 }, effect: { allDefPct: 8 }, requires: [] },

  { id: 'masonry1', name: '築城術·一', category: 'city', tier: 1, timeMs: 6 * 60000,
    cost: { stone: 250, wood: 100 }, effect: { wallDefPct: 10 }, requires: [] },
  { id: 'masonry2', name: '築城術·二', category: 'city', tier: 3, timeMs: 15 * 60000,
    cost: { stone: 600, gold: 300 }, effect: { wallDefPct: 15 }, requires: ['masonry1'] },
  { id: 'scouting1', name: '探查術·一', category: 'city', tier: 1, timeMs: 4 * 60000,
    cost: { food: 100, gold: 100 }, effect: { exploreSpeedPct: 15 }, requires: [] }
];

function techById(id) { return TECHS.find((t) => t.id === id); }

/* ---------------------------------------------------------------------- */
/* 戰役／劇情任務                                                            */
/* 10~15 個主線關卡 + 官渡/赤壁/夷陵 三場史詩事件戰                            */
/* enemy 為對手武將 id + 兵力組成，供戰鬥結算用。                              */
/* ---------------------------------------------------------------------- */
const CAMPAIGNS = [
  { id: 'm1', chapter: 1, name: '桃園再會', flavor: '長坂坡外，趙雲單騎救主，殺出重圍。',
    enemy: { generalId: null, name: '曹軍游騎', units: { infantry: 20, cavalry: 10 } },
    reward: { resources: { food: 300, wood: 200 }, unlockGeneral: 'zhaoyun' }, requires: [] },
  { id: 'm2', chapter: 1, name: '古城會', flavor: '張飛據守古城，疑心關羽變節，需以武力說明忠義。',
    enemy: { generalId: null, name: '蔡陽部', units: { infantry: 25, spearman: 10 } },
    reward: { resources: { wood: 300, stone: 150 }, unlockGeneral: 'zhangfei' }, requires: ['m1'] },
  { id: 'm3', chapter: 1, name: '過五關斬六將', flavor: '關羽護送二位嫂嫂北返，沿途需連破數道關卡。',
    enemy: { generalId: null, name: '把關諸將', units: { infantry: 30, crossbowman: 15 } },
    reward: { resources: { gold: 250 }, unlockGeneral: 'guanyu', itemReward: 'sword_bronze_dragon' }, requires: ['m2'] },
  { id: 'm4', chapter: 2, name: '隆中對', flavor: '三顧茅廬，求得諸葛亮、龐統獻上鼎足三分之策。',
    enemy: { generalId: null, name: '山寨土匪', units: { infantry: 15, cavalry: 10 } },
    reward: { resources: { food: 400, gold: 300 }, unlockGeneral: 'zhugeliang', itemReward: 'fan_feather' }, requires: ['m3'] },
  { id: 'm5', chapter: 2, name: '入川之戰', flavor: '魏延獻計奇襲，助劉備奪取益州立足之地。',
    enemy: { generalId: null, name: '劉璋守軍', units: { infantry: 35, spearman: 20 } },
    reward: { resources: { stone: 350, gold: 200 }, unlockGeneral: 'weiyan' }, requires: ['m4'] },

  { id: 'm6', chapter: 3, name: '官渡之戰', epic: true, flavor: '曹操以寡擊眾，奇襲烏巢糧倉，一舉扭轉北方局勢。',
    enemy: { generalId: null, name: '袁紹大軍', units: { infantry: 80, cavalry: 40, crossbowman: 20 } },
    reward: { resources: { food: 600, wood: 400, gold: 400 }, unlockGeneral: 'dianwei', itemReward: 'armor_black_iron' }, requires: ['m5'] },
  { id: 'm7', chapter: 3, name: '許都定策', flavor: '司馬懿與郭嘉先後獻策，助曹魏穩固中原根基。',
    enemy: { generalId: null, name: '流寇餘黨', units: { infantry: 40, cavalry: 20 } },
    reward: { resources: { gold: 350 }, unlockGeneral: 'simayi' }, requires: ['m6'] },

  { id: 'm8', chapter: 4, name: '江東立業', flavor: '孫權承父兄之業，穩守江東，靜待天時。',
    enemy: { generalId: null, name: '山越叛軍', units: { infantry: 30, spearman: 15 } },
    reward: { resources: { food: 350, stone: 250 }, unlockGeneral: 'sunquan' }, requires: ['m5'] },
  { id: 'm9', chapter: 4, name: '赤壁之戰', epic: true, flavor: '周瑜黃蓋合演苦肉連環，一炬燒盡曹軍戰船。',
    enemy: { generalId: null, name: '曹軍水師', units: { infantry: 60, cavalry: 30, siege: 15 } },
    reward: { resources: { wood: 500, gold: 500 }, unlockGeneral: 'zhouyu', itemReward: 'incense_east_wind' }, requires: ['m8', 'm6'] },
  { id: 'm10', chapter: 5, name: '夷陵之戰', epic: true, flavor: '陸遜連營七百里，火燒劉備連營，蜀漢元氣大傷。',
    enemy: { generalId: null, name: '陸遜守軍', units: { infantry: 70, crossbowman: 30, siege: 10 } },
    reward: { resources: { gold: 600 }, unlockGeneral: 'luxun', itemReward: 'horse_hualiu' }, requires: ['m9'] },

  { id: 'm11', chapter: 5, name: '七擒孟獲', flavor: '諸葛亮南征，七擒七縱，以德服人平定南中。',
    enemy: { generalId: null, name: '南蠻聯軍', units: { infantry: 50, cavalry: 25 } },
    reward: { resources: { food: 500, gold: 300 }, unlockGeneral: 'jiangwei' }, requires: ['m10'] },
  { id: 'm12', chapter: 6, name: '六出祁山', flavor: '諸葛亮北伐中原，欲以攻代守，延續漢室氣運。',
    enemy: { generalId: null, name: '魏國邊軍', units: { infantry: 60, cavalry: 30, crossbowman: 20 } },
    reward: { resources: { stone: 400, gold: 350 }, unlockGeneral: 'zhangjunyi' }, requires: ['m11'] },
  { id: 'm13', chapter: 6, name: '合肥之圍', flavor: '張遼威震江東，以少勝多守住合肥要地。',
    enemy: { generalId: null, name: '吳軍前鋒', units: { infantry: 45, cavalry: 20 } },
    reward: { resources: { wood: 350, gold: 300 }, unlockGeneral: 'zhangliao' }, requires: ['m9'] },
  { id: 'm14', chapter: 7, name: '荊州爭奪', flavor: '呂蒙奇襲荊州，三方勢力爲此戰略要地反覆交鋒。',
    enemy: { generalId: null, name: '荊州守軍', units: { infantry: 55, spearman: 25, siege: 10 } },
    reward: { resources: { gold: 450 }, unlockGeneral: 'lumeng' }, requires: ['m13'] },
  { id: 'm15', chapter: 7, name: '天下歸一', epic: true, flavor: '三分歸一的最終決戰，誰主天下就在此役。',
    enemy: { generalId: null, name: '聯合大軍', units: { infantry: 100, cavalry: 50, crossbowman: 30, siege: 20 } },
    reward: { resources: { food: 800, wood: 800, stone: 800, gold: 800 }, unlockGeneral: null, itemReward: 'jade_heshi' }, requires: ['m12', 'm14'] }
];

function campaignById(id) { return CAMPAIGNS.find((c) => c.id === id); }
function campaignsUnlocked(completedIds) {
  const done = new Set(completedIds);
  return CAMPAIGNS.filter((c) => !done.has(c.id) && c.requires.every((r) => done.has(r)));
}

/* ---------------------------------------------------------------------- */
/* 世界地圖設定                                                             */
/* ---------------------------------------------------------------------- */
const MAP_CONFIG = {
  width: 17,
  height: 17,
  tileSize: 64
};

// 地圖上可探索的野外據點（供武將 explore 來源與資源點使用）
const EXPLORE_TILES = [
  { tag: 'xiliang', name: '西涼', kind: 'general' },
  { tag: 'nanjun', name: '南郡', kind: 'general' },
  { tag: 'tianshui', name: '天水', kind: 'general' },
  { tag: 'jiangzhou', name: '江州', kind: 'general' },
  { tag: 'puyang', name: '濮陽', kind: 'general' },
  { tag: 'hefei', name: '合肥', kind: 'general' },
  { tag: 'yangping', name: '陽平關', kind: 'general' },
  { tag: 'qiao', name: '譙郡', kind: 'general' },
  { tag: 'hanzhong', name: '漢中', kind: 'general' },
  { tag: 'nanyang', name: '南陽', kind: 'general' },
  { tag: 'jiangxia', name: '江夏', kind: 'general' },
  { tag: 'shenting', name: '神亭', kind: 'general' },
  { tag: 'chibi', name: '赤壁', kind: 'general' },
  { tag: 'luyang', name: '蘆陽', kind: 'general' },
  { tag: 'jianye', name: '建業', kind: 'general' },
  { tag: 'yuzhang', name: '豫章', kind: 'general' }
];

function exploreTileByTag(tag) { return EXPLORE_TILES.find((t) => t.tag === tag); }

/* ---------------------------------------------------------------------- */
/* 武將裝備（武器／甲冑／坐騎／寶物）                                          */
/* 皆透過戰役獎勵或擊破野外據點取得，同樣不涉及任何抽卡機率。                    */
/* ---------------------------------------------------------------------- */
const ITEMS = [
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

function itemById(id) { return ITEMS.find((i) => i.id === id); }
const ITEM_SLOTS = ['weapon', 'armor', 'mount', 'accessory'];

/* ---------------------------------------------------------------------- */
/* 隨機事件（取代伺服器活動，離線時會依到期時間自動以中性結果解決）              */
/* ---------------------------------------------------------------------- */
const EVENT_TYPES = [
  { id: 'caravan', name: '商隊經過', flavor: '一支商隊路經城郊，願以優惠價格交換物資。',
    windowMs: 15 * 60000, resolveMs: 30 * 60000,
    resolve: (faction) => ({ resources: { gold: randomInt(80, 200) } }) },
  { id: 'refugees', name: '流民歸附', flavor: '戰亂流民扶老攜幼而來，盼能在城中安身。',
    windowMs: 15 * 60000, resolveMs: 30 * 60000,
    resolve: (faction) => ({ resources: { food: randomInt(100, 250) } }) },
  { id: 'bandit_raid', name: '山賊襲擾', flavor: '一股山賊夜襲糧道，需即刻調兵驅逐。',
    windowMs: 10 * 60000, resolveMs: 20 * 60000,
    resolve: (faction) => ({ resources: { wood: -randomInt(20, 60) } }) },
  { id: 'good_harvest', name: '豐收之年', flavor: '風調雨順，今年田畝收成格外豐足。',
    windowMs: 20 * 60000, resolveMs: 40 * 60000,
    resolve: (faction) => ({ resources: { food: randomInt(150, 300) } }) },
  { id: 'old_smith', name: '老鐵匠獻寶', flavor: '一位隱居的老鐵匠感念仁德，願獻上舊藏兵器。',
    windowMs: 20 * 60000, resolveMs: 40 * 60000,
    resolve: (faction) => ({ resources: { stone: randomInt(80, 180) } }) }
];

function eventTypeById(id) { return EVENT_TYPES.find((e) => e.id === id); }

/* ---------------------------------------------------------------------- */
/* 成就                                                                    */
/* ---------------------------------------------------------------------- */
const ACHIEVEMENTS = [
  { id: 'first_upgrade', name: '基業初立', desc: '完成一次建築升級', reward: { resources: { gold: 100 } },
    check: (f) => BUILDING_ORDER.some((t) => f.buildings[t].level >= 2) },
  { id: 'capital5', name: '固若金湯', desc: '主城升級至 5 級', reward: { resources: { gold: 400, stone: 300 } },
    check: (f) => f.buildings.capital.level >= 5 },
  { id: 'capital10', name: '王城巍峨', desc: '主城升級至 10 級', reward: { resources: { gold: 1500 } },
    check: (f) => f.buildings.capital.level >= 10 },
  { id: 'five_generals', name: '五虎齊聚', desc: '擁有至少 5 名武將', reward: { resources: { gold: 300 } },
    check: (f) => f.generals.length >= 5 },
  { id: 'ten_generals', name: '猛將如雲', desc: '擁有至少 10 名武將', reward: { resources: { gold: 600 } },
    check: (f) => f.generals.length >= 10 },
  { id: 'general_lv10', name: '身經百戰', desc: '任一武將等級達到 10', reward: { resources: { food: 300, wood: 300 } },
    check: (f) => f.generals.some((g) => g.level >= 10) },
  { id: 'first_win', name: '初戰告捷', desc: '取得第一次戰鬥勝利', reward: { resources: { gold: 150 } },
    check: (f) => f.battleReports.some((r) => r.outcome === 'win') },
  { id: 'ten_wins', name: '百戰百勝', desc: '累計取得 10 次戰鬥勝利', reward: { resources: { gold: 500 } },
    check: (f) => f.battleReports.filter((r) => r.outcome === 'win').length >= 10 },
  { id: 'five_missions', name: '初露鋒芒', desc: '完成 5 個主線戰役關卡', reward: { resources: { gold: 400 } },
    check: (f, state) => state.campaignProgress.completedIds.length >= 5 },
  { id: 'all_missions', name: '天下歸一', desc: '完成全部主線戰役關卡', reward: { resources: { gold: 2000, food: 1000, wood: 1000, stone: 1000 } },
    check: (f, state) => state.campaignProgress.completedIds.length >= CAMPAIGNS.length },
  { id: 'first_item', name: '寶物初現', desc: '取得第一件裝備', reward: { resources: { gold: 150 } },
    check: (f) => (f.inventory && Object.values(f.inventory).some((qty) => qty > 0)) ||
      f.generals.some((g) => g.equipment && Object.values(g.equipment).some(Boolean)) },
  { id: 'full_equip', name: '披堅執銳', desc: '讓任一武將裝備滿四個部位', reward: { resources: { gold: 500 } },
    check: (f) => f.generals.some((g) => g.equipment && ITEM_SLOTS.every((s) => g.equipment[s])) }
];

function achievementById(id) { return ACHIEVEMENTS.find((a) => a.id === id); }
