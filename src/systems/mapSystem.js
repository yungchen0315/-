/* ============================================================================
 * mapSystem.js — 世界地圖生成與產地佔領。
 * 對應舊版 js/state.js 的 generateWorld() 與 js/army.js 的產地佔領分支。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;
  const M = window.Game.Models;

  /**
   * 在既有（空白）MapState 上放置主城、產地、野怪營地、探索地標。
   * @param {MapState} mapState
   * @param {FactionDef[]} factionDefs
   * @returns {Object<string,{x:number,y:number}>} 各勢力主城落點座標，供
   *   newGameSystem 用來建立對應的 CityState。
   */
  function generateMap(mapState, factionDefs) {
    const w = mapState.width, h = mapState.height;
    const capitalSpots = [
      { x: 2, y: 2 },
      { x: w - 3, y: 2 },
      { x: Math.floor(w / 2), y: h - 3 }
    ];
    const capitalByFaction = {};
    factionDefs.forEach((f, i) => {
      const spot = capitalSpots[i];
      const t = mapState.tiles[M.tileKey(spot.x, spot.y)];
      t.type = 'capital';
      t.ownerFactionId = f.id;
      t.name = f.name + '主城';
      capitalByFaction[f.id] = spot;
    });

    const resourcePool = ['wood', 'stone', 'gold', 'food'];
    let resourceCount = 0, monsterCount = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const t = mapState.tiles[M.tileKey(x, y)];
        if (t.type !== 'empty') continue;
        const nearCapital = capitalSpots.some((c) => Math.abs(c.x - x) <= 1 && Math.abs(c.y - y) <= 1);
        if (nearCapital) continue;
        const roll = Math.random();
        if (roll < 0.12 && resourceCount < 18) {
          t.type = 'resource';
          t.resourceType = resourcePool[resourceCount % resourcePool.length];
          t.guardPower = U.randomInt(40, 160);
          t.yieldPerMin = Math.max(2, Math.round(t.guardPower / 20));
          t.name = D.RESOURCE_NAMES[t.resourceType] + '產地';
          t.ownerFactionId = null;
          resourceCount++;
        } else if (roll < 0.18 && monsterCount < 14) {
          t.type = 'monster';
          t.guardPower = U.randomInt(80, 300);
          t.name = '野外賊寇';
          t.cooldownUntil = 0;
          monsterCount++;
        }
      }
    }
    return capitalByFaction;
  }

  function tileAt(mapState, x, y) { return mapState.tiles[M.tileKey(x, y)]; }
  function capitalTileOf(mapState, factionId) {
    return Object.values(mapState.tiles).find((t) => t.type === 'capital' && t.ownerFactionId === factionId);
  }

  /**
   * 擊破產地守軍後永久佔領：設定擁有者、發放一次性攻佔獎勵，
   * 之後不再需要重新攻打，改由 economySystem 依 yieldPerMin 持續結算。
   */
  function captureResourceTile(playerState, tile, lootBonusPct, now) {
    tile.ownerFactionId = playerState.factionId;
    const captureMul = 1 + (lootBonusPct || 0) / 100;
    const captureBonus = Math.round(tile.guardPower * 1.5 * captureMul);
    const eff = window.Game.Systems.Economy.computeEffects(playerState);
    playerState.resources[tile.resourceType] = U.clamp(playerState.resources[tile.resourceType] + captureBonus, 0, eff.storageCap[tile.resourceType]);
  }

  function ownedResourceTiles(mapState, factionId) {
    return Object.values(mapState.tiles).filter((t) => t.type === 'resource' && t.ownerFactionId === factionId);
  }

  function ownedResourceYieldPerMin(mapState, factionId) {
    const totals = { food: 0, wood: 0, stone: 0, gold: 0 };
    ownedResourceTiles(mapState, factionId).forEach((t) => { totals[t.resourceType] += t.yieldPerMin; });
    return totals;
  }

  window.Game.Systems.Map = {
    generateMap, tileAt, capitalTileOf, captureResourceTile, ownedResourceTiles, ownedResourceYieldPerMin
  };
})();
