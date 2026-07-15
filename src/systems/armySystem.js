/* ============================================================================
 * armySystem.js — 練兵佇列、部隊整編、行軍排程。
 * 戰鬥結算本身（到達目標後打不打得贏）交給 combatSystem，這裡只負責移動的
 * 時間計算與狀態轉換。對應舊版 js/army.js 的行軍／練兵／整編部分。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;
  const M = window.Game.Models;

  const MARCH_MS_PER_TILE = 16000; // 基準：速度 5 的部隊，每格地圖耗時 16 秒
  const MAX_TRAIN_QUEUE_LEN = 5;

  function unitCount(army) { return Object.values(army.units).reduce((s, n) => s + (n || 0), 0); }

  function leadershipUsed(army) {
    return Object.keys(army.units).reduce((s, u) => s + (army.units[u] || 0) * D.unitDefById(u).leadership, 0);
  }

  /** 一個勢力全部部隊（不論駐守或行軍中）合計佔用的統率需求，用於人口/統率上限判定。 */
  function leadershipUsedByFaction(playerState) {
    return Object.values(playerState.armies).reduce((s, a) => s + leadershipUsed(a), 0);
  }

  function slowestSpeed(army) {
    const speeds = Object.keys(army.units).filter((u) => army.units[u] > 0).map((u) => D.unitDefById(u).stats.speed);
    return speeds.length ? Math.min(...speeds) : 5;
  }

  function marchDurationMs(army, distanceTiles, speedBonus) {
    const speed = (slowestSpeed(army) || 5) + (speedBonus || 0);
    return Math.round(distanceTiles * MARCH_MS_PER_TILE * (5 / speed));
  }

  /** 部隊全隊武將已裝備坐騎提供的行軍速度加成（讓坐騎的 speedBonus 實際生效）。 */
  function armySpeedBonus(playerState, army) {
    const ids = [army.heroStateId].concat(army.subHeroStateIds || []).filter(Boolean);
    let bonus = 0;
    ids.forEach((id) => {
      const hs = playerState.heroes[id];
      const mount = hs && hs.equipment && hs.equipment.mount && D.itemDefById(hs.equipment.mount);
      if (mount && mount.effect && mount.effect.speedBonus) bonus += mount.effect.speedBonus;
    });
    return bonus;
  }

  /** 主城：軍事／內政建築（兵營、校場、工坊、酒館、學院、城牆）只存在於主城，
   *  訓練部隊、招募、研究一律以此為準。用 isCapital 找，不依賴字典插入順序。 */
  function primaryCity(playerState) {
    const cities = Object.values(playerState.cities);
    return cities.find((c) => c.isCapital) || cities[0];
  }

  function getOrCreateHomeArmy(playerState) {
    let army = Object.values(playerState.armies).find((a) => a.status === 'garrison');
    if (!army) {
      army = M.createArmyState(playerState.factionId, '駐守部隊', {});
      playerState.armies[army.id] = army;
    }
    return army;
  }

  function createArmyFromGarrison(playerState, name, heroStateId, unitsWanted) {
    const home = getOrCreateHomeArmy(playerState);
    const takeUnits = {};
    Object.keys(unitsWanted).forEach((type) => {
      const want = unitsWanted[type] || 0;
      const have = home.units[type] || 0;
      const take = Math.min(want, have);
      if (take > 0) { takeUnits[type] = take; home.units[type] = have - take; }
    });
    if (Object.keys(takeUnits).length === 0) return null;
    const army = M.createArmyState(playerState.factionId, name || '遠征軍', takeUnits);
    army.heroStateId = heroStateId || null;
    playerState.armies[army.id] = army;
    return army;
  }

  function formNewArmyFromHalf(playerState) {
    const home = getOrCreateHomeArmy(playerState);
    const unitsWanted = {};
    Object.keys(home.units).forEach((type) => {
      const half = Math.floor((home.units[type] || 0) / 2);
      if (half > 0) unitsWanted[type] = half;
    });
    if (Object.keys(unitsWanted).length === 0) return { ok: false, reason: '兵力不足，無法拆分部隊' };
    const army = createArmyFromGarrison(playerState, '第 ' + (Object.keys(playerState.armies).length + 1) + ' 軍', null, unitsWanted);
    if (!army) return { ok: false, reason: '拆分失敗' };
    return { ok: true, army };
  }

  function disbandArmyIntoHome(playerState, armyId) {
    const army = playerState.armies[armyId];
    if (!army || army.status !== 'garrison') return false;
    const home = getOrCreateHomeArmy(playerState);
    if (home.id !== army.id) {
      Object.keys(army.units).forEach((t) => { home.units[t] = (home.units[t] || 0) + army.units[t]; });
      // 解散前先卸下全隊武將，否則武將的 assignedArmyId 會停留在已刪除的部隊 id，
      // 之後永遠無法再被指派給任何部隊（heroScreen/armyScreen/aiSystem 都靠
      // assignedArmyId 判斷武將是否「可指派」）。
      window.Game.Systems.Hero.unassignHero(playerState, army);
      delete playerState.armies[army.id];
    }
    return true;
  }

  function sendArmyToTile(saveGame, playerState, armyId, targetTile, purpose, now) {
    const army = playerState.armies[armyId];
    if (!army) return { ok: false, reason: '找不到部隊' };
    if (army.status !== 'garrison') return { ok: false, reason: '部隊行軍中' };
    if (unitCount(army) === 0) return { ok: false, reason: '部隊沒有兵力' };
    if (!army.heroStateId) return { ok: false, reason: '尚未指派主將，無法出征——請先指派一名主將帶隊' };
    const leadershipCap = window.Game.Systems.Hero.armyLeadershipCap(playerState, army);
    if (leadershipUsed(army) > leadershipCap) {
      return { ok: false, reason: '兵力超出主將可統帥的上限（' + leadershipUsed(army) + '/' + leadershipCap + '），請指派更多副將或減少兵力' };
    }
    const targetTileState = saveGame.map.tiles[M.tileKey(targetTile.x, targetTile.y)];
    const reachable = window.Game.Systems.Map.canAttackTile(saveGame.map, playerState.factionId, targetTileState);
    if (!reachable.ok) return { ok: false, reason: reachable.reason };
    const city = primaryCity(playerState);
    const origin = { x: city.tileX, y: city.tileY };
    const dist = U.tileDistance(origin, targetTile) || 1;
    // 地形影響行軍：往山地／關隘等難行地形進軍時耗時增加（回程輕裝走原路，不再受罰）。
    const terrainMul = D.terrainDefOf ? D.terrainDefOf(targetTileState).marchMul : 1;
    const travel = Math.round(marchDurationMs(army, dist, armySpeedBonus(playerState, army)) * terrainMul);
    army.status = 'marching';
    army.departAt = now;
    army.arriveAt = now + travel;
    army.originCityId = city.id;
    army.targetTileId = M.tileKey(targetTile.x, targetTile.y);
    army.purpose = purpose;
    return { ok: true, etaMs: travel };
  }

  function startReturn(playerState, army, now) {
    const city = playerState.cities[army.originCityId] || primaryCity(playerState);
    const origin = { x: city.tileX, y: city.tileY };
    let target = origin;
    if (army.targetTileId) {
      const parts = army.targetTileId.split('_');
      target = { x: parseInt(parts[0], 10), y: parseInt(parts[1], 10) };
    }
    const dist = U.tileDistance(origin, target) || 1;
    const travel = marchDurationMs(army, dist, armySpeedBonus(playerState, army));
    army.status = 'returning';
    army.departAt = now;
    army.arriveAt = now + travel;
  }

  function resolveArmies(saveGame, playerState, now) {
    Object.values(playerState.armies).forEach((army) => {
      if (army.status === 'marching' && now >= army.arriveAt) {
        window.Game.Systems.Combat.resolveArmyArrival(saveGame, playerState, army, now);
      } else if (army.status === 'returning' && now >= army.arriveAt) {
        army.status = 'garrison';
        army.originCityId = null;
        army.targetTileId = null;
        army.purpose = null;
      }
    });
  }

  function trainableUnitIds(buildingType) { return D.UNIT_IDS.filter((u) => D.UNIT_DEFS[u].trainedBy === buildingType); }

  function canQueueTraining(playerState, city, buildingType, unitDefId, qty) {
    const b = city.buildings[buildingType];
    if (!b || b.level <= 0) return { ok: false, reason: '需先建造' + D.buildingDefById(buildingType).name };
    const unit = D.unitDefById(unitDefId);
    const ld = D.buildingLevelDef(buildingType, b.level);
    if (unit.tier > (ld.effect.unlockUnitTier || 1)) return { ok: false, reason: D.buildingDefById(buildingType).name + '等級不足，尚未解鎖此兵種' };
    if (b.trainQueue.length >= MAX_TRAIN_QUEUE_LEN) return { ok: false, reason: '訓練佇列已滿' };
    const cost = {};
    Object.keys(unit.cost).forEach((r) => { cost[r] = unit.cost[r] * qty; });
    if (!U.canAfford(playerState.resources, cost)) return { ok: false, reason: '資源不足' };
    // 訓練完成時只會依統率上限授予兵力（resolveTrainQueues），超出的部分作廢；
    // 這裡先擋下顯然會超出上限的訓練，避免玩家白白花資源訓練出一批完成後被作廢的兵。
    const eff = window.Game.Systems.Economy.computeEffects(playerState);
    const room = Math.max(0, Math.floor((eff.popCap - leadershipUsedByFaction(playerState)) / unit.leadership));
    if (room < qty) return { ok: false, reason: '統率上限不足，無法容納這批新兵' };
    return { ok: true, cost, unit };
  }

  function queueTraining(playerState, city, buildingType, unitDefId, qty, now) {
    const check = canQueueTraining(playerState, city, buildingType, unitDefId, qty);
    if (!check.ok) return check;
    U.subtractResources(playerState.resources, check.cost);
    const eff = window.Game.Systems.Economy.computeEffects(playerState);
    const mul = eff.trainSpeedMul[buildingType] * (1 + (eff.trainSpeedPct || 0) / 100);
    const timeMs = Math.round((check.unit.trainTimeMs * qty) / mul);
    const b = city.buildings[buildingType];
    const prevTail = b.trainQueue.length ? b.trainQueue[b.trainQueue.length - 1].completeAt : now;
    const startAt = Math.max(now, prevTail);
    b.trainQueue.push({ unitDefId, qty, startAt, completeAt: startAt + timeMs });
    return { ok: true };
  }

  /** 訓練完成時依統率上限（而非直接無條件發放）授予兵力，超出上限的部分作廢並退還無法退還的兵力提示由 UI 處理。 */
  function resolveTrainQueues(playerState, city, now) {
    ['barracks', 'drillground', 'workshop'].forEach((bt) => {
      const b = city.buildings[bt];
      while (b.trainQueue.length && now >= b.trainQueue[0].completeAt) {
        const item = b.trainQueue.shift();
        const eff = window.Game.Systems.Economy.computeEffects(playerState);
        const cap = eff.popCap;
        const used = leadershipUsedByFaction(playerState);
        const leadershipPerUnit = D.unitDefById(item.unitDefId).leadership;
        const room = Math.max(0, Math.floor((cap - used) / leadershipPerUnit));
        const grant = Math.min(item.qty, room);
        const home = getOrCreateHomeArmy(playerState);
        home.units[item.unitDefId] = (home.units[item.unitDefId] || 0) + grant;
      }
    });
  }

  window.Game.Systems.Army = {
    MARCH_MS_PER_TILE,
    unitCount, leadershipUsed, leadershipUsedByFaction, slowestSpeed, marchDurationMs, armySpeedBonus,
    primaryCity, getOrCreateHomeArmy, createArmyFromGarrison, formNewArmyFromHalf, disbandArmyIntoHome,
    sendArmyToTile, startReturn, resolveArmies,
    trainableUnitIds, canQueueTraining, queueTraining, resolveTrainQueues
  };
})();
