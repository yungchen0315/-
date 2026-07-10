/* ============================================================================
 * TechnologyState.js — 玩家對單一科技（TechnologyDef）的動態研究進度。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {'locked'|'available'|'researching'|'completed'} TechnologyStatus
   */

  /**
   * @typedef {Object} TechnologyState
   * @property {string} technologyDefId 對應 TechnologyDef.id。
   * @property {TechnologyStatus} status
   * @property {number|null} startedAt 開始研究時間（epoch ms），未開始為 null。
   * @property {number|null} completeAt 預計／實際完成時間（epoch ms）。
   */

  /**
   * @param {string} technologyDefId
   * @returns {TechnologyState}
   */
  function createTechnologyState(technologyDefId) {
    return { technologyDefId, status: 'locked', startedAt: null, completeAt: null };
  }

  window.Game.Models.createTechnologyState = createTechnologyState;
})();
