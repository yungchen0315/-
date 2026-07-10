/* ============================================================================
 * state.js — 遊戲狀態的建立、初始化與時間推進（含離線進度追趕）。
 * 所有長時間機制（建造/練兵/研究/探索/行軍）都採用絕對時間戳 completeAt，
 * 因此離線追趕只需要在載入時執行一次 advanceTime(state, Date.now())。
 * ==========================================================================*/

const SAVE_VERSION = 1;

/* ---------------------------------------------------------------------- */
/* 世界地圖生成                                                             */
/* ---------------------------------------------------------------------- */
function tileKey(x, y) { return x + '_' + y; }

function generateWorld() {
  const w = MAP_CONFIG.width, h = MAP_CONFIG.height;
  const tiles = {};
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      tiles[tileKey(x, y)] = { id: tileKey(x, y), x, y, type: 'empty' };
    }
  }

  // 3 個勢力主城置於地圖三個角落附近，保留足夠邊距。
  const capitalSpots = [
    { x: 2, y: 2 },
    { x: w - 3, y: 2 },
    { x: Math.floor(w / 2), y: h - 3 }
  ];
  FACTIONS.forEach((f, i) => {
    const spot = capitalSpots[i];
    const t = tiles[tileKey(spot.x, spot.y)];
    t.type = 'capital';
    t.ownerId = f.id;
    t.name = f.name + '主城';
  });

  // 資源點（可派兵駐守的野外採集點，打贏守軍後獲得一次性資源獎勵並進入冷卻）。
  const resourcePool = ['wood', 'stone', 'gold', 'food'];
  let resourceCount = 0;
  let monsterCount = 0;
  let exploreIdx = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = tiles[tileKey(x, y)];
      if (t.type !== 'empty') continue;
      const nearCapital = capitalSpots.some((c) => Math.abs(c.x - x) <= 1 && Math.abs(c.y - y) <= 1);
      if (nearCapital) continue;
      const roll = Math.random();
      if (roll < 0.12 && resourceCount < 18) {
        t.type = 'resource';
        t.resourceType = resourcePool[resourceCount % resourcePool.length];
        t.guardPower = randomInt(40, 160);
        t.name = RESOURCE_NAMES[t.resourceType] + '礦點';
        t.cooldownUntil = 0;
        resourceCount++;
      } else if (roll < 0.18 && monsterCount < 14) {
        t.type = 'monster';
        t.guardPower = randomInt(80, 300);
        t.name = '野外賊寇';
        t.cooldownUntil = 0;
        monsterCount++;
      } else if (roll < 0.20 && exploreIdx < EXPLORE_TILES.length) {
        // 探索據點僅作地圖上的視覺標記，實際探索透過酒館介面觸發（見 generals.js）。
        const info = EXPLORE_TILES[exploreIdx];
        t.type = 'landmark';
        t.name = info.name;
        t.tag = info.tag;
        exploreIdx++;
      }
    }
  }
  return { w, h, tiles };
}

function tileAt(world, x, y) { return world.tiles[tileKey(x, y)]; }
function capitalTileOf(world, factionId) {
  return Object.values(world.tiles).find((t) => t.type === 'capital' && t.ownerId === factionId);
}

/* ---------------------------------------------------------------------- */
/* 勢力狀態初始化                                                            */
/* ---------------------------------------------------------------------- */
function createFactionState(factionDef, world) {
  const buildings = {};
  BUILDING_ORDER.forEach((type) => {
    buildings[type] = { level: type === 'capital' ? 1 : 0 };
  });
  buildings.granary.level = 1;
  buildings.sawmill.level = 1;
  buildings.quarry.level = 1;
  buildings.barracks.level = 1;

  const capTile = capitalTileOf(world, factionDef.id);

  return {
    id: factionDef.id,
    isPlayer: !!factionDef.isPlayer,
    resources: { food: 800, wood: 800, stone: 500, gold: 300 },
    lastResourceTickAt: nowMs(),
    buildings,
    activeBuildUpgrade: null,
    trainQueues: { barracks: [], drillground: [], workshop: [] },
    researchQueue: [],
    researchedTechs: [],
    generals: [],
    exploreSlots: [],
    armies: [],
    battleReports: [],
    inventory: {},
    pendingEvents: [],
    nextEventAt: nowMs() + EVENT_SPAWN_INTERVAL_MS,
    unlockedAchievements: [],
    cityTile: capTile ? { x: capTile.x, y: capTile.y } : { x: 0, y: 0 },
    power: 0
  };
}

