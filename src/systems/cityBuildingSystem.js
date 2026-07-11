/* ============================================================================
 * cityBuildingSystem.js — 建築升級規則。對應舊版 js/city.js。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;

  function capitalCapLevel(city) { return city.buildings.capital.level; }

  /** 城池目前是否已有任何建築在升級中（同一時間只能升一棟，這是規則而非資料形狀限制）。 */
  function hasActiveUpgrade(city) {
    return Object.values(city.buildings).some((b) => !!b.upgrade);
  }

  function nextUpgradeInfo(city, buildingType) {
    const cur = city.buildings[buildingType].level;
    const def = D.buildingDefById(buildingType);
    if (cur >= def.levels.length) return null;
    const targetLevel = cur + 1;
    const ld = D.buildingLevelDef(buildingType, targetLevel);
    return { targetLevel, cost: ld.cost, timeMs: ld.timeMs };
  }

  function canStartUpgrade(city, buildingType) {
    if (hasActiveUpgrade(city)) return { ok: false, reason: '已有建築正在施工' };
    const info = nextUpgradeInfo(city, buildingType);
    if (!info) return { ok: false, reason: '已達最高等級' };
    if (buildingType !== 'capital' && info.targetLevel > capitalCapLevel(city)) return { ok: false, reason: '需先升級主城' };
    return { ok: true, info };
  }

  /**
   * @param {PlayerState} playerState
   * @param {CityState} city
   * @param {string} buildingType
   * @param {number} now
   */
  function startUpgrade(playerState, city, buildingType, now) {
    const check = canStartUpgrade(city, buildingType);
    if (!check.ok) return check;
    if (!U.canAfford(playerState.resources, check.info.cost)) return { ok: false, reason: '資源不足' };
    U.subtractResources(playerState.resources, check.info.cost);
    city.buildings[buildingType].upgrade = {
      targetLevel: check.info.targetLevel,
      startAt: now,
      completeAt: now + check.info.timeMs
    };
    return { ok: true };
  }

  /** @param {CityState} city @param {number} now */
  function resolveUpgrades(city, now) {
    Object.keys(city.buildings).forEach((type) => {
      const b = city.buildings[type];
      if (b.upgrade && now >= b.upgrade.completeAt) {
        b.level = b.upgrade.targetLevel;
        b.upgrade = null;
      }
    });
  }

  window.Game.Systems.CityBuilding = {
    capitalCapLevel, hasActiveUpgrade, nextUpgradeInfo, canStartUpgrade, startUpgrade, resolveUpgrades
  };
})();
