/* ============================================================================
 * ai.js — AI 勢力（單機簡化版）：定期成長、偶爾擴張與防守。
 * 不做完整決策樹，只用機率化的簡單規則，確保長時間執行仍穩定不崩潰。
 * ==========================================================================*/

const AI_FACTION_IDS = ['wei', 'wu'];

function aiTick(state, now) {
  AI_FACTION_IDS.forEach((id) => {
    const faction = state.factions[id];
    if (faction) runAiFaction(state, faction, now);
  });
}

function runAiFaction(state, faction, now) {
  aiTryUpgrade(faction, now);
  aiTryTrain(faction, now);
  aiTryResearch(faction, now);
  aiTryExplore(faction, now);
  aiTryMarch(state, faction, now);
}

// 全部使用 aiTick 傳入的模擬時間 now，不能用 nowMs()（真實系統時間）——
// 離線追趕時 now 可能是幾十小時前的模擬時間點，用真實時間會讓補算出的
// 升級／訓練／研究完成時間全部被推到「現在」之後，導致離線期間 AI 完全長不大。
function aiTryResearch(faction, now) {
  if (typeof availableTechs !== 'function') return;
  if (faction.researchQueue.length > 0) return;
  const techs = availableTechs(faction).filter((t) => canQueueResearch(faction, t.id).ok);
  if (techs.length === 0) return;
  queueResearch(faction, choice(techs).id, now);
}

function aiTryUpgrade(faction, now) {
  if (faction.activeBuildUpgrade) return;
  const candidates = BUILDING_ORDER.filter((type) => canStartUpgrade(faction, type).ok);
  if (candidates.length === 0) return;
  const type = choice(candidates);
  startUpgrade(faction, type, now);
}

function aiTryTrain(faction, now) {
  ['barracks', 'drillground'].forEach((bt) => {
    if (faction.buildings[bt].level <= 0) return;
    if (faction.trainQueues[bt].length > 0) return;
    const units = trainableUnitsFor(bt).filter((u) => canQueueTraining(faction, bt, u, 5).ok);
    if (units.length === 0) return;
    queueTraining(faction, bt, choice(units), 5, now);
  });
}

function aiTryExplore(faction, now) {
  if (faction.buildings.tavern.level <= 0) return;
  const eff = factionEffects(faction);
  if (faction.exploreSlots.length >= eff.exploreSlots) return;
  const targets = availableExploreTargets(faction);
  if (targets.length === 0) return;
  if (Math.random() > 0.5) return;
  startExplore(faction, choice(targets).id, now);
}

function aiTryMarch(state, faction, now) {
  const home = faction.armies.find((a) => a.status === 'garrison' && armyUnitCount(a) > 40);
  if (!home) return;
  if (Math.random() > 0.35) return;

  const myTile = faction.cityTile;
  const candidates = Object.values(state.world.tiles).filter((t) => {
    if (t.type !== 'resource' && t.type !== 'monster') return false;
    if (t.type === 'resource' && t.ownerId) return false;
    if (t.type === 'monster' && t.cooldownUntil > now) return false;
    const d = tileDistance(myTile, t);
    return d > 0 && d <= 6 && t.guardPower <= armyUnitCount(home) * 3;
  });

  const player = state.factions.shu;
  const canAttackPlayer = factionPower(faction) > factionPower(player) * 1.4 && Math.random() < 0.2;
  if (canAttackPlayer) {
    sendArmyToTile(state, faction, home.id, player.cityTile, 'attack');
    return;
  }
  if (candidates.length === 0) return;
  const target = choice(candidates);
  sendArmyToTile(state, faction, home.id, { x: target.x, y: target.y }, 'raid');
}