function createNewGame() {
  const world = generateWorld();
  const factions = {};
  FACTIONS.forEach((f) => { factions[f.id] = createFactionState(f, world); });

  // 玩家起始附一位武將，避免開局無將可用。
  const starter = factions.shu;
  starter.generals.push(makeGeneralInstance('zhaoyun'));
  starter.armies.push({
    id: uid('army'), name: '本陣', generalId: 'zhaoyun',
    units: { infantry: 10 }, status: 'garrison',
    departAt: 0, arriveAt: 0, originTileId: null, targetTileId: null, purpose: null
  });

  return {
    version: SAVE_VERSION,
    createdAt: nowMs(),
    lastActiveAt: nowMs(),
    world,
    factions,
    campaignProgress: { completedIds: [] },
    activeScreen: 'city',
    nextAiTickAt: nowMs() + 20000,
    logs: []
  };
}

/* ---------------------------------------------------------------------- */
/* 效果彙總（建築等級 + 已研究科技）                                          */
/* ---------------------------------------------------------------------- */
function factionEffects(faction) {
  const eff = {
    foodPerHour: 0, woodPerHour: 0, stonePerHour: 0, goldPerHour: 0,
    storageCap: { food: 1000, wood: 1000, stone: 1000, gold: 800 },
    popCap: 20,
    trainSpeedMul: { barracks: 1, drillground: 1, workshop: 1 },
    researchSpeedMul: 1,
    exploreSlots: 1,
    exploreSpeedMul: 1,
    defenseBonusPct: 0,
    garrisonDefMul: 1,
    unitAtkPct: {},
    allDefPct: 0,
    siegeAtkPct: 0,
    wallDefPct: 0,
    trainSpeedPct: 0,
    storageCapAllPct: 0
  };

  BUILDING_ORDER.forEach((type) => {
    const lvl = faction.buildings[type].level;
    if (lvl <= 0) return;
    const ld = buildingLevelDef(type, lvl);
    const e = ld.effect;
    if (e.foodPerHour) eff.foodPerHour += e.foodPerHour;
    if (e.woodPerHour) eff.woodPerHour += e.woodPerHour;
    if (e.stonePerHour) eff.stonePerHour += e.stonePerHour;
    if (e.goldPerHour) eff.goldPerHour += e.goldPerHour;
    if (e.storageCap) { RESOURCE_TYPES.forEach((r) => { eff.storageCap[r] = Math.max(eff.storageCap[r], e.storageCap); }); }
    if (e.storageCapAll) { RESOURCE_TYPES.forEach((r) => { eff.storageCap[r] += e.storageCapAll; }); }
    if (e.popCap) eff.popCap = e.popCap;
    if (e.trainSpeedMul && (type === 'barracks' || type === 'drillground' || type === 'workshop')) eff.trainSpeedMul[type] = e.trainSpeedMul;
    if (e.researchSpeedMul) eff.researchSpeedMul = e.researchSpeedMul;
    if (e.exploreSlots) eff.exploreSlots = e.exploreSlots;
    if (e.exploreSpeedMul) eff.exploreSpeedMul = e.exploreSpeedMul;
    if (e.defenseBonusPct) eff.defenseBonusPct += e.defenseBonusPct;
    if (e.garrisonDefMul) eff.garrisonDefMul = e.garrisonDefMul;
  });

  faction.researchedTechs.forEach((techId) => {
    const t = techById(techId);
    if (!t) return;
    const e = t.effect;
    if (e.foodPerHourPct) eff.foodPerHour *= 1 + e.foodPerHourPct / 100;
    if (e.woodPerHourPct) eff.woodPerHour *= 1 + e.woodPerHourPct / 100;
    if (e.stonePerHourPct) eff.stonePerHour *= 1 + e.stonePerHourPct / 100;
    if (e.goldPerHourPct) eff.goldPerHour *= 1 + e.goldPerHourPct / 100;
    if (e.storageCapAllPct) { RESOURCE_TYPES.forEach((r) => { eff.storageCap[r] *= 1 + e.storageCapAllPct / 100; }); }
    if (e.infantryAtkPct) eff.unitAtkPct.infantry = (eff.unitAtkPct.infantry || 0) + e.infantryAtkPct;
    if (e.cavalryAtkPct) eff.unitAtkPct.cavalry = (eff.unitAtkPct.cavalry || 0) + e.cavalryAtkPct;
    if (e.rangedAtkPct) eff.unitAtkPct.ranged = (eff.unitAtkPct.ranged || 0) + e.rangedAtkPct;
    if (e.siegeAtkPct) eff.siegeAtkPct += e.siegeAtkPct;
    if (e.allDefPct) eff.allDefPct += e.allDefPct;
    if (e.wallDefPct) eff.wallDefPct += e.wallDefPct;
    if (e.trainSpeedPct) eff.trainSpeedPct += e.trainSpeedPct;
    if (e.exploreSpeedPct) eff.exploreSpeedMul *= 1 + e.exploreSpeedPct / 100;
  });

  RESOURCE_TYPES.forEach((r) => { eff.storageCap[r] = Math.round(eff.storageCap[r]); });
  return eff;
}

