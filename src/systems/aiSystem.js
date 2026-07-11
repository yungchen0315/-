/* ============================================================================
 * aiSystem.js — AI 勢力（單機簡化版）：定期成長、偶爾擴張與防守。
 * 不做完整決策樹，只用機率化的簡單規則；全部呼叫方式與玩家共用同一組系統函式，
 * 避免玩家與 AI 判定不一致的隱性 bug。對應舊版 js/ai.js。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;
  const AI_FACTION_IDS = ['wei', 'wu'];

  function tick(saveGame, now) {
    AI_FACTION_IDS.forEach((factionId) => {
      const playerState = saveGame.players[factionId];
      if (playerState) runAiPlayer(saveGame, playerState, now);
    });
  }

  function runAiPlayer(saveGame, playerState, now) {
    tryUpgrade(playerState, now);
    tryTrain(playerState, now);
    tryResearch(playerState, now);
    tryRecruit(playerState);
    tryMarch(saveGame, playerState, now);
  }

  // 全部使用 aiTick 傳入的模擬時間 now，不能用 U.now()（真實系統時間）——
  // 離線追趕時 now 可能是幾十小時前的模擬時間點，用真實時間會讓補算出的
  // 升級／訓練／研究完成時間全部被推到「現在」之後，導致離線期間 AI 完全長不大。
  function tryUpgrade(playerState, now) {
    const city = window.Game.Systems.Army.primaryCity(playerState);
    if (!city) return;
    const CityBuilding = window.Game.Systems.CityBuilding;
    if (CityBuilding.hasActiveUpgrade(city)) return;
    const candidates = D.BUILDING_ORDER.filter((type) => CityBuilding.canStartUpgrade(city, type).ok);
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
    const home = Object.values(playerState.armies).find((a) => a.status === 'garrison' && Army.unitCount(a) > 40);
    if (!home) return;
    if (Math.random() > 0.35) return;

    const city = Army.primaryCity(playerState);
    const myTile = { x: city.tileX, y: city.tileY };
    const candidates = Object.values(saveGame.map.tiles).filter((t) => {
      if (t.type !== 'resource' && t.type !== 'monster') return false;
      if (t.type === 'resource' && t.ownerFactionId) return false;
      if (t.type === 'monster' && t.cooldownUntil > now) return false;
      const d = U.tileDistance(myTile, t);
      return d > 0 && d <= 6 && t.guardPower <= Army.unitCount(home) * 3;
    });

    const player = saveGame.players.shu;
    const myPower = window.Game.Systems.Economy.computePower(playerState);
    const playerPower = window.Game.Systems.Economy.computePower(player);
    const canAttackPlayer = myPower > playerPower * 1.4 && Math.random() < 0.2;
    if (canAttackPlayer) {
      const playerCity = Army.primaryCity(player);
      Army.sendArmyToTile(playerState, home.id, { x: playerCity.tileX, y: playerCity.tileY }, 'attack', now);
      return;
    }
    if (candidates.length === 0) return;
    const target = U.choice(candidates);
    Army.sendArmyToTile(playerState, home.id, { x: target.x, y: target.y }, 'raid', now);
  }

  window.Game.Systems.Ai = { tick };
})();
