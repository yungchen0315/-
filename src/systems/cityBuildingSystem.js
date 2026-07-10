/* ============================================================================
 * cityBuildingSystem.js — 【骨架，尚未實作】
 *
 * 規劃職責：
 *   - canStartUpgrade(cityState, buildingType)：檢查主城等級上限、資源是否足夠、
 *     是否已有其他建築正在升級中（「同時只能升一棟」是這裡強制的規則，
 *     不是 BuildingState 資料形狀本身的限制）。
 *   - startUpgrade(playerState, cityState, buildingType, now)：扣資源、寫入
 *     BuildingState.upgrade。
 *   - resolveUpgrades(cityState, now)：completeAt 已到的升級套用新等級。
 *
 * 對應舊版 js/city.js 的 canStartUpgrade() / startUpgrade() / resolveBuildUpgrade()。
 * ==========================================================================*/

(function () {
  window.Game.Systems.CityBuilding = {
    // canStartUpgrade(cityState, buildingType) { ... }
    // startUpgrade(playerState, cityState, buildingType, now) { ... }
    // resolveUpgrades(cityState, now) { ... }
  };
})();
