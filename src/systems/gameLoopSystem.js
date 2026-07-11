/* ============================================================================
 * gameLoopSystem.js — 唯一的時間推進入口。線上每秒 tick 與離線進度追趕都呼叫
 * 同一個 advanceTime()，差異只在 now 與上次推進時間的差距，不需要另外寫一套
 * 補幀邏輯。對應舊版 js/state.js 的 advanceTime() / tickFaction()。
 * ==========================================================================*/

(function () {
  const AI_TICK_INTERVAL_MS = 5 * 60000;
  const AI_TICK_MAX_CATCHUP = 2000; // 離線追趕上限，避免長時間離線造成無限迴圈

  /**
   * @param {SaveGame} saveGame
   * @param {number} now
   */
  function advanceTime(saveGame, now) {
    Object.values(saveGame.players).forEach((playerState) => tickPlayer(saveGame, playerState, now));
    window.Game.Systems.Combat.resolveActiveBattles(saveGame, now);

    let iterations = 0;
    while (now >= saveGame.nextAiTickAt && iterations < AI_TICK_MAX_CATCHUP) {
      window.Game.Systems.Ai.tick(saveGame, saveGame.nextAiTickAt);
      saveGame.nextAiTickAt += AI_TICK_INTERVAL_MS;
      iterations++;
    }
    if (now >= saveGame.nextAiTickAt) saveGame.nextAiTickAt = now + AI_TICK_INTERVAL_MS;

    saveGame.lastActiveAt = now;
  }

  function tickPlayer(saveGame, playerState, now) {
    window.Game.Systems.Economy.tick(saveGame, playerState, now);
    Object.values(playerState.cities).forEach((city) => {
      window.Game.Systems.CityBuilding.resolveUpgrades(city, now);
      window.Game.Systems.Army.resolveTrainQueues(playerState, city, now);
    });
    window.Game.Systems.Technology.resolveResearch(playerState, now);
    window.Game.Systems.Army.resolveArmies(saveGame, playerState, now);
    window.Game.Systems.Event.tick(playerState, now);
    window.Game.Systems.Mission.refreshMissionStatuses(playerState);
    window.Game.Systems.Achievement.checkAchievements(playerState);
    window.Game.Systems.Gacha.tickDailyReward(playerState, now);
  }

  window.Game.Systems.GameLoop = { advanceTime };
})();
