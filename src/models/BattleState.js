/* ============================================================================
 * BattleState.js — 一場戰鬥的結算紀錄（戰報）。
 *
 * 由 src/systems/combatSystem.js 在戰鬥結算的瞬間產生，即時結算完就是最終結果
 * （不是需要持續模擬的「進行中戰鬥」）。存進 PlayerState.battleLog 做為歷史記錄，
 * 供「戰報」畫面顯示與成就系統查詢（例如累計勝場數）。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {'win'|'lose'|'invalid'|'empty'} BattleOutcome
   * - win／lose：實際交戰後的勝負結果。
   * - invalid：目標已不存在或已被佔領，未交戰即折返。
   * - empty：目標據點守軍尚在冷卻中，撲空折返。
   */

  /**
   * @typedef {Object} BattleState
   * @property {string} id
   * @property {number} time 結算時間（epoch ms）。
   * @property {string} attackerFactionId
   * @property {string} [defenderFactionId] 對手為另一勢力時才有；打野外據點則為 undefined。
   * @property {string} attackerArmyId
   * @property {string} targetName 目標顯示名稱（城池／產地／野怪營地名稱）。
   * @property {'raid'|'attack'|'campaign'} purpose
   * @property {BattleOutcome} outcome
   * @property {Object<string,number>} [losses] 攻擊方本次戰鬥損失的兵力。
   * @property {Object<string,number>} [loot] 本次戰鬥獲得的資源。
   * @property {string} [itemDrop] 額外掉落的裝備名稱（若有）。
   * @property {string} text 給玩家看的戰報敘述文字。
   */

  /**
   * @param {Partial<BattleState>} fields
   * @returns {BattleState}
   */
  function createBattleState(fields) {
    return Object.assign({
      id: window.Game.Utils.generateId('battle'),
      time: window.Game.Utils.now(),
      attackerFactionId: null,
      attackerArmyId: null,
      targetName: '未知地點',
      purpose: 'raid',
      outcome: 'invalid',
      text: ''
    }, fields || {});
  }

  window.Game.Models.createBattleState = createBattleState;
})();
