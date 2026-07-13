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
      // 農耕術／伐木術／採礦術／通商術這類科技的「% 產出加成」套用在每座城池
      // 自己的固定產出上（cityFixedYieldPerHour），用同一套 cityYieldMul 讓
      // tick() 逐城結算時套用；地圖產地／土地格的產出不受這些科技影響。
      cityYieldMul: { food: 1, wood: 1, stone: 1, gold: 1 },
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
      if (e.foodPerHourPct) eff.cityYieldMul.food *= 1 + e.foodPerHourPct / 100;
      if (e.woodPerHourPct) eff.cityYieldMul.wood *= 1 + e.woodPerHourPct / 100;
      if (e.stonePerHourPct) eff.cityYieldMul.stone *= 1 + e.stonePerHourPct / 100;
      if (e.goldPerHourPct) eff.cityYieldMul.gold *= 1 + e.goldPerHourPct / 100;
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

  const CAPITAL_DAILY_INGOT_YIELD = 50;
  const CITY_DAILY_INGOT_MUL = 0.5; // 非主城的每日固定元寶產出，為主城的一半。
  const CAPITAL_YIELD_MUL = 2; // 主城的固定資源產出，為一般城池（同等級）的兩倍。

  /** 每座已攻佔城池每天固定產出的元寶（抽獎貨幣）：主城全額、其他城池半額。
   *  跟一般資源產出分開計算，元寶不受倉庫上限限制、也不會被攻城掠奪。 */
  function cityDailyIngotYield(city) {
    return CAPITAL_DAILY_INGOT_YIELD * (city.isCapital ? 1 : CITY_DAILY_INGOT_MUL);
  }

  /**
   * 單一城池自己固定的每小時資源產出（糧食／木材／石料／銀兩同一個數字），
   * 依城池等級（buildings.capital，兼作「城池等級」）換算，不需要佔領地圖上
   * 的任何產地／土地格；主城產出為一般城池（同等級）的兩倍。城池等級 0
   * （尚未開始建設，例如剛攻下的城池）沒有任何固定產出。
   */
  function cityFixedYieldPerHour(city) {
    const level = city.buildings.capital.level;
    if (level <= 0) return 0;
    const rate = D.buildingLevelDef('capital', level).effect.cityYieldPerHour || 0;
    return rate * (city.isCapital ? CAPITAL_YIELD_MUL : 1);
  }

  /**
   * 依經過的時間結算一個 PlayerState 的資源產出：每座城池依自己的城池等級各自
   * 固定產出四種資源（乘上農耕術等科技加成），再加上地圖上已佔領產地／土地格
   * 的每分鐘固定產出（歸入第一座城池的結算時間點一併發放）；每座城池另外
   * 各自累計自己固定的每日元寶產出。
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
      const cityRate = cityFixedYieldPerHour(city);
      const tileYield = idx === 0 ? window.Game.Systems.Map.ownedResourceYieldPerMin(saveGame.map, playerState.factionId) : {};
      D.RESOURCE_TYPES.forEach((r) => {
        const gain = cityRate * eff.cityYieldMul[r] * hours + (tileYield[r] || 0) * minutes;
        playerState.resources[r] = U.clamp(playerState.resources[r] + gain, 0, eff.storageCap[r]);
      });
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

  window.Game.Systems.Economy = { computeEffects, tick, computePower, cityDailyIngotYield, cityFixedYieldPerHour };
})();
