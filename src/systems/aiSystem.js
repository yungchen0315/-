/* ============================================================================
 * aiSystem.js — AI 勢力（單機簡化版）：定期成長、偶爾擴張與防守。
 * 不做完整決策樹，只用機率化的簡單規則；全部呼叫方式與玩家共用同一組系統函式，
 * 避免玩家與 AI 判定不一致的隱性 bug。對應舊版 js/ai.js。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;

  function tick(saveGame, now) {
    Object.values(saveGame.players).forEach((playerState) => {
      if (!playerState.isHuman && !playerState.defeated) runAiPlayer(saveGame, playerState, now);
    });
  }

  function runAiPlayer(saveGame, playerState, now) {
    tryUpgrade(playerState, now);
    tryTrain(playerState, now);
    tryResearch(playerState, now);
    tryRecruit(playerState);
    tryAssignGenerals(playerState);
    tryEquip(playerState);
    tryMarch(saveGame, playerState, now);
  }

  /** 部隊出征需要主將帶隊（統率決定帶兵上限，多武將的統率上限相加、戰力也一起
   *  疊加），把手上還沒編隊的武將盡量塞進駐守部隊（先補主將，再補滿副將），
   *  讓 AI 一拿到武將（開局起始武將／酒館抽到）就能發揮戰力、也能帶更多兵出征。 */
  function tryAssignGenerals(playerState) {
    const Hero = window.Game.Systems.Hero;
    const idle = Object.values(playerState.heroes).filter((h) => !h.assignedArmyId);
    if (!idle.length) return;
    const garrisonArmies = Object.values(playerState.armies).filter((a) => a.status === 'garrison');
    garrisonArmies.forEach((army) => {
      while (idle.length && (!army.heroStateId || (army.subHeroStateIds || []).length < Hero.SQUAD_SUB_MAX)) {
        const hero = idle.shift();
        if (!Hero.assignHeroToArmy(playerState, hero.heroDataId, army).ok) { idle.unshift(hero); break; }
      }
    });
  }

  /** 把武將身上還空著的裝備／戰法欄位，用庫存裡還沒用掉的東西補滿（裝備挑最高
   *  tier、戰法挑第一個可用的），讓 AI 抽到的獎池結果實際發揮效果，而不是堆在
   *  倉庫裡沒用——跟玩家手動裝配的效果完全一致，只是自動化決策。 */
  function tryEquip(playerState) {
    const Hero = window.Game.Systems.Hero;
    Object.keys(playerState.heroes).forEach((heroId) => {
      const hs = playerState.heroes[heroId];
      D.ITEM_SLOTS.forEach((slot) => {
        if (hs.equipment[slot]) return;
        const owned = Object.keys(playerState.inventory || {})
          .filter((itemId) => (playerState.inventory[itemId] || 0) > 0 && D.itemDefById(itemId) && D.itemDefById(itemId).slot === slot)
          .sort((a, b) => D.itemDefById(b).tier - D.itemDefById(a).tier);
        if (owned.length) Hero.equipItem(playerState, heroId, owned[0]);
      });
      if ((hs.tactics || []).length >= Hero.TACTIC_SLOTS) return;
      const available = Hero.availableTacticsForHero(playerState, heroId);
      available.forEach((t) => { if (hs.tactics.length < Hero.TACTIC_SLOTS) Hero.equipTactic(playerState, heroId, t.id); });
    });
  }

  // 全部使用 aiTick 傳入的模擬時間 now，不能用 U.now()（真實系統時間）——
  // 離線追趕時 now 可能是幾十小時前的模擬時間點，用真實時間會讓補算出的
  // 升級／訓練／研究完成時間全部被推到「現在」之後，導致離線期間 AI 完全長不大。
  function tryUpgrade(playerState, now) {
    const city = window.Game.Systems.Army.primaryCity(playerState);
    if (!city) return;
    const CityBuilding = window.Game.Systems.CityBuilding;
    if (CityBuilding.hasActiveUpgrade(city)) return;
    // 主城等級決定其他建築能升到的上限（見 cityBuildingSystem.canStartUpgrade），
    // 隨機挑建築升級會讓主城長期落後、卡住整座城的發展，優先把主城升上去。
    const capitalCheck = CityBuilding.canStartUpgrade(city, 'capital');
    if (capitalCheck.ok && U.canAfford(playerState.resources, capitalCheck.info.cost)) {
      CityBuilding.startUpgrade(playerState, city, 'capital', now);
      return;
    }
    const candidates = D.BUILDING_ORDER.filter((type) => {
      if (type === 'capital') return false;
      const check = CityBuilding.canStartUpgrade(city, type);
      return check.ok && U.canAfford(playerState.resources, check.info.cost);
    });
    if (candidates.length === 0) return;
    CityBuilding.startUpgrade(playerState, city, U.choice(candidates), now);
  }

  function tryTrain(playerState, now) {
    const city = window.Game.Systems.Army.primaryCity(playerState);
    if (!city) return;
    const Army = window.Game.Systems.Army;
    ['barracks', 'drillground'].forEach((bt) => {
      if (city.buildings[bt].level <= 0) return;
      if (city.buildings[bt].trainQueue.length > 0) return;
      const units = Army.trainableUnitIds(bt).filter((u) => Army.canQueueTraining(playerState, city, bt, u, 5).ok);
      if (units.length === 0) return;
      Army.queueTraining(playerState, city, bt, U.choice(units), 5, now);
    });
  }

  function tryResearch(playerState, now) {
    const Tech = window.Game.Systems.Technology;
    if (Tech.isResearching(playerState)) return;
    const techs = Tech.availableTechnologies(playerState).filter((t) => Tech.canQueueResearch(playerState, t.id).ok);
    if (techs.length === 0) return;
    Tech.queueResearch(playerState, U.choice(techs).id, now);
  }

  function tryRecruit(playerState) {
    if (Math.random() > 0.5) return;
    window.Game.Systems.Gacha.draw(playerState, U.choice(D.GACHA_POOLS).id, 1);
  }

  function tryMarch(saveGame, playerState, now) {
    const Army = window.Game.Systems.Army;
    const Hero = window.Game.Systems.Hero;
    const Econ = window.Game.Systems.Economy;
    // 出征門檻不再固定 40 兵：部隊出征現在需要主將帶隊、且不能超過統率上限，
    // 用固定門檻在統率上限較低（cmd 較小或還沒配武將）時會讓 AI 永遠出不了兵
    // ——改成「至少 10 兵，且不超過該部隊主將可統帥的上限」，讓 AI 一有能出征
    // 的部隊就儘早出動，而不是苦等一個未必達得到的兵力門檻。
    const home = Object.values(playerState.armies).find((a) => {
      if (a.status !== 'garrison' || !a.heroStateId) return false;
      const count = Army.unitCount(a);
      if (count < 10) return false;
      return count <= Hero.armyLeadershipCap(playerState, a);
    });
    if (!home) return;
    if (Math.random() > 0.35) return;

    // AI 與玩家共用同一條「連鎖佔領」規則：只能打與自己領土相鄰的目標，逼 AI 也
    // 從自家地盤逐步向外擴張，而不是一開局就遠征地圖另一端。
    const Map = window.Game.Systems.Map;
    const attackable = Map.attackableTargetKeys(saveGame.map, playerState.factionId);
    const candidates = Object.values(saveGame.map.tiles).filter((t) => {
      if (t.type !== 'resource' && t.type !== 'monster') return false;
      if (!attackable.has(t.id)) return false;
      if (t.type === 'monster' && t.cooldownUntil > now) return false;
      return t.guardPower <= Army.unitCount(home) * 3;
    });

    const myPower = Econ.computePower(playerState);
    const cityCandidates = Object.values(saveGame.map.tiles).filter((t) => {
      if (t.type !== 'city' || t.ownerFactionId === playerState.factionId) return false;
      if (!attackable.has(t.id)) return false;
      if (!t.ownerFactionId) return t.guardPower <= Army.unitCount(home) * 3; // 叛軍佔據，比照野外據點守備力判斷。
      return myPower > Econ.computePower(saveGame.players[t.ownerFactionId]) * 1.3; // 攻打其他勢力的城池，需要戰力優勢。
    });
    // 優先收復自己本土仍被叛軍佔據的城池，其次才考慮野外據點或跨勢力擴張。
    const ownRebelCities = cityCandidates.filter((t) => t.homeFactionId === playerState.factionId && !t.ownerFactionId);

    const player = Object.values(saveGame.players).find((p) => p.isHuman);
    if (player && !player.defeated) {
      const playerPower = Econ.computePower(player);
      const playerCap = Map.capitalTileOf(saveGame.map, player.factionId);
      const canAttackPlayer = myPower > playerPower * 1.4 && Math.random() < 0.2 && playerCap && attackable.has(playerCap.id);
      if (canAttackPlayer) {
        Army.sendArmyToTile(saveGame, playerState, home.id, { x: playerCap.x, y: playerCap.y }, 'attack', now);
        return;
      }
    }

    let target = null, purpose = 'raid';
    if (ownRebelCities.length && Math.random() < 0.7) { target = U.choice(ownRebelCities); purpose = 'attack'; }
    else if (cityCandidates.length && Math.random() < 0.4) { target = U.choice(cityCandidates); purpose = 'attack'; }
    else if (candidates.length) { target = U.choice(candidates); purpose = 'raid'; }
    if (!target) return;
    Army.sendArmyToTile(saveGame, playerState, home.id, { x: target.x, y: target.y }, purpose, now);
  }

  window.Game.Systems.Ai = { tick };
})();
