/* ============================================================================
 * mapSystem.js — 世界地圖生成與產地／城池佔領。
 * 對應舊版 js/state.js 的 generateWorld() 與 js/army.js 的產地佔領分支。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;
  const M = window.Game.Models;

  /** 各勢力歷史首都名稱（取代原本泛用的「XX主城」）。 */
  const CAPITAL_NAMES = { shu: '成都', wei: '洛陽', wu: '建業' };

  /**
   * 每個勢力自己的「本土」城池（不含首都），開局皆為叛軍佔據（ownerFactionId 為
   * null），需玩家/該勢力 AI 自行出兵收復；收復後即成為該勢力的第二座城池，
   * 可獨立升級建築、貢獻資源產出。座標為相對於該勢力首都的位移量，實際座標在
   * generateMap() 依地圖尺寸換算並夾在邊界內。
   */
  const HOME_CITY_OFFSETS = {
    shu: [
      { dx: 5, dy: -1, name: '綿竹' },
      { dx: -1, dy: 5, name: '江州' },
      { dx: 6, dy: 6, name: '巴郡' },
      { dx: 2, dy: 9, name: '永安' },
      { dx: 9, dy: 2, name: '漢中' }
    ],
    wei: [
      { dx: -5, dy: -1, name: '鄴城' },
      { dx: 1, dy: 5, name: '宛城' },
      { dx: -6, dy: 6, name: '長安' },
      { dx: -2, dy: 9, name: '合肥' },
      { dx: -9, dy: 2, name: '壽春' }
    ],
    wu: [
      { dx: 0, dy: -5, name: '柴桑' },
      { dx: -7, dy: -2, name: '廬江' },
      { dx: 7, dy: -2, name: '會稽' },
      { dx: -4, dy: 2, name: '豫章' },
      { dx: 4, dy: 2, name: '交趾' }
    ]
  };

  /* ------------------------------------------------------------------------
   * 資源格等級：baseYieldPerMin／baseGuardPower 是生成時定下、永遠不變的基準值；
   * 目前的 yieldPerMin／guardPower 一律由 applyTileLevel() 依 level 從基準值重新
   * 算出（絕不直接疊乘 yieldPerMin/guardPower 本身，避免升級或存讀檔造成複利式
   * 灌水）。等級只能靠佔領後花資源升級取得，但少數格子開局就落在較高等級——
   * 產量更高，駐守的守備力也同步更高，需要更強的兵力才能打下來。
   * ------------------------------------------------------------------------ */
  const TILE_LEVEL_MAX = 5;
  function tileLevelYieldMul(level) { return 1 + 0.5 * ((level || 1) - 1); }
  function tileLevelGuardMul(level) { return 1 + 0.35 * ((level || 1) - 1); }

  /** 依 tile.level 與基準值重算目前的 yieldPerMin／guardPower。 */
  function applyTileLevel(t) {
    const lvl = t.level || 1;
    t.yieldPerMin = Math.max(1, Math.round((t.baseYieldPerMin || 1) * tileLevelYieldMul(lvl)));
    t.guardPower = Math.max(1, Math.round((t.baseGuardPower || 1) * tileLevelGuardMul(lvl)));
  }

  /** 開局約 15% 的資源格／土地格落在較高等級（2~3 級）：產量與守備力開局就比同類型格子高。 */
  function rollInitialTileLevel() { return Math.random() < 0.15 ? U.randomInt(2, 3) : 1; }

  function capitalSpotsFor(w, h) {
    const margin = Math.max(3, Math.round(w * 0.14));
    return {
      shu: { x: margin, y: margin },
      wei: { x: w - 1 - margin, y: margin },
      wu: { x: Math.floor(w / 2), y: h - 1 - margin }
    };
  }

  /**
   * 在既有（空白）MapState 上放置各勢力首都、各勢力本土城池（叛軍佔據）、
   * 產地與野怪營地。產地／野怪的擺放以「離哪個首都最近」把整張地圖分成三個
   * 大致相等的區域，各區域各自保證固定數量，避免像原本純隨機那樣可能讓
   * 某個勢力附近完全沒有資源點。
   * @param {MapState} mapState
   * @param {FactionDef[]} factionDefs
   * @returns {Object<string,{x:number,y:number}>} 各勢力首都落點座標，供
   *   newGameSystem 用來建立對應的 CityState。
   */
  function generateMap(mapState, factionDefs) {
    const w = mapState.width, h = mapState.height;
    const capitalSpots = capitalSpotsFor(w, h);
    const capitalByFaction = {};
    const reserved = new Set();

    factionDefs.forEach((f) => {
      const spot = capitalSpots[f.id];
      const t = mapState.tiles[M.tileKey(spot.x, spot.y)];
      t.type = 'capital';
      t.ownerFactionId = f.id;
      t.name = CAPITAL_NAMES[f.id] || (f.name + '首都');
      capitalByFaction[f.id] = spot;
      reserved.add(M.tileKey(spot.x, spot.y));
    });

    factionDefs.forEach((f) => {
      const cap = capitalSpots[f.id];
      (HOME_CITY_OFFSETS[f.id] || []).forEach((spot) => {
        const x = U.clamp(cap.x + spot.dx, 1, w - 2);
        const y = U.clamp(cap.y + spot.dy, 1, h - 2);
        const key = M.tileKey(x, y);
        if (reserved.has(key)) return; // 極端小地圖時避免座標碰撞，寧可少一座城池也不覆蓋既有的格子。
        reserved.add(key);
        const t = mapState.tiles[key];
        t.type = 'city';
        t.name = spot.name;
        t.homeFactionId = f.id;
        t.ownerFactionId = null;
        t.cityId = 'city_' + key;
        const distFromHome = U.tileDistance(cap, { x, y });
        t.guardPower = U.randomInt(50, 90) + distFromHome * 6;
      });
    });

    // 依「離哪個首都最近」把全地圖（含已放置城池的格子）都標上所屬區域
    // （regionFactionId），一方面用來把空地分成三個區域各自獨立保證固定數量的
    // 產地／野怪，避免像原本純隨機那樣可能讓某個勢力附近完全沒有資源點；
    // 另一方面地圖畫面也會依此替每個區域上一層淡淡的勢力色調，方便玩家一眼
    // 看出地圖上哪一塊大致是哪個勢力的地盤。
    const regionTiles = {};
    factionDefs.forEach((f) => { regionTiles[f.id] = []; });
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const key = M.tileKey(x, y);
        let closest = factionDefs[0].id, closestDist = Infinity;
        factionDefs.forEach((f) => {
          const d = U.tileDistance(capitalByFaction[f.id], { x, y });
          if (d < closestDist) { closestDist = d; closest = f.id; }
        });
        mapState.tiles[key].regionFactionId = closest;
        if (reserved.has(key)) continue;
        regionTiles[closest].push(mapState.tiles[key]);
      }
    }

    const resourcePool = ['wood', 'stone', 'gold', 'food'];
    const RESOURCE_PER_REGION = 10;
    const MONSTER_PER_REGION = 8;
    factionDefs.forEach((f) => {
      const tiles = shuffle(regionTiles[f.id].slice());
      let idx = 0, resourceCount = 0, monsterCount = 0;
      while (idx < tiles.length && (resourceCount < RESOURCE_PER_REGION || monsterCount < MONSTER_PER_REGION)) {
        const t = tiles[idx++];
        if (resourceCount < RESOURCE_PER_REGION && (monsterCount >= MONSTER_PER_REGION || Math.random() < 0.6)) {
          t.type = 'resource';
          t.resourceType = resourcePool[resourceCount % resourcePool.length];
          t.baseGuardPower = U.randomInt(40, 160);
          t.baseYieldPerMin = Math.max(2, Math.round(t.baseGuardPower / 20));
          t.name = D.RESOURCE_NAMES[t.resourceType] + '產地';
          t.ownerFactionId = null;
          t.level = rollInitialTileLevel();
          applyTileLevel(t);
          resourceCount++;
        } else if (monsterCount < MONSTER_PER_REGION) {
          t.type = 'monster';
          t.guardPower = U.randomInt(80, 300);
          t.name = '野外賊寇';
          t.cooldownUntil = 0;
          monsterCount++;
        }
      }
    });

    generateTerrain(mapState, factionDefs, capitalByFaction);
    convertEmptyTilesToLand(mapState);

    return capitalByFaction;
  }

  /* ------------------------------------------------------------------------
   * 土地格（率土之濱式「整張地圖都是地」）：地圖上不再有無意義的空地，每一格
   * 都是可佔領的土地——依地形化為農田／聚落／林地／山岩／漁場，守備力隨離
   * 首都的距離遞增、佔領後有少量固定產出。土地格直接沿用 type 'resource' 的
   * 全部既有機制（連鎖佔領、戰鬥、經濟產出、AI 擴張），僅以 isLand 標記
   * 供地圖畫面改用田野質感呈現（不畫資源圖示）。
   * ------------------------------------------------------------------------ */
  const LAND_PROFILE_BY_TERRAIN = {
    mountain: { resourceType: 'stone', name: '山岩' },
    forest: { resourceType: 'wood', name: '林地' },
    water: { resourceType: 'food', name: '漁場' }
  };

  function makeLandTile(t, capitals) {
    const dist = capitals.length ? Math.min.apply(null, capitals.map((c) => U.tileDistance(c, t))) : 5;
    const profile = LAND_PROFILE_BY_TERRAIN[t.terrain]
      || (Math.random() < 0.2 ? { resourceType: 'gold', name: '聚落' } : { resourceType: 'food', name: '農田' });
    t.type = 'resource';
    t.isLand = true;
    t.ownerFactionId = null;
    t.resourceType = profile.resourceType;
    t.name = profile.name;
    t.baseGuardPower = 15 + dist * 4 + U.randomInt(0, 20);
    t.baseYieldPerMin = 1 + Math.round(t.baseGuardPower / 60);
    t.level = rollInitialTileLevel();
    applyTileLevel(t);
  }

  /** 把地圖上所有剩餘空地轉為可佔領的土地格。開新地圖與舊存檔載入時共用。 */
  function convertEmptyTilesToLand(mapState) {
    const capitals = Object.values(mapState.tiles).filter((t) => t.type === 'capital');
    Object.values(mapState.tiles).forEach((t) => { if (t.type === 'empty') makeLandTile(t, capitals); });
  }

  /**
   * 地形生成：以「種子＋擴散」灑出成片的山地／森林／水域（比逐格純隨機更像
   * 自然地貌），首都與其相鄰格保持平原（出生點不受地形懲罰）；最後在每兩個
   * 首都連線的中點附近，挑一座最近的城池升格為「關隘」——山地要衝、易守難攻，
   * 守備力同步提高，成為勢力之間兵家必爭的隘口。
   */
  function generateTerrain(mapState, factionDefs, capitalByFaction) {
    const w = mapState.width, h = mapState.height;
    const capitals = factionDefs.map((f) => capitalByFaction[f.id]);
    const nearCapital = (x, y) => capitals.some((c) => U.tileDistance(c, { x, y }) <= 2);

    function sprinkle(terrain, seedCount, radius) {
      for (let s = 0; s < seedCount; s++) {
        const cx = U.randomInt(1, w - 2), cy = U.randomInt(1, h - 2);
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const x = cx + dx, y = cy + dy;
            if (x < 0 || y < 0 || x >= w || y >= h) continue;
            if (Math.abs(dx) + Math.abs(dy) > radius) continue; // 菱形擴散，邊緣自然收束
            if (Math.random() < 0.25) continue; // 打散邊界，避免整齊方塊
            if (nearCapital(x, y)) continue;
            mapState.tiles[M.tileKey(x, y)].terrain = terrain;
          }
        }
      }
    }

    sprinkle('mountain', 6, 2);
    sprinkle('forest', 8, 2);
    sprinkle('water', 4, 1);

    // 關隘：每對首都連線中點附近最近的一座城池（5 格內）升格為關隘。
    for (let i = 0; i < capitals.length; i++) {
      for (let j = i + 1; j < capitals.length; j++) {
        const mid = { x: Math.round((capitals[i].x + capitals[j].x) / 2), y: Math.round((capitals[i].y + capitals[j].y) / 2) };
        let best = null, bestD = Infinity;
        Object.values(mapState.tiles).forEach((t) => {
          if (t.type !== 'city' || t.terrain === 'pass') return;
          const d = U.tileDistance(mid, t);
          if (d < bestD) { bestD = d; best = t; }
        });
        if (best && bestD <= 5) {
          best.terrain = 'pass';
          best.guardPower = Math.round((best.guardPower || 80) * 1.5);
        }
      }
    }
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
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

  /** 把一格資源格／土地格從目前等級升到下一級所需的木材／石料花費，隨等級與基準產量提高。 */
  function resourceTileUpgradeCost(tile) {
    const lvl = tile.level || 1;
    const scale = Math.round((tile.baseYieldPerMin || 1) * 25 * lvl);
    return { wood: scale, stone: Math.round(scale * 0.6) };
  }

  /** 已佔領的資源格／土地格花資源升級一級：產量與守備力一併依 applyTileLevel 提高
   *（守備力提高只影響「敵人之後想搶走這格」的難度，不影響現任擁有者，永久佔領不需再駐守）。 */
  function upgradeResourceTile(playerState, tile) {
    if (!tile || tile.type !== 'resource') return { ok: false, reason: '此地無法升級' };
    if (tile.ownerFactionId !== playerState.factionId) return { ok: false, reason: '尚未佔領此地，無法升級' };
    const level = tile.level || 1;
    if (level >= TILE_LEVEL_MAX) return { ok: false, reason: '已達最高等級' };
    const cost = resourceTileUpgradeCost(tile);
    if (!U.canAfford(playerState.resources, cost)) return { ok: false, reason: '資源不足' };
    U.subtractResources(playerState.resources, cost);
    tile.level = level + 1;
    applyTileLevel(tile);
    return { ok: true };
  }

  /**
   * 攻下一座城池格（不論原本是叛軍佔據還是敵勢力城池）：原擁有者（如果是某個
   * 勢力而非叛軍）失去這座城池，攻方獲得一座全新的城池（建築從 0 級重新開始，
   * 不會繼承原本的建設進度，避免打下敵方重兵發展的城池就直接原封不動接收帶來
   * 的雪球效應）。
   * @param {SaveGame} saveGame
   * @param {PlayerState} playerState 攻方。
   * @param {TileState} tile
   * @param {number} now
   */
  function captureCityTile(saveGame, playerState, tile, now) {
    if (tile.ownerFactionId && saveGame.players[tile.ownerFactionId]) {
      delete saveGame.players[tile.ownerFactionId].cities[tile.cityId];
    }
    const city = M.createCityState(tile.cityId, playerState.factionId, tile.name, tile.x, tile.y, now);
    playerState.cities[tile.cityId] = city;
    tile.ownerFactionId = playerState.factionId;
  }

  function ownedResourceTiles(mapState, factionId) {
    return Object.values(mapState.tiles).filter((t) => t.type === 'resource' && t.ownerFactionId === factionId);
  }

  function ownedResourceYieldPerMin(mapState, factionId) {
    const totals = { food: 0, wood: 0, stone: 0, gold: 0 };
    ownedResourceTiles(mapState, factionId).forEach((t) => { totals[t.resourceType] += t.yieldPerMin; });
    return totals;
  }

  /** 某勢力尚未收復／攻下的城池格（含自己本土仍被叛軍佔據、以及其他勢力的城池）。 */
  function capturableCityTiles(mapState, factionId) {
    return Object.values(mapState.tiles).filter((t) => t.type === 'city' && t.ownerFactionId !== factionId);
  }

  /* ------------------------------------------------------------------------
   * 連鎖佔領（率土之濱式領土機制）：出兵只能打「與自己領土相鄰」的目標，
   * 攻下後領土延伸、才解鎖更外圍的目標，逼出前線與戰略縱深，而不是開局
   * 就能瞬移攻打地圖任一角落。領土 = 首都＋已收復城池＋已佔產地；相鄰的
   * 判定用 Chebyshev 距離（八方向）在 TERRITORY_REACH 格以內。
   * ------------------------------------------------------------------------ */
  const TERRITORY_REACH = 2;

  /** 一個勢力目前實際擁有的領土格（首都、已收復城池、已佔產地）。 */
  function ownedTiles(mapState, factionId) {
    return Object.values(mapState.tiles).filter((t) =>
      ((t.type === 'capital' || t.type === 'city' || t.type === 'resource') && t.ownerFactionId === factionId));
  }

  /** 這一格對該勢力而言是不是「可出兵攻打的目標型別」（型別對、且不是自己已擁有的）。 */
  function isValidAttackTarget(tile, factionId) {
    if (!tile) return false;
    if (tile.type === 'resource') return !tile.ownerFactionId; // 敵方已佔的產地搶不了，只能打無主產地。
    if (tile.type === 'monster') return true;
    if (tile.type === 'city') return tile.ownerFactionId !== factionId; // 叛軍佔據或敵方城池。
    if (tile.type === 'capital') return tile.ownerFactionId !== factionId; // 敵方主城（襲擾）。
    return false;
  }

  /** 該勢力領土向外延伸 TERRITORY_REACH 格所覆蓋到的全部格 key（含領土本身），用於地圖上顯示勢力範圍。 */
  function territoryReachKeys(mapState, factionId) {
    const keys = new Set();
    const w = mapState.width, h = mapState.height;
    ownedTiles(mapState, factionId).forEach((t) => {
      for (let dy = -TERRITORY_REACH; dy <= TERRITORY_REACH; dy++) {
        for (let dx = -TERRITORY_REACH; dx <= TERRITORY_REACH; dx++) {
          const x = t.x + dx, y = t.y + dy;
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          keys.add(M.tileKey(x, y));
        }
      }
    });
    return keys;
  }

  /**
   * 該勢力目前「可以出兵攻打」的所有目標格 key。原則上是落在領土範圍內的有效目標；
   * 若完全沒有任何相鄰目標（例如開局附近剛好沒有據點），則以安全網開放距離領土最近的
   * 一個目標，確保永遠有路可擴張、不會卡死。
   */
  function attackableTargetKeys(mapState, factionId) {
    const reach = territoryReachKeys(mapState, factionId);
    const targets = Object.values(mapState.tiles).filter((t) => isValidAttackTarget(t, factionId));
    const keys = new Set(targets.filter((t) => reach.has(t.id)).map((t) => t.id));
    if (keys.size === 0 && targets.length) {
      const owned = ownedTiles(mapState, factionId);
      let best = null, bestD = Infinity;
      targets.forEach((t) => {
        const d = owned.length ? Math.min.apply(null, owned.map((o) => U.tileDistance(o, t))) : Infinity;
        if (d < bestD) { bestD = d; best = t; }
      });
      if (best) keys.add(best.id);
    }
    return keys;
  }

  /**
   * 判斷某勢力現在能不能對某格出兵，回傳 {ok, reason}。供出兵入口（armySystem）、
   * 地圖資訊面板（mapScreen）與 AI（aiSystem）共用同一條規則。
   */
  function canAttackTile(mapState, factionId, tile) {
    if (!isValidAttackTarget(tile, factionId)) return { ok: false, reason: '此處無法出兵。' };
    if (!attackableTargetKeys(mapState, factionId).has(tile.id)) {
      return { ok: false, reason: '此地尚未與你的領土相鄰，無法出兵。先佔領鄰近的據點或城池，領土才能延伸過去。' };
    }
    return { ok: true };
  }

  window.Game.Systems.Map = {
    TERRITORY_REACH, TILE_LEVEL_MAX,
    generateMap, convertEmptyTilesToLand, tileAt, capitalTileOf, captureResourceTile, captureCityTile,
    ownedResourceTiles, ownedResourceYieldPerMin, capturableCityTiles,
    ownedTiles, isValidAttackTarget, territoryReachKeys, attackableTargetKeys, canAttackTile,
    resourceTileUpgradeCost, upgradeResourceTile, applyTileLevel
  };
})();
