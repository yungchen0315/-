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
   * @typedef {'empty'|'capital'|'resource'|'monster'} TileType
   */

  /**
   * @typedef {Object} TileState
   * @property {string} id 格式為 "x_y"。
   * @property {number} x
   * @property {number} y
   * @property {TileType} type
   * @property {string} [name] 顯示名稱（主城／產地／野怪營地都有）。
   * @property {string} [ownerFactionId] type 為 'capital' 時必填；type 為 'resource' 時
   *   在被佔領前為 undefined，佔領後設為佔領者的勢力 id（永久佔領，無需再駐守）。
   * @property {string} [resourceType] type 為 'resource' 時的資源種類。
   * @property {number} [yieldPerMin] type 為 'resource' 時，佔領後每分鐘的固定產出量。
   * @property {number} [guardPower] type 為 'resource'／'monster' 時的守備力估算值。
   * @property {number} [cooldownUntil] type 為 'monster' 時，擊破後的冷卻到期時間
   *   （epoch ms）；產地不使用冷卻機制，改用永久佔領。
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
        tiles[id] = { id, x, y, type: 'empty' };
      }
    }
    return { width, height, tiles };
  }

  function tileKey(x, y) { return x + '_' + y; }

  window.Game.Models.createEmptyMapState = createEmptyMapState;
  window.Game.Models.tileKey = tileKey;
})();
