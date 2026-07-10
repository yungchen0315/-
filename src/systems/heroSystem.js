/* ============================================================================
 * heroSystem.js — 【骨架，尚未實作】
 *
 * 規劃職責：
 *   - recruitViaMission(playerState, missionDefId)／startExplore／
 *     resolveExploreSlots：武將取得（劇情解鎖／酒館探索），完全不含機率抽卡。
 *   - awardExp / effectiveStats(heroState)：升級與依 growth 換算目前數值。
 *   - leadershipCap(heroState)：統率上限＝有效統率值 × 係數，供 armySystem
 *     指派主將時檢查部隊統率需求是否超過上限。
 *   - equipItem / unequipItem：與 inventorySystem 共用庫存增減。
 *
 * 對應舊版 js/generals.js。
 * ==========================================================================*/

(function () {
  window.Game.Systems.Hero = {
    // effectiveStats(heroState) { ... }
    // leadershipCap(heroState) { ... }
    // awardExp(heroState, amount) { ... }
  };
})();
