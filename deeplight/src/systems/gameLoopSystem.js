/* ============================================================================
 * gameLoopSystem.js — 唯一的時間推進入口，前景 tick 用實測 dt 結算，
 * 不假設固定步長；離線追趕交給 offlineSystem，兩者共用同一套螢光/深度公式。
 * ==========================================================================*/
(function () {
  const Econ = window.App.Systems.Economy;
  const Descent = window.App.Systems.Descent;
  const Achievement = window.App.Systems.Achievement;

  /**
   * @param {SaveGame} save
   * @param {number} dtMs 距離上次 tick 的實際毫秒數。
   * @returns {{newAchievements: AchievementDef[]}}
   */
  function tick(save, dtMs) {
    const dtSec = Math.max(0, dtMs / 1000);
    const gps = Econ.glowPerSec(save);
    const gained = gps * dtSec;
    save.glow += gained;
    save.stats.totalGlowEarned += gained;
    Descent.advance(save, dtSec);
    const newAchievements = Achievement.checkAchievements(save);
    return { newAchievements };
  }

  window.App.Systems.GameLoop = { tick };
})();