function factionPopUsed(faction) {
  let used = 0;
  faction.armies.forEach((a) => { Object.keys(a.units).forEach((u) => { used += (a.units[u] || 0) * (unitDef(u).leadership); }); });
  return used;
}

function factionPower(faction) {
  let power = 0;
  BUILDING_ORDER.forEach((type) => { power += faction.buildings[type].level * 8; });
  faction.armies.forEach((a) => {
    Object.keys(a.units).forEach((u) => {
      const d = unitDef(u);
      power += (a.units[u] || 0) * (d.stats.atk + d.stats.def + d.stats.hp / 10);
    });
  });
  faction.generals.forEach((g) => {
    const def = generalById(g.id);
    if (!def) return;
    power += (def.baseStats.force + def.baseStats.cmd + def.baseStats.intel) * (1 + g.level * 0.1);
  });
  return Math.round(power);
}

/* ---------------------------------------------------------------------- */
/* 時間推進（線上 tick 與離線追趕共用同一函式）                                */
/* ---------------------------------------------------------------------- */
const AI_TICK_INTERVAL_MS = 5 * 60000;
const AI_TICK_MAX_CATCHUP = 2000; // 離線追趕上限，避免長時間離線造成無限迴圈

function advanceTime(state, now) {
  Object.values(state.factions).forEach((faction) => tickFaction(state, faction, now));
  if (typeof aiTick === 'function') {
    let iterations = 0;
    while (now >= state.nextAiTickAt && iterations < AI_TICK_MAX_CATCHUP) {
      aiTick(state, state.nextAiTickAt);
      state.nextAiTickAt += AI_TICK_INTERVAL_MS;
      iterations++;
    }
    if (now >= state.nextAiTickAt) state.nextAiTickAt = now + AI_TICK_INTERVAL_MS;
  }
  state.lastActiveAt = now;
}

function tickFaction(state, faction, now) {
  applyResourceProduction(faction, now);
  resolveBuildUpgrade(faction, now);
  resolveTrainQueues(faction, now);
  resolveResearchQueue(faction, now);
  resolveExploreSlots(state, faction, now);
  resolveArmies(state, faction, now);
  if (typeof tickFactionEvents === 'function') tickFactionEvents(faction, now);
  if (typeof checkAchievements === 'function') checkAchievements(state, faction);
}

