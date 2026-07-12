/* ============================================================================
 * MapState.js — 世界地圖的動態狀態。
 *
 * 地圖本身是「開新遊戲時依 MAP_CONFIG（src/data/mapConfigDefs.js）隨機產生一次」
 * 的內容——產生出來的每一格內容（是主城、產地、野怪營地還是空地，資源點的
 * 守備力與每分鐘產量等）在同一場遊戲裡不會重新洗牌，因此連同會隨玩法改變的
 * 欄位（佔領者、冷卻時間）一起存進存檔的 MapState，而不是放進 src/data。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {'empty'|'capital'|'city'|'resource'|'monster'} TileType
   */

  /**
   * @typedef {Object} TileState
   * @property {string} id 格式為 "x_y"。
   * @property {number} x
   * @property {number} y
   * @property {TileType} type
   * @property {string} [name] 顯示名稱（首都／城池／產地／野怪營地都有）。
   * @property {string} [ownerFactionId] type 為 'capital' 時必填；type 為 'resource'／'city'
   *   時在被佔領前為 null/undefined，佔領後設為佔領者的勢力 id（永久佔領，無需再駐守）。
   * @property {string} [homeFactionId] type 為 'city' 時，此城池原屬於哪個勢力的本土
   *   （純供地圖視覺分區與 AI 優先順序參考，不限制實際攻打順序）。
   * @property {string} regionFactionId 全地圖每一格都有：離哪個勢力首都最近，
   *   純供地圖視覺分區上色使用，不影響任何遊戲規則判斷。
   * @property {string} [cityId] type 為 'city' 時，對應的 PlayerState.cities key，
   *   在整場遊戲中固定不變（即使易主也不變），易主時會建立一份全新的 CityState。
   * @property {string} [resourceType] type 為 'resource' 時的資源種類。
   * @property {boolean} [isLand] type 為 'resource' 時，標記此格是「由空地轉成的
   *   一般土地」（農田／聚落／林地／山岩／漁場，見 mapSystem.convertEmptyTilesToLand）：
   *   機制與資源點完全相同（可佔領、有產出），僅地圖畫面改以田野質感呈現、不畫資源圖示。
   * @property {number} [yieldPerMin] type 為 'resource' 時，佔領後每分鐘的固定產出量。
   * @property {number} [guardPower] type 為 'resource'／'monster'／未佔領的 'city' 時的
   *   守備力估算值。
   * @property {number} [cooldownUntil] type 為 'monster' 時，擊破後的冷卻到期時間
   *   （epoch ms）；產地與城池不使用冷卻機制，改用永久佔領。
   * @property {'plain'|'forest'|'mountain'|'water'|'pass'} [terrain] 地形（見
   *   src/data/mapConfigDefs.js 的 TERRAIN_DEFS）：影響此格戰鬥時守方的防禦加成
   *   與向此格行軍的耗時。開新遊戲時由 mapSystem.generateMap 產生；舊存檔沒有
   *   此欄位時一律視為平原。
   */

  /**
   * @typedef {Object} MapState
   * @property {number} width
   * @property {number} height
   * @property {Object<string,TileState>} tiles 以 "x_y" 為 key。
   */

  /**
   * @param {number} width
   * @param {number} height
   * @returns {MapState}
   */
  function createEmptyMapState(width, height) {
    const tiles = {};
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const id = x + '_' + y;
        tiles[id] = { id, x, y, type: 'empty', terrain: 'plain' };
      }
    }
    return { width, height, tiles };
  }

  function tileKey(x, y) { return x + '_' + y; }

  window.Game.Models.createEmptyMapState = createEmptyMapState;
  window.Game.Models.tileKey = tileKey;
})();
