/* ============================================================================
 * achievementSystem.js — 依 AchievementDef 的宣告式 condition 解讀並判斷成就。
 * 對應舊版 js/achievements.js。這裡是唯一知道 condition.type 該怎麼解讀的地方，
 * src/data/achievementDefs.js 本身不含任何邏輯。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;

  function evaluateCondition(playerState, condition) {
    switch (condition.type) {
      case 'buildingLevelAny':
        return Object.values(playerState.cities).some((city) =>
          Object.values(city.buildings).some((b) => b.level >= condition.atLeast));
      case 'buildingLevel':
        return Object.values(playerState.cities).some((city) =>
          city.buildings[condition.building] && city.buildings[condition.building].level >= condition.atLeast);
      case 'heroCount':
        return Object.keys(playerState.heroes).length >= condition.atLeast;
      case 'heroLevelAny':
        return Object.values(playerState.heroes).some((h) => h.level >= condition.atLeast);
      case 'battleWinCount':
        return playerState.battleLog.filter((b) => b.outcome === 'win').length >= condition.atLeast;
      case 'missionCompletedCount':
        return Object.values(playerState.missions).filter((m) => m.status === 'completed').length >= condition.atLeast;
      case 'missionCompletedAll':
        return Object.values(playerState.missions).every((m) => m.status === 'completed');
      case 'itemEverObtained':
        return Object.values(playerState.inventory).some((qty) => qty > 0) ||
          Object.values(playerState.heroes).some((h) => Object.values(h.equipment).some(Boolean));
      case 'heroFullyEquippedAny':
        return Object.values(playerState.heroes).some((h) => D.ITEM_SLOTS.every((slot) => h.equipment[slot]));
      default:
        return false;
    }
  }

  /** @returns {AchievementDef[]} 這次呼叫新解鎖的成就（供 UI 顯示提示）。 */
  function checkAchievements(playerState) {
    const unlocked = new Set(playerState.unlockedAchievementIds);
    const newlyUnlocked = [];
    D.ACHIEVEMENT_DEFS.forEach((achievement) => {
      if (unlocked.has(achievement.id)) return;
      let met = false;
      try { met = evaluateCondition(playerState, achievement.condition); } catch (e) { met = false; }
      if (!met) return;
      playerState.unlockedAchievementIds.push(achievement.id);
      const eff = window.Game.Systems.Economy.computeEffects(playerState);
      if (achievement.reward && achievement.reward.resources) {
        Object.keys(achievement.reward.resources).forEach((r) => {
          playerState.resources[r] = U.clamp(playerState.resources[r] + achievement.reward.resources[r], 0, eff.storageCap[r]);
        });
      }
      newlyUnlocked.push(achievement);
    });
    return newlyUnlocked;
  }

  window.Game.Systems.Achievement = { evaluateCondition, checkAchievements };
})();
