/* ============================================================================
 * combatSystem.js — 【骨架，尚未實作】
 *
 * 規劃職責：
 *   - resolveBattle(attackerSide, defenderSide)：即時公式結算（非模擬戰鬥），
 *     回傳勝負與雙方損耗率，產生一筆 BattleState。
 *   - 套用武將技能（依 HeroData.skill 對照的數值表，見 heroSkillDefs 之後
 *     視需要拆到 src/data）與已裝備道具的戰鬥加成。
 *   - applyCasualties：依損耗率扣除 ArmyState.units。
 *
 * 對應舊版 js/army.js 的 resolveBattle() / sideCombatStats() / applyCasualties()
 * 與 js/skills.js。
 * ==========================================================================*/

(function () {
  window.Game.Systems.Combat = {
    // resolveBattle(opts) { ... }
    // applyCasualties(units, lossRate) { ... }
  };
})();
