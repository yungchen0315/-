/* ============================================================================
 * mapConfigDefs.js — 世界地圖的靜態設定與探索據點名冊。
 * 地圖本身（哪一格是什麼、資源點的座標與守備力）是「開新遊戲時隨機產生一次、
 * 之後就存進存檔」的內容，屬於動態的 MapState（src/models/MapState.js），
 * 不是這裡的靜態表。這裡只放產生地圖時會用到的參數，以及每個探索據點的
 * 名稱／所在地名——這些名字本身是固定的，不隨存檔改變。
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

  /**
   * @typedef {Object} ExploreTileDef
   * @property {string} tag 對應 HeroData.source.tileTag。
   * @property {string} name 地名，用於地圖標示與探索列表。
   */

  /** @type {ExploreTileDef[]} */
  const EXPLORE_TILE_DEFS = [
    { tag: 'xiliang', name: '西涼' }, { tag: 'nanjun', name: '南郡' },
    { tag: 'tianshui', name: '天水' }, { tag: 'jiangzhou', name: '江州' },
    { tag: 'puyang', name: '濮陽' }, { tag: 'hefei', name: '合肥' },
    { tag: 'yangping', name: '陽平關' }, { tag: 'qiao', name: '譙郡' },
    { tag: 'hanzhong', name: '漢中' }, { tag: 'nanyang', name: '南陽' },
    { tag: 'jiangxia', name: '江夏' }, { tag: 'shenting', name: '神亭' },
    { tag: 'chibi', name: '赤壁' }, { tag: 'luyang', name: '蘆陽' },
    { tag: 'jianye', name: '建業' }, { tag: 'yuzhang', name: '豫章' }
  ];

  function exploreTileDefByTag(tag) { return EXPLORE_TILE_DEFS.find((t) => t.tag === tag); }

  window.Game.Data.MAP_CONFIG = MAP_CONFIG;
  window.Game.Data.EXPLORE_TILE_DEFS = EXPLORE_TILE_DEFS;
  window.Game.Data.exploreTileDefByTag = exploreTileDefByTag;
})();
