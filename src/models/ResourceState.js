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
   * @property {number} ingot 元寶存量：抽獎專用的獎勵貨幣，不受倉庫上限限制，
   *   也不計入資源產出／攻城掠奪／野怪戰利品（刻意獨立於 RESOURCE_TYPES 之外，
   *   只透過戰役／成就／事件獎勵與每日簽到取得）。
   */

  /**
   * 建立一份新遊戲用的預設資源狀態。
   * @param {Partial<ResourceState>} [overrides]
   * @returns {ResourceState}
   */
  function createResourceState(overrides) {
    return Object.assign({ food: 800, wood: 800, stone: 500, gold: 300, ingot: 0 }, overrides || {});
  }

  window.Game.Models.createResourceState = createResourceState;
})();
