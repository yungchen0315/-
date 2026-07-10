/* ============================================================================
 * MissionState.js — 玩家對單一主線關卡（MissionDef）的動態進度。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {'locked'|'available'|'completed'} MissionStatus
   * - locked：前置關卡尚未完成。
   * - available：可挑戰（由 src/data/missionDefs.js 的 missionsUnlockedFrom 依
   *   已完成清單即時算出，通常不需要另外存 locked/available，只需要存
   *   completed 清單；MissionState 保留這個欄位是為了讓系統層在需要時
   *   （例如關卡列表 UI）能拿到一個完整、可序列化的狀態物件，而不用每次都
   *   重新查表推導。）
   * - completed：已過關。
   */

  /**
   * @typedef {Object} MissionState
   * @property {string} missionDefId 對應 MissionDef.id。
   * @property {MissionStatus} status
   * @property {number} attempts 挑戰次數（含失敗）。
   * @property {number|null} completedAt 過關時間（epoch ms），未過關則為 null。
   */

  /**
   * @param {string} missionDefId
   * @param {MissionStatus} [status]
   * @returns {MissionState}
   */
  function createMissionState(missionDefId, status) {
    return { missionDefId, status: status || 'locked', attempts: 0, completedAt: null };
  }

  window.Game.Models.createMissionState = createMissionState;
})();
