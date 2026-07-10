/* ============================================================================
 * mapSystem.js — 【骨架，尚未實作】
 *
 * 規劃職責：
 *   - generateMap(mapState, factionIds)：依 MAP_CONFIG 隨機放置主城／產地／
 *     野怪營地／探索地標，寫入 TileState。
 *   - captureResourceTile(playerState, tile, now)：擊破守軍後把 tile.ownerFactionId
 *     設為攻下的勢力，從此不再需要重新攻打。
 *   - ownedResourceYieldPerMin(mapState, factionId)：供 economySystem 加總用。
 *
 * 對應舊版 js/state.js 的 generateWorld() 與 js/army.js 的產地佔領分支。
 * ==========================================================================*/

(function () {
  window.Game.Systems.Map = {
    // generateMap(mapState, factionIds) { ... }
    // captureResourceTile(playerState, tile, now) { ... }
    // ownedResourceYieldPerMin(mapState, factionId) { ... }
  };
})();
