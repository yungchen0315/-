/* ============================================================================
 * cityBuildingSystem.js — 建築升級規則。對應舊版 js/city.js。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;

  /** capital 建築身兼「城池等級」，每座城池（不只主城）各自獨立一份，決定
   *  該城池其他建築能升到的等級上限。 */
  function capitalCapLevel(city) { return city.buildings.capital.level; }

  /** 一般城池（非主城）只能升級城池等級（capital）與倉庫；兵營／校場／工坊／
   *  酒館／學院／城牆等內政軍事建築僅主城才能建造，這裡直接在規則層擋掉，
   *  而不只是畫面上不顯示按鈕，避免有其他呼叫路徑繞過畫面限制。 */
  const NON_CAPITAL_ALLOWED_TYPES = new Set(['capital', 'warehouse']);

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
    if (!city.isCapital && !NON_CAPITAL_ALLOWED_TYPES.has(buildingType)) return { ok: false, reason: '一般城池無法建造此建築，僅主城才有' };
    if (hasActiveUpgrade(city)) return { ok: false, reason: '已有建築正在施工' };
    const info = nextUpgradeInfo(city, buildingType);
    if (!info) return { ok: false, reason: '已達最高等級' };
    if (buildingType !== 'capital' && info.targetLevel > capitalCapLevel(city)) return { ok: false, reason: '需先提升城池等級' };
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
