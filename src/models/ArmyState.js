/* ============================================================================
 * ArmyState.js — 一支部隊的動態狀態：兵力組成、主將、目前狀態與行軍資訊。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {'garrison'|'marching'|'fighting'|'returning'} ArmyStatus
   * - garrison：駐守於城池，可指派主將、可整編、可派遣出征。
   * - marching：正在前往目標地點的路上。
   * - fighting：已抵達目標，戰鬥正在進行中（見 combatSystem 的 activeBattles）；
   *   傷亡／掠奪／佔領尚未結算，地圖上該地塊會顯示交戰標記，可點進去觀戰。
   * - returning：戰鬥／行動已結算完畢，正在返回城池的路上。
   */

  /**
   * @typedef {Object} ArmyState
   * @property {string} id
   * @property {string} ownerFactionId
   * @property {string} name 顯示名稱。
   * @property {string|null} heroStateId 領軍武將的 HeroState id（同一武將 id），沒有則為 null。
   * @property {Object<string,number>} units 兵種組成，key 為 UnitDef id。
   * @property {ArmyStatus} status
   * @property {number} departAt 本次行軍/返程出發時間（epoch ms），status 為 garrison 時無意義。
   * @property {number} arriveAt 預計抵達時間（epoch ms）。
   * @property {string|null} originCityId 出發城池 id。
   * @property {string|null} targetTileId 目標地點的 MapState tile id（marching 時使用）。
   * @property {'raid'|'attack'|null} purpose raid＝攻打產地/野怪，attack＝攻打敵方城池。
   */

  /**
   * @param {string} ownerFactionId
   * @param {string} name
   * @param {Object<string,number>} [units]
   * @returns {ArmyState}
   */
  function createArmyState(ownerFactionId, name, units) {
    return {
      id: window.Game.Utils.generateId('army'),
      ownerFactionId,
      name,
      heroStateId: null,
      units: units || {},
      status: 'garrison',
      departAt: 0,
      arriveAt: 0,
      originCityId: null,
      targetTileId: null,
      purpose: null
    };
  }

  window.Game.Models.createArmyState = createArmyState;
})();