function applyResourceProduction(faction, now) {
  const elapsedMs = now - faction.lastResourceTickAt;
  if (elapsedMs <= 0) { faction.lastResourceTickAt = now; return; }
  const hours = elapsedMs / 3600000;
  const eff = factionEffects(faction);
  faction.resources.food = clamp(faction.resources.food + eff.foodPerHour * hours, 0, eff.storageCap.food);
  faction.resources.wood = clamp(faction.resources.wood + eff.woodPerHour * hours, 0, eff.storageCap.wood);
  faction.resources.stone = clamp(faction.resources.stone + eff.stonePerHour * hours, 0, eff.storageCap.stone);
  faction.resources.gold = clamp(faction.resources.gold + eff.goldPerHour * hours, 0, eff.storageCap.gold);
  faction.lastResourceTickAt = now;
}

function resolveBuildUpgrade(faction, now) {
  const b = faction.activeBuildUpgrade;
  if (!b) return;
  if (now >= b.completeAt) {
    faction.buildings[b.buildingType].level = b.targetLevel;
    faction.activeBuildUpgrade = null;
    pushLogGlobal(faction, buildingDef(b.buildingType).name + '升級至 ' + b.targetLevel + ' 級完成');
  }
}

function resolveTrainQueues(faction, now) {
  ['barracks', 'drillground', 'workshop'].forEach((bt) => {
    const q = faction.trainQueues[bt];
    while (q.length && now >= q[0].completeAt) {
      const item = q.shift();
      const eff = factionEffects(faction);
      const cap = eff.popCap;
      const used = factionPopUsed(faction);
      const room = Math.max(0, Math.floor((cap - used) / unitDef(item.unitType).leadership));
      const grant = Math.min(item.qty, room >= 0 ? item.qty : 0);
      const homeArmy = getOrCreateHomeArmy(faction);
      homeArmy.units[item.unitType] = (homeArmy.units[item.unitType] || 0) + grant;
      pushLogGlobal(faction, unitDef(item.unitType).name + ' x' + item.qty + ' 訓練完成');
    }
  });
}

function getOrCreateHomeArmy(faction) {
  let army = faction.armies.find((a) => a.status === 'garrison' && !a.marchLocked);
  if (!army) {
    army = { id: uid('army'), name: '駐守部隊', generalId: null, units: {}, status: 'garrison', departAt: 0, arriveAt: 0, originTileId: null, targetTileId: null, purpose: null };
    faction.armies.push(army);
  }
  return army;
}

function resolveResearchQueue(faction, now) {
  const q = faction.researchQueue;
  while (q.length && now >= q[0].completeAt) {
    const item = q.shift();
    if (!faction.researchedTechs.includes(item.techId)) faction.researchedTechs.push(item.techId);
    pushLogGlobal(faction, techById(item.techId).name + ' 研究完成');
  }
}

function resolveExploreSlots(state, faction, now) {
  for (let i = faction.exploreSlots.length - 1; i >= 0; i--) {
    const slot = faction.exploreSlots[i];
    if (now >= slot.completeAt) {
      faction.exploreSlots.splice(i, 1);
      if (!faction.generals.some((g) => g.id === slot.generalId)) {
        faction.generals.push(makeGeneralInstance(slot.generalId));
        pushLogGlobal(faction, '探索完成，武將「' + generalById(slot.generalId).name + '」加入陣營');
      } else {
        faction.resources.gold += 200;
        pushLogGlobal(faction, '探索完成，獲得 200 銀兩（武將已擁有）');
      }
    }
  }
}

function resolveArmies(state, faction, now) {
  faction.armies.forEach((army) => {
    if (army.status === 'marching' && now >= army.arriveAt) {
      resolveArmyArrival(state, faction, army, now);
    } else if (army.status === 'returning' && now >= army.arriveAt) {
      army.status = 'garrison';
      army.originTileId = null;
      army.targetTileId = null;
      army.purpose = null;
    }
  });
}

function pushLogGlobal(faction, text) {
  faction.battleReports = faction.battleReports || [];
  if (faction.isPlayer) {
    // 一般日誌與戰報分開，簡短事件記錄於全域 logs（由 game.js 顯示於頂端 toast）。
  }
  if (typeof window !== 'undefined' && faction.isPlayer && window.__pushToast) window.__pushToast(text);
}
