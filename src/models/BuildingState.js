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
   * @typedef {Object} TrainingJob
   * @property {string} unitDefId
   * @property {number} qty
   * @property {number} startAt
   * @property {number} completeAt
   */

  /**
   * @typedef {Object} BuildingState
   * @property {string} buildingType 對應 BuildingDef 的 id（例如 'granary'）。
   * @property {number} level 目前等級，0 表示尚未建造。
   * @property {BuildingUpgradeJob|null} upgrade 進行中的升級工作，沒有則為 null。
   * @property {TrainingJob[]} trainQueue 訓練佇列。只有 BuildingDef.trains 有值的
   *   建築（兵營／校場／工坊）才會用到，其餘建築此陣列永遠是空的——放在這裡而不是
   *   另開一個全域字典，是因為訓練佇列本質上就屬於「這一棟建築」。
   */

  /**
   * @param {string} buildingType
   * @param {number} [level]
   * @returns {BuildingState}
   */
  function createBuildingState(buildingType, level) {
    return { buildingType, level: level || 0, upgrade: null, trainQueue: [] };
  }

  window.Game.Models.createBuildingState = createBuildingState;
})();
