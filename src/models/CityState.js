/* ============================================================================
 * CityState.js — 單一城池的動態狀態。
 *
 * MVP 階段每個勢力只有一座主城，但資料形狀不假設「只能有一座城」——
 * PlayerState.cities 是一個以 cityId 為 key 的字典，即使現在永遠只有一筆，
 * 未來要開放佔領/建立第二座城池時，不需要更動存檔結構。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} CityState
   * @property {string} id
   * @property {string} ownerFactionId 所屬勢力 id。
   * @property {string} name 城池顯示名稱。
   * @property {number} tileX 在 MapState 上的格座標。
   * @property {number} tileY
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
   * @returns {CityState}
   */
  function createCityState(id, ownerFactionId, name, tileX, tileY, now) {
    const buildings = {};
    window.Game.Data.BUILDING_ORDER.forEach((type) => {
      buildings[type] = window.Game.Models.createBuildingState(type, 0);
    });
    return {
      id, ownerFactionId, name, tileX, tileY,
      buildings,
      lastResourceTickAt: now
    };
  }

  window.Game.Models.createCityState = createCityState;
})();
