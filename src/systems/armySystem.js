/* ============================================================================
 * armySystem.js — 【骨架，尚未實作】
 *
 * 規劃職責：
 *   - queueTraining / resolveTrainQueues：兵營/校場/工坊練兵佇列。
 *   - sendArmyToTile／resolveArrival：行軍與到達結算的排程（實際戰鬥交給
 *     combatSystem，這裡只負責部隊移動的時間與狀態轉換）。
 *   - splitArmy／disbandArmy：整編，含 heroSystem.leadershipCap 的檢查。
 *   - marchDurationMs(armyState, distanceTiles)：依部隊最慢兵種速度換算行軍耗時。
 *
 * 對應舊版 js/army.js 的行軍／練兵／整編部分（戰鬥結算部分見 combatSystem）。
 * ==========================================================================*/

(function () {
  window.Game.Systems.Army = {
    // queueTraining(playerState, cityState, buildingType, unitType, qty, now) { ... }
    // sendArmyToTile(saveGame, playerState, armyId, targetTile, purpose, now) { ... }
    // splitArmy(playerState, sourceArmyId) { ... }
    // disbandArmy(playerState, armyId) { ... }
  };
})();
