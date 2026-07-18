/* ============================================================================
 * achievementSystem.js — 逐一檢查成就條件是否達成，解鎖並視情況掉珍珠。
 * ==========================================================================*/
(function () {
  const D = window.App.Data;

  /** @returns {AchievementDef[]} 這次呼叫新解鎖的成就（供 UI 彈 toast）。 */
  function checkAchievements(save) {
    const newly = [];
    D.ACHIEVEMENT_DEFS.forEach((a) => {
      if (save.achievements.includes(a.id)) return;
      if (a.condition(save)) {
        save.achievements.push(a.id);
        if (a.pearl) save.pearls = (save.pearls || 0) + a.pearl;
        newly.push(a);
      }
    });
    return newly;
  }

  window.App.Systems.Achievement = { checkAchievements };
})();
