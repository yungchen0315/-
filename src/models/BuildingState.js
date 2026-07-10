/* ============================================================================
 * BuildingState.js — 城池內單一建築的動態狀態。
 *
 * 「這棟建築升到 X 級要花多少資源/多久/有什麼效果」查 BuildingDef
 * （src/data/buildingDefs.js），這裡只記錄「目前是幾級、現在有沒有正在升級、
 * 升級會在什麼時候完成」。
 *
 * 設計上刻意讓每個 BuildingState 各自帶自己的 upgrade 欄位（而不是像舊版
 * js/state.js 那樣，整個城池只有一個全域的 activeBuildUpgrade 鎖）——
 * 「同一時間只能升級一棟建築」是遊戲規則，規則會變（例如之後解鎖多工建造），
 * 資料形狀本身不該預先幫規則卡死一個全域鎖。這條規則的判斷與強制執行，
 * 屬於 src/systems/cityBuildingSystem.js。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} BuildingUpgradeJob
   * @property {number} targetLevel 升級完成後的等級。
   * @property {number} startAt 開始時間（epoch ms）。
   * @property {number} completeAt 預計完成時間（epoch ms）。離線追趕只需比較
   *   Game.Utils.now() 是否 >= completeAt。
   */

  /**
   * @typedef {Object} BuildingState
   * @property {string} buildingType 對應 BuildingDef 的 id（例如 'granary'）。
   * @property {number} level 目前等級，0 表示尚未建造。
   * @property {BuildingUpgradeJob|null} upgrade 進行中的升級工作，沒有則為 null。
   */

  /**
   * @param {string} buildingType
   * @param {number} [level]
   * @returns {BuildingState}
   */
  function createBuildingState(buildingType, level) {
    return { buildingType, level: level || 0, upgrade: null };
  }

  window.Game.Models.createBuildingState = createBuildingState;
})();
