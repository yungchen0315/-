/* ============================================================================
 * ResourceState.js — 玩家/勢力目前持有的資源存量（動態狀態）。
 *
 * 注意：這裡只存「原始存量」，不存「每小時產量」或「存量上限」——那些是由
 * 建築等級、科技、已佔領產地等靜態/動態資料「即時算出」的衍生值，
 * 屬於 src/systems/economySystem.js 的職責，不應該重複寫進存檔（否則升級建築後
 * 忘記同步更新，就會出現存檔內的上限與實際不一致的 bug）。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} ResourceState
   * @property {number} food 糧食存量。
   * @property {number} wood 木材存量。
   * @property {number} stone 石料存量。
   * @property {number} gold 銀兩存量。
   */

  /**
   * 建立一份新遊戲用的預設資源狀態。
   * @param {Partial<ResourceState>} [overrides]
   * @returns {ResourceState}
   */
  function createResourceState(overrides) {
    return Object.assign({ food: 800, wood: 800, stone: 500, gold: 300 }, overrides || {});
  }

  window.Game.Models.createResourceState = createResourceState;
})();
