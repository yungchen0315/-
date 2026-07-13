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
      // 科技帶來的產出加成（%換算成乘數）：跟 foodPerHour 等彙總欄位分開記錄，
      // 讓 tick() 能把同一套加成套用到「每座城池自己的建築產出」，而不必只能
      // 套用在全勢力合計後的總量上（否則多座城池時科技加成會被算重複或算漏）。
      foodPerHourMul: 1, woodPerHourMul: 1, stonePerHourMul: 1, goldPerHourMul: 1,
      storageCap: { food: 1000, wood: 1000, stone: 1000, gold: 800 },
      popCap: 20,
      trainSpeedMul: { barracks: 1, drillground: 1, workshop: 1 },
      researchSpeedMul: 1,
      gachaDiscountPct: 0,
      defenseBonusPct: 0,
      garrisonDefMul: 1,
      unitAtkPct: {},
      allDefPct: 0,
      siegeAtkPct: 0,
      wallDefPct: 0,
      trainSpeedPct: 0,
      maxAcademyTier: 0,
      capitalLevel: 0,
      dailyIngotYield: 0
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
        if (e.gachaDiscountPct) eff.gachaDiscountPct = Math.max(eff.gachaDiscountPct, e.gachaDiscountPct);
        if (e.defenseBonusPct) eff.defenseBonusPct += e.defenseBonusPct;
        if (e.garrisonDefMul) eff.garrisonDefMul = e.garrisonDefMul;
        if (e.unlockTechTier) eff.maxAcademyTier = Math.max(eff.maxAcademyTier, e.unlockTechTier);
        if (type === 'capital') eff.capitalLevel = Math.max(eff.capitalLevel, b.level);
      });
      eff.dailyIngotYield += cityDailyIngotYield(city);
    });

    Object.keys(playerState.technologies).forEach((techId) => {
      const techState = playerState.technologies[techId];
      if (techState.status !== 'completed') return;
      const t = D.technologyDefById(techId);
      if (!t) return;
      const e = t.effect;
      if (e.foodPerHourPct) { eff.foodPerHour *= 1 + e.foodPerHourPct / 100; eff.foodPerHourMul *= 1 + e.foodPerHourPct / 100; }
      if (e.woodPerHourPct) { eff.woodPerHour *= 1 + e.woodPerHourPct / 100; eff.woodPerHourMul *= 1 + e.woodPerHourPct / 100; }
      if (e.stonePerHourPct) { eff.stonePerHour *= 1 + e.stonePerHourPct / 100; eff.stonePerHourMul *= 1 + e.stonePerHourPct / 100; }
      if (e.goldPerHourPct) { eff.goldPerHour *= 1 + e.goldPerHourPct / 100; eff.goldPerHourMul *= 1 + e.goldPerHourPct / 100; }
      if (e.storageCapAllPct) { D.RESOURCE_TYPES.forEach((r) => { eff.storageCap[r] *= 1 + e.storageCapAllPct / 100; }); }
      if (e.infantryAtkPct) eff.unitAtkPct.infantry = (eff.unitAtkPct.infantry || 0) + e.infantryAtkPct;
      if (e.cavalryAtkPct) eff.unitAtkPct.cavalry = (eff.unitAtkPct.cavalry || 0) + e.cavalryAtkPct;
      if (e.rangedAtkPct) eff.unitAtkPct.ranged = (eff.unitAtkPct.ranged || 0) + e.rangedAtkPct;
      if (e.siegeAtkPct) eff.siegeAtkPct += e.siegeAtkPct;
      if (e.allDefPct) eff.allDefPct += e.allDefPct;
      if (e.wallDefPct) eff.wallDefPct += e.wallDefPct;
      if (e.trainSpeedPct) eff.trainSpeedPct += e.trainSpeedPct;
      if (e.gachaDiscountPct) eff.gachaDiscountPct += e.gachaDiscountPct;
    });
    eff.gachaDiscountPct = U.clamp(eff.gachaDiscountPct, 0, 60);

    D.RESOURCE_TYPES.forEach((r) => { eff.storageCap[r] = Math.round(eff.storageCap[r]); });
    return eff;
  }

  /** 單一城池自己的建築（糧倉／鋸木廠／採石場／金礦……）每小時產出，不含科技加成、
   *  不含其他城池的產出——供 tick() 逐城結算，避免多城池時把「全勢力合計產出」
   *  誤套用在每一座城池身上而重複計算。 */
  function cityBuildingProduction(city) {
    const out = { food: 0, wood: 0, stone: 0, gold: 0 };
    D.BUILDING_ORDER.forEach((type) => {
      const b = city.buildings[type];
      if (!b || b.level <= 0) return;
      const e = D.buildingLevelDef(type, b.level).effect;
      if (e.foodPerHour) out.food += e.foodPerHour;
      if (e.woodPerHour) out.wood += e.woodPerHour;
      if (e.stonePerHour) out.stone += e.stonePerHour;
      if (e.goldPerHour) out.gold += e.goldPerHour;
    });
    return out;
  }

  const CAPITAL_DAILY_INGOT_YIELD = 50;
  const CITY_DAILY_INGOT_MUL = 0.5; // 非首都城池的每日固定元寶產出，為首都的一半。

  /** 每座已攻佔城池每天固定產出的元寶（抽獎貨幣）：首都全額、其他城池半額。
   *  跟一般資源產出分開計算，元寶不受倉庫上限限制、也不會被攻城掠奪。 */
  function cityDailyIngotYield(city) {
    const isCapital = !!(city.buildings.capital && city.buildings.capital.level > 0);
    return CAPITAL_DAILY_INGOT_YIELD * (isCapital ? 1 : CITY_DAILY_INGOT_MUL);
  }

  /**
   * 依經過的時間結算一個 PlayerState 所有城池的資源產出：每座城池依自己的建築
   * 等級各自結算一般資源（乘上科技加成），再加上每座城池固定的每日元寶產出；
   * 已佔領產地的每分鐘固定產出歸入第一座城池的結算時間點一併發放。
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
      const prod = cityBuildingProduction(city);
      const tileYield = idx === 0 ? window.Game.Systems.Map.ownedResourceYieldPerMin(saveGame.map, playerState.factionId) : {};
      playerState.resources.food = U.clamp(playerState.resources.food + prod.food * eff.foodPerHourMul * hours + (tileYield.food || 0) * minutes, 0, eff.storageCap.food);
      playerState.resources.wood = U.clamp(playerState.resources.wood + prod.wood * eff.woodPerHourMul * hours + (tileYield.wood || 0) * minutes, 0, eff.storageCap.wood);
      playerState.resources.stone = U.clamp(playerState.resources.stone + prod.stone * eff.stonePerHourMul * hours + (tileYield.stone || 0) * minutes, 0, eff.storageCap.stone);
      playerState.resources.gold = U.clamp(playerState.resources.gold + prod.gold * eff.goldPerHourMul * hours + (tileYield.gold || 0) * minutes, 0, eff.storageCap.gold);
      playerState.resources.ingot += cityDailyIngotYield(city) * (hours / 24);
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

  window.Game.Systems.Economy = { computeEffects, tick, computePower, cityDailyIngotYield };
})();
