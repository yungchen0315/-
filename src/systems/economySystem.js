/* ============================================================================
 * economySystem.js — 【骨架，尚未實作】
 *
 * 規劃職責：
 *   - 依 CityState.buildings 的等級（查 src/data/buildingDefs.js）與已完成的
 *     TechnologyState，算出每小時資源產量與存量上限（衍生值，不存進存檔）。
 *   - 依 MapState 上 ownerFactionId 等於自己的產地（type: 'resource'）加總
 *     每分鐘固定產出。
 *   - tick(playerState, cityState, now)：用 CityState.lastResourceTickAt 與 now
 *     的差值換算經過的小時數/分鐘數，把兩者的產出一次性加進 PlayerState.resources，
 *     並依存量上限 clamp。
 *
 * 對應舊版 js/state.js 的 factionEffects() / applyResourceProduction()。
 * ==========================================================================*/

(function () {
  window.Game.Systems.Economy = {
    // computeEffects(playerState) { ... }
    // tick(playerState, cityState, now) { ... }
  };
})();
