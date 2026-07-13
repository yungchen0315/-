/* ============================================================================
 * CityState.js — 單一城池的動態狀態。
 *
 * 一個勢力可以擁有多座城池：一座主城（isCapital）＋任意數量攻佔而來的城池。
 * PlayerState.cities 是一個以 cityId 為 key 的字典。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} CityState
   * @property {string} id
   * @property {string} ownerFactionId 所屬勢力 id。
   * @property {string} name 城池顯示名稱。
   * @property {number} tileX 在 MapState 上的格座標。
   * @property {number} tileY
   * @property {boolean} isCapital 是否為該勢力的主城。主城的固定資源產出為一般
   *   城池的兩倍（見 economySystem.cityFixedYieldPerHour），也才會顯示兵營／
   *   校場／工坊／酒館／學院／城牆等軍事與內政建築；一般城池只能升級城池等級
   *   （buildings.capital，兼作「城池等級」用）與倉庫。
   * @property {Object<string,BuildingState>} buildings 以 BuildingDef id 為 key。
   * @property {number} lastResourceTickAt 上次結算此城池資源產出的時間戳（epoch ms），
   *   離線追趕時用「現在 - 這個時間戳」換算經過了多久，一次性補算產出。
   */

  /**
   * 建立一座新城池的預設狀態，並依 BUILDING_ORDER 生成每種建築的初始 BuildingState。
   * @param {string} id
   * @param {string} ownerFactionId
   * @param {string} name
   * @param {number} tileX
   * @param {number} tileY
   * @param {number} now
   * @param {boolean} [isCapital]
   * @returns {CityState}
   */
  function createCityState(id, ownerFactionId, name, tileX, tileY, now, isCapital) {
    const buildings = {};
    window.Game.Data.BUILDING_ORDER.forEach((type) => {
      buildings[type] = window.Game.Models.createBuildingState(type, 0);
    });
    return {
      id, ownerFactionId, name, tileX, tileY,
      isCapital: !!isCapital,
      buildings,
      lastResourceTickAt: now
    };
  }

  window.Game.Models.createCityState = createCityState;
})();
