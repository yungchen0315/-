/* ============================================================================
 * mapConfigDefs.js — 世界地圖的靜態設定。
 * 地圖本身（哪一格是什麼、資源點的座標與守備力）是「開新遊戲時隨機產生一次、
 * 之後就存進存檔」的內容，屬於動態的 MapState（src/models/MapState.js），
 * 不是這裡的靜態表。這裡只放產生地圖時會用到的參數。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} MapConfigDef
   * @property {number} width 地圖寬度（格數）。
   * @property {number} height 地圖高度（格數）。
   * @property {number} tileSizePx 建議的畫面像素格寬，UI 可依裝置尺寸另外縮放。
   */

  /** @type {MapConfigDef} */
  const MAP_CONFIG = {
    width: 17,
    height: 17,
    tileSizePx: 64
  };

  window.Game.Data.MAP_CONFIG = MAP_CONFIG;
})();
