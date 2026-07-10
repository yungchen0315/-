/* ============================================================================
 * economySystem.js — 資源產出、存量上限、與其他系統共用的「效果彙總」。
 * 對應舊版 js/state.js 的 factionEffects() / applyResourceProduction()，
 * 改為讀 PlayerState.cities（可能不只一座）與 PlayerState.technologies。
 * ==========================================================================*/

(function () {
  const U = window.Game.Utils;
  const D = window.Game.Data;

  /**
   * 彙總一個 PlayerState 目前所有城池建築＋已完成科技帶來的效果。
   * 這是其他系統（練兵速度、統率上限、城防加成……）共用的唯一入口，
   * 不要在其他系統裡重複算一份。
   * @param {PlayerState} playerState
   * @returns {Object} 詳見各欄位命名，與舊版 factionEffects() 回傳形狀相同。
   */
  function computeEffects(playerState) {
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
      maxAcademyTier: 0,
      capitalLevel: 0
    };

    Object.values(playerState.cities).forEach((city) => {
      D.BUILDING_ORDER.forEach((type) => {
        const b = city.buildings[type];
        if (!b || b.level <= 0) return;
        const ld = D.buildingLevelDef(type, b.level);
        const e = ld.effect;
        if (e.foodPerHour) eff.foodPerHour += e.foodPerHour;
        if (e.woodPerHour) eff.woodPerHour += e.woodPerHour;
        if (e.stonePerHour) eff.stonePerHour += e.stonePerHour;
        if (e.goldPerHour) eff.goldPerHour += e.goldPerHour;
        if (e.storageCap) { D.RESOURCE_TYPES.forEach((r) => { eff.storageCap[r] = Math.max(eff.storageCap[r], e.storageCap); }); }
        if (e.storageCapAll) { D.RESOURCE_TYPES.forEach((r) => { eff.storageCap[r] += e.storageCapAll; }); }
        if (e.popCap) eff.popCap = Math.max(eff.popCap, e.popCap);
        if (e.trainSpeedMul && (type === 'barracks' || type === 'drillground' || type === 'workshop')) eff.trainSpeedMul[type] = e.trainSpeedMul;
        if (e.researchSpeedMul) eff.researchSpeedMul = e.researchSpeedMul;
        if (e.exploreSlots) eff.exploreSlots = e.exploreSlots;
        if (e.exploreSpeedMul) eff.exploreSpeedMul = e.exploreSpeedMul;
        if (e.defenseBonusPct) eff.defenseBonusPct += e.defenseBonusPct;
        if (e.garrisonDefMul) eff.garrisonDefMul = e.garrisonDefMul;
        if (e.unlockTechTier) eff.maxAcademyTier = Math.max(eff.maxAcademyTier, e.unlockTechTier);
        if (type === 'capital') eff.capitalLevel = Math.max(eff.capitalLevel, b.level);
      });
    });

    Object.keys(playerState.technologies).forEach((techId) => {
      const techState = playerState.technologies[techId];
      if (techState.status !== 'completed') return;
      const t = D.technologyDefById(techId);
      if (!t) return;
      const e = t.effect;
      if (e.foodPerHourPct) eff.foodPerHour *= 1 + e.foodPerHourPct / 100;
      if (e.woodPerHourPct) eff.woodPerHour *= 1 + e.woodPerHourPct / 100;
      if (e.stonePerHourPct) eff.stonePerHour *= 1 + e.stonePerHourPct / 100;
      if (e.goldPerHourPct) eff.goldPerHour *= 1 + e.goldPerHourPct / 100;
      if (e.storageCapAllPct) { D.RESOURCE_TYPES.forEach((r) => { eff.storageCap[r] *= 1 + e.storageCapAllPct / 100; }); }
      if (e.infantryAtkPct) eff.unitAtkPct.infantry = (eff.unitAtkPct.infantry || 0) + e.infantryAtkPct;
      if (e.cavalryAtkPct) eff.unitAtkPct.cavalry = (eff.unitAtkPct.cavalry || 0) + e.cavalryAtkPct;
      if (e.rangedAtkPct) eff.unitAtkPct.ranged = (eff.unitAtkPct.ranged || 0) + e.rangedAtkPct;
      if (e.siegeAtkPct) eff.siegeAtkPct += e.siegeAtkPct;
      if (e.allDefPct) eff.allDefPct += e.allDefPct;
      if (e.wallDefPct) eff.wallDefPct += e.wallDefPct;
      if (e.trainSpeedPct) eff.trainSpeedPct += e.trainSpeedPct;
      if (e.exploreSpeedPct) eff.exploreSpeedMul *= 1 + e.exploreSpeedPct / 100;
    });

    D.RESOURCE_TYPES.forEach((r) => { eff.storageCap[r] = Math.round(eff.storageCap[r]); });
    return eff;
  }

  /**
   * 依經過的時間結算一個 PlayerState 所有城池的資源產出，並加上已佔領產地的
   * 固定每分鐘產出（歸入第一座城池的結算時間點，MVP 階段每個勢力只有一座城）。
   * @param {SaveGame} saveGame
   * @param {PlayerState} playerState
   * @param {number} now
   */
  function tick(saveGame, playerState, now) {
    const cities = Object.values(playerState.cities);
    const eff = computeEffects(playerState);
    cities.forEach((city, idx) => {
      const elapsedMs = now - city.lastResourceTickAt;
      if (elapsedMs <= 0) { city.lastResourceTickAt = now; return; }
      const hours = elapsedMs / 3600000;
      const minutes = elapsedMs / 60000;
      const tileYield = idx === 0 ? window.Game.Systems.Map.ownedResourceYieldPerMin(saveGame.map, playerState.factionId) : {};
      playerState.resources.food = U.clamp(playerState.resources.food + eff.foodPerHour * hours + (tileYield.food || 0) * minutes, 0, eff.storageCap.food);
      playerState.resources.wood = U.clamp(playerState.resources.wood + eff.woodPerHour * hours + (tileYield.wood || 0) * minutes, 0, eff.storageCap.wood);
      playerState.resources.stone = U.clamp(playerState.resources.stone + eff.stonePerHour * hours + (tileYield.stone || 0) * minutes, 0, eff.storageCap.stone);
      playerState.resources.gold = U.clamp(playerState.resources.gold + eff.goldPerHour * hours + (tileYield.gold || 0) * minutes, 0, eff.storageCap.gold);
      city.lastResourceTickAt = now;
    });
  }

  /**
   * 綜合國力估算：城池建築等級＋部隊戰力＋武將數值。用於頂部狀態列顯示，
   * 以及 aiSystem 判斷是否具備進攻玩家的實力優勢。
   * @param {PlayerState} playerState
   * @returns {number}
   */
  function computePower(playerState) {
    let power = 0;
    Object.values(playerState.cities).forEach((city) => {
      D.BUILDING_ORDER.forEach((type) => { power += city.buildings[type].level * 8; });
    });
    Object.values(playerState.armies).forEach((army) => {
      Object.keys(army.units).forEach((u) => {
        const d = D.unitDefById(u);
        power += (army.units[u] || 0) * (d.stats.atk + d.stats.def + d.stats.hp / 10);
      });
    });
    Object.values(playerState.heroes).forEach((heroState) => {
      const def = D.heroDefById(heroState.heroDataId);
      if (!def) return;
      power += (def.baseStats.force + def.baseStats.cmd + def.baseStats.intel) * (1 + heroState.level * 0.1);
    });
    return Math.round(power);
  }

  window.Game.Systems.Economy = { computeEffects, tick, computePower };
})();
