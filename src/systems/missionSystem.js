/* ============================================================================
 * missionSystem.js — 【骨架，尚未實作】
 *
 * 規劃職責：
 *   - refreshMissionStatuses(playerState)：依 missionsUnlockedFrom() 與目前
 *     MissionState 內容，把符合前置條件的關卡狀態從 'locked' 更新為 'available'。
 *   - fightMission(saveGame, playerState, missionDefId, armyId, now)：呼叫
 *     combatSystem 結算，勝利時發放獎勵（資源／武將／裝備）並標記 completed。
 *
 * 對應舊版 js/campaign.js。
 * ==========================================================================*/

(function () {
  window.Game.Systems.Mission = {
    // refreshMissionStatuses(playerState) { ... }
    // fightMission(saveGame, playerState, missionDefId, armyId, now) { ... }
  };
})();
