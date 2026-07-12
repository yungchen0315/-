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
    width: 29,
    height: 29,
    tileSizePx: 64
  };

  /**
   * @typedef {Object} TerrainDef
   * @property {string} name 顯示名稱。
   * @property {number} defBonusPct 在此地形上防守時，守方防禦力的百分比加成。
   * @property {number} marchMul 向此地形行軍時的耗時倍率（1 = 不影響）。
   */

  /**
   * 地形靜態表：地形影響戰鬥（守方防禦加成）與行軍（耗時倍率）。
   * 關隘為山地要衝的特殊據點地形，一夫當關、易守難攻。
   * @type {Object<string,TerrainDef>}
   */
  const TERRAIN_DEFS = {
    plain: { name: '平原', defBonusPct: 0, marchMul: 1 },
    forest: { name: '森林', defBonusPct: 10, marchMul: 1.25 },
    mountain: { name: '山地', defBonusPct: 25, marchMul: 1.5 },
    water: { name: '水域', defBonusPct: 15, marchMul: 1.25 },
    pass: { name: '關隘', defBonusPct: 40, marchMul: 1.5 }
  };

  /** 取得某格的地形定義；舊存檔沒有 terrain 欄位時一律視為平原。 */
  function terrainDefOf(tile) {
    return TERRAIN_DEFS[(tile && tile.terrain) || 'plain'] || TERRAIN_DEFS.plain;
  }

  window.Game.Data.MAP_CONFIG = MAP_CONFIG;
  window.Game.Data.TERRAIN_DEFS = TERRAIN_DEFS;
  window.Game.Data.terrainDefOf = terrainDefOf;
})();
