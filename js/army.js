/* ============================================================================
 * army.js — 部隊編成、行軍、戰鬥結算（即時公式）與戰報。
 * ==========================================================================*/

const MARCH_MS_PER_TILE = 45000; // 基準：速度 5 的部隊，每格地圖耗時 45 秒

function tileDistance(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }

function armyUnitCount(army) { return Object.values(army.units).reduce((s, n) => s + (n || 0), 0); }

function armyLeadershipUsed(army) {
  return Object.keys(army.units).reduce((s, u) => s + (army.units[u] || 0) * unitDef(u).leadership, 0);
}

function armySlowestSpeed(army) {
  const speeds = Object.keys(army.units).filter((u) => army.units[u] > 0).map((u) => unitDef(u).stats.speed);
  return speeds.length ? Math.min(...speeds) : 5;
}

function marchDurationMs(army, distanceTiles) {
  const speed = armySlowestSpeed(army) || 5;
  return Math.round(distanceTiles * MARCH_MS_PER_TILE * (5 / speed));
}

/* ---------------------------------------------------------------------- */
/* 戰力計算                                                                 */
/* ---------------------------------------------------------------------- */
function sideCombatStats(units, generalId, eff, ownerFaction, isAttacker) {
  const bonus = (typeof combatBonusFor === 'function') ? combatBonusFor(ownerFaction, generalId, isAttacker) : emptyCombatBonus();
  let atk = 0, def = 0, hp = 0;
  Object.keys(units).forEach((type) => {
    const qty = units[type] || 0;
    if (qty <= 0) return;
    const d = unitDef(type);
    const roleBonus = 1 + ((eff.unitAtkPct && eff.unitAtkPct[d.role]) || 0) / 100 + (bonus.unitAtkPct[d.role] || 0) / 100;
    const siegeBonus = d.role === 'siege' ? 1 + (eff.siegeAtkPct || 0) / 100 : 1;
    atk += qty * d.stats.atk * roleBonus * siegeBonus;
    def += qty * d.stats.def * (1 + (eff.allDefPct || 0) / 100);
    hp += qty * d.stats.hp;
  });
  let generalMul = 1;
  if (generalId) {
    const g = generalById(generalId);
    if (g) {
      const level = ownerFaction ? generalLevelIn(ownerFaction, generalId) : 1;
      generalMul = 1 + (g.baseStats.force + g.baseStats.cmd) / 400 + (level - 1) * 0.015;
    }
  }
  atk *= generalMul * (1 + (bonus.atkPct + bonus.firstStrikePct) / 100);
  def *= 1 + bonus.defPct / 100;
  hp *= 1 + bonus.hpPct / 100;
  return { atk, def, hp, generalMul, bonus };
}

function generalLevelIn(faction, generalId) {
  const inst = faction.generals.find((g) => g.id === generalId);
  return inst ? inst.level : 1;
}

// 攻擊方 vs 守軍（守軍可為駐守部隊 + 城防加成，也可為野外據點的固定守備力）
function resolveBattle(opts) {
  const { attackerUnits, attackerGeneralId, attackerEff, attackerFaction, defenderUnits, defenderGeneralId, defenderEff, defenderFaction, defenderStaticGuard, wallBonusPct } = opts;
  const atkStats = sideCombatStats(attackerUnits, attackerGeneralId, attackerEff || {}, attackerFaction, true);
  let defAtk = 0, defDef = 0, defHp = 0, defBonus = emptyCombatBonus();
  if (defenderUnits) {
    const dStats = sideCombatStats(defenderUnits, defenderGeneralId, defenderEff || {}, defenderFaction, false);
    defAtk = dStats.atk; defDef = dStats.def; defHp = dStats.hp; defBonus = dStats.bonus;
  }
  if (defenderStaticGuard) {
    defAtk += defenderStaticGuard * 0.6;
    defDef += defenderStaticGuard * 0.8;
    defHp += defenderStaticGuard * 4;
  }
  defDef *= 1 + (wallBonusPct || 0) / 100;

  // 武將技能可直接削弱敵方數值（如張飛咆哮、司馬懿鷹視）
  defDef *= 1 + (atkStats.bonus.enemyDefPct || 0) / 100;
  const attackerAtkAfterEnemySkill = atkStats.atk * (1 + (defBonus.enemyAtkPct || 0) / 100);

  const attackerPower = attackerAtkAfterEnemySkill * (1 + atkStats.hp / 2000) + atkStats.def * 0.3;
  const defenderPower = defAtk * 0.4 + defDef * (1 + defHp / 2000);

  const total = attackerPower + defenderPower || 1;
  const ratio = attackerPower / total; // ratio 越大攻擊方越強
  const winner = attackerPower >= defenderPower ? 'attacker' : 'defender';

  let attackerLossRate = clamp(1 - ratio, 0.05, 0.85);
  let defenderLossRate = clamp(ratio, 0.05, 0.85);
  attackerLossRate *= 1 - clamp(atkStats.bonus.lossReductionPct, 0, 60) / 100;
  defenderLossRate *= 1 - clamp(defBonus.lossReductionPct, 0, 60) / 100;

  return {
    winner,
    attackerPower: Math.round(attackerPower),
    defenderPower: Math.round(defenderPower),
    attackerLossRate: clamp(attackerLossRate, 0.02, 0.9),
    defenderLossRate: clamp(defenderLossRate, 0.02, 0.9),
    attackerLootBonusPct: atkStats.bonus.lootBonusPct || 0
  };
}

function applyCasualties(units, lossRate) {
  const remaining = {};
  const losses = {};
  Object.keys(units).forEach((type) => {
    const qty = units[type] || 0;
    const lost = Math.min(qty, Math.round(qty * lossRate));
    remaining[type] = qty - lost;
    losses[type] = lost;
  });
  return { remaining, losses };
}

/* ---------------------------------------------------------------------- */
/* 軍隊管理                                                                 */
/* ---------------------------------------------------------------------- */
function createArmyFromGarrison(faction, name, generalId, unitsWanted) {
  const home = getOrCreateHomeArmy(faction);
  const takeUnits = {};
  Object.keys(unitsWanted).forEach((type) => {
    const want = unitsWanted[type] || 0;
    const have = home.units[type] || 0;
    const take = Math.min(want, have);
    if (take > 0) { takeUnits[type] = take; home.units[type] = have - take; }
  });
  if (Object.keys(takeUnits).length === 0) return null;
  const army = {
    id: uid('army'), name: name || '遠征軍', generalId: generalId || null,
    units: takeUnits, status: 'garrison', departAt: 0, arriveAt: 0,
    originTileId: null, targetTileId: null, purpose: null
  };
  faction.armies.push(army);
  return army;
}

function disbandArmyIntoHome(faction, armyId) {
  const idx = faction.armies.findIndex((a) => a.id === armyId);
  if (idx < 0) return false;
  const army = faction.armies[idx];
  if (army.status !== 'garrison') return false;
  const home = getOrCreateHomeArmy(faction);
  if (home.id !== army.id) {
    Object.keys(army.units).forEach((t) => { home.units[t] = (home.units[t] || 0) + army.units[t]; });
    faction.armies.splice(idx, 1);
  }
  return true;
}

function sendArmyToTile(state, faction, armyId, targetTile, purpose) {
  const army = faction.armies.find((a) => a.id === armyId);
  if (!army) return { ok: false, reason: '找不到部隊' };
  if (army.status !== 'garrison') return { ok: false, reason: '部隊行軍中' };
  if (armyUnitCount(army) === 0) return { ok: false, reason: '部隊沒有兵力' };
  const origin = faction.cityTile;
  const dist = tileDistance(origin, targetTile) || 1;
  const travel = marchDurationMs(army, dist);
  const now = nowMs();
  army.status = 'marching';
  army.departAt = now;
  army.arriveAt = now + travel;
  army.originTileId = tileKey(origin.x, origin.y);
  army.targetTileId = tileKey(targetTile.x, targetTile.y);
  army.purpose = purpose;
  return { ok: true, etaMs: travel };
}

/* ---------------------------------------------------------------------- */
/* 到達目標時的結算（資源點/野怪/敵方主城）                                    */
/* ---------------------------------------------------------------------- */
function resolveArmyArrival(state, faction, army, now) {
  const tile = state.world.tiles[army.targetTileId];
  const eff = factionEffects(faction);
  let report = {
    id: uid('report'), time: now, factionId: faction.id,
    armyName: army.name, targetName: tile ? tile.name : '未知地點', purpose: army.purpose
  };

  if (!tile || (tile.type !== 'resource' && tile.type !== 'monster' && tile.type !== 'capital')) {
    // 目標消失或無效，直接折返
    startReturn(army, now, faction);
    faction.battleReports.unshift(Object.assign(report, { outcome: 'invalid', text: '目標已不存在，部隊折返。' }));
    trimReports(faction);
    return;
  }

  if (tile.type === 'capital' && tile.ownerId === faction.id) {
    startReturn(army, now, faction);
    return;
  }

  let result;
  if (tile.type === 'capital') {
    const defender = state.factions[tile.ownerId];
    const defEff = factionEffects(defender);
    const garrison = defender.armies.filter((a) => a.status === 'garrison');
    const defUnits = sumObjects(garrison.map((a) => a.units));
    const defGeneral = garrison.find((a) => a.generalId) ? garrison.find((a) => a.generalId).generalId : null;
    result = resolveBattle({
      attackerUnits: army.units, attackerGeneralId: army.generalId, attackerEff: eff, attackerFaction: faction,
      defenderUnits: defUnits, defenderGeneralId: defGeneral, defenderEff: defEff, defenderFaction: defender,
      wallBonusPct: defEff.defenseBonusPct + defEff.wallDefPct
    });
    const { remaining, losses } = applyCasualties(army.units, result.attackerLossRate);
    army.units = remaining;
    if (result.winner === 'attacker') {
      const plunderMul = 1 + (result.attackerLootBonusPct || 0) / 100;
      const plunder = {};
      RESOURCE_TYPES.forEach((r) => { const take = Math.round((defender.resources[r] || 0) * 0.15 * plunderMul); plunder[r] = take; defender.resources[r] -= take; faction.resources[r] += take; });
      garrison.forEach((a) => { const c = applyCasualties(a.units, result.defenderLossRate); a.units = c.remaining; });
      report.outcome = 'win';
      report.text = '成功襲擾 ' + factionById(tile.ownerId).name + ' 主城，掠奪資源並重創守軍。';
      report.plunder = plunder;
      if (army.generalId) awardGeneralExp(faction, army.generalId, 60);
    } else {
      report.outcome = 'lose';
      report.text = '進攻 ' + factionById(tile.ownerId).name + ' 主城失利，部隊損失慘重。';
    }
    report.losses = losses;
  } else {
    result = resolveBattle({
      attackerUnits: army.units, attackerGeneralId: army.generalId, attackerEff: eff, attackerFaction: faction,
      defenderStaticGuard: tile.cooldownUntil > now ? 0 : tile.guardPower
    });
    if (tile.cooldownUntil > now) {
      startReturn(army, now, faction);
      report.outcome = 'empty';
      report.text = '據點守軍尚未恢復，部隊撲空折返。';
      faction.battleReports.unshift(report);
      trimReports(faction);
      return;
    }
    const { remaining, losses } = applyCasualties(army.units, result.attackerLossRate);
    army.units = remaining;
    report.losses = losses;
    if (result.winner === 'attacker') {
      const lootMul = 1 + (result.attackerLootBonusPct || 0) / 100;
      const lootBase = Math.round(tile.guardPower * 4 * lootMul);
      const loot = {};
      if (tile.type === 'resource') { loot[tile.resourceType] = lootBase; faction.resources[tile.resourceType] = clamp(faction.resources[tile.resourceType] + lootBase, 0, factionEffects(faction).storageCap[tile.resourceType]); }
      else { RESOURCE_TYPES.forEach((r) => { const g = Math.round(lootBase / 4); loot[r] = g; faction.resources[r] = clamp(faction.resources[r] + g, 0, factionEffects(faction).storageCap[r]); }); }
      tile.cooldownUntil = now + 10 * 60000;
      report.outcome = 'win';
      report.text = '擊破' + tile.name + '守軍，獲得豐厚資源。';
      report.loot = loot;
      if (army.generalId) awardGeneralExp(faction, army.generalId, 30);
      if (tile.type === 'monster' && Math.random() < 0.3) {
        const dropPool = ITEMS.filter((it) => it.tier <= 3);
        const dropped = choice(dropPool);
        grantItem(faction, dropped.id, 1);
        report.itemDrop = dropped.name;
        report.text += ' 並拾獲「' + dropped.name + '」。';
      }
    } else {
      report.outcome = 'lose';
      report.text = '進攻' + tile.name + '失利，部隊損失慘重，暫時撤退。';
    }
  }

  startReturn(army, now, faction);
  faction.battleReports.unshift(report);
  trimReports(faction);
}

function trimReports(faction) {
  if (faction.battleReports.length > 40) faction.battleReports.length = 40;
}

function startReturn(army, now, faction) {
  const origin = faction.cityTile;
  const target = { x: army.targetTileId ? parseInt(army.targetTileId.split('_')[0], 10) : origin.x, y: army.targetTileId ? parseInt(army.targetTileId.split('_')[1], 10) : origin.y };
  const dist = tileDistance(origin, target) || 1;
  const travel = marchDurationMs(army, dist);
  army.status = armyUnitCount(army) > 0 ? 'returning' : 'returning';
  army.departAt = now;
  army.arriveAt = now + travel;
}

/* ---------------------------------------------------------------------- */
/* 練兵                                                                    */
/* ---------------------------------------------------------------------- */
const MAX_TRAIN_QUEUE_LEN = 5;

function trainableUnitsFor(buildingType) {
  return UNIT_IDS.filter((u) => UNITS[u].trainedBy === buildingType);
}

function canQueueTraining(faction, buildingType, unitType, qty) {
  const buildingLevel = faction.buildings[buildingType].level;
  if (buildingLevel <= 0) return { ok: false, reason: '需先建造' + buildingDef(buildingType).name };
  const unit = unitDef(unitType);
  const ld = buildingLevelDef(buildingType, buildingLevel);
  if (unit.tier > (ld.effect.unlockUnitTier || 1)) return { ok: false, reason: buildingDef(buildingType).name + '等級不足，尚未解鎖此兵種' };
  if (faction.trainQueues[buildingType].length >= MAX_TRAIN_QUEUE_LEN) return { ok: false, reason: '訓練佇列已滿' };
  const cost = {};
  Object.keys(unit.cost).forEach((r) => { cost[r] = unit.cost[r] * qty; });
  if (!canAfford(faction.resources, cost)) return { ok: false, reason: '資源不足' };
  return { ok: true, cost, unit, buildingLevel };
}

function queueTraining(faction, buildingType, unitType, qty) {
  const check = canQueueTraining(faction, buildingType, unitType, qty);
  if (!check.ok) return check;
  payCost(faction.resources, check.cost);
  const eff = factionEffects(faction);
  const mul = eff.trainSpeedMul[buildingType] * (1 + (eff.trainSpeedPct || 0) / 100);
  const timeMs = Math.round((check.unit.trainTimeMs * qty) / mul);
  const now = nowMs();
  const prevTail = faction.trainQueues[buildingType].length
    ? faction.trainQueues[buildingType][faction.trainQueues[buildingType].length - 1].completeAt
    : now;
  const startAt = Math.max(now, prevTail);
  faction.trainQueues[buildingType].push({ unitType, qty, startAt, completeAt: startAt + timeMs });
  return { ok: true };
}

/* ---------------------------------------------------------------------- */
/* 「軍隊」分頁畫面渲染                                                      */
/* ---------------------------------------------------------------------- */
function renderArmyScreen(container, faction) {
  clearNode(container);

  const trainPanel = el('div', 'panel');
  trainPanel.appendChild(el('div', 'panelTitle', '訓練部隊'));
  ['barracks', 'drillground', 'workshop'].forEach((bt) => {
    const lvl = faction.buildings[bt].level;
    const box = el('div', 'trainBuildingBox');
    box.appendChild(el('div', 'trainBuildingTitle', buildingDef(bt).icon + ' ' + buildingDef(bt).name + '（Lv.' + lvl + '）'));
    if (lvl > 0) {
      trainableUnitsFor(bt).forEach((ut) => {
        const unit = unitDef(ut);
        const ld = buildingLevelDef(bt, lvl);
        const locked = unit.tier > (ld.effect.unlockUnitTier || 1);
        const row = el('div', 'trainUnitRow' + (locked ? ' locked' : ''));
        row.appendChild(el('span', 'unitIcon', unit.icon));
        row.appendChild(el('span', 'unitName', unit.name));
        row.appendChild(el('span', 'unitCost', Object.keys(unit.cost).map((r) => RESOURCE_ICONS[r] + unit.cost[r]).join(' ')));
        if (!locked) {
          const btn5 = el('button', 'smallBtn', '訓練x5');
          onTap(btn5, () => {
            const r = queueTraining(faction, bt, ut, 5);
            if (r.ok) { toast('已加入訓練佇列'); renderArmyScreen(container, faction); refreshTopBar(); } else toast(r.reason);
          });
          row.appendChild(btn5);
        } else {
          row.appendChild(el('span', 'lockedHint', '尚未解鎖'));
        }
        box.appendChild(row);
      });
      faction.trainQueues[bt].forEach((item, idx) => {
        const q = el('div', 'queueRow');
        q.appendChild(el('span', '', (idx === 0 ? '訓練中：' : '排隊中：') + unitDef(item.unitType).name + ' x' + item.qty));
        q.appendChild(el('span', 'timerText', idx === 0 ? formatDuration(Math.max(0, item.completeAt - nowMs())) : ''));
        box.appendChild(q);
      });
    }
    trainPanel.appendChild(box);
  });
  container.appendChild(trainPanel);

  const armyPanel = el('div', 'panel');
  armyPanel.appendChild(el('div', 'panelTitle', '部隊列表'));
  faction.armies.forEach((army) => {
    const card = el('div', 'armyCard');
    const head = el('div', 'armyHead');
    head.appendChild(el('span', 'armyName', army.name));
    head.appendChild(el('span', 'armyStatus', armyStatusLabel(army)));
    card.appendChild(head);
    const unitsLine = el('div', 'armyUnits', Object.keys(army.units).filter((u) => army.units[u] > 0)
      .map((u) => unitDef(u).icon + army.units[u]).join(' ') || '（無兵力）');
    card.appendChild(unitsLine);
    const general = faction.generals.find((g) => g.id === army.generalId);
    card.appendChild(el('div', 'armyGeneral', general ? '主將：' + generalById(general.id).name : '未指派主將'));
    if (army.status !== 'garrison') {
      card.appendChild(el('div', 'timerText', '預計 ' + formatDuration(Math.max(0, army.arriveAt - nowMs())) + ' 後' + (army.status === 'marching' ? '抵達' : '返回')));
    } else {
      const goMapBtn = el('button', 'smallBtn', '前往地圖派兵');
      onTap(goMapBtn, () => { setActiveArmyForMarch(faction, army.id); switchScreen('map'); });
      card.appendChild(goMapBtn);
    }
    armyPanel.appendChild(card);
  });
  container.appendChild(armyPanel);
}

function renderReportScreen(container, faction) {
  clearNode(container);
  const reportPanel = el('div', 'panel');
  reportPanel.appendChild(el('div', 'panelTitle', '戰報記錄'));
  faction.battleReports.slice(0, 40).forEach((r) => {
    const row = el('div', 'reportRow ' + (r.outcome === 'win' ? 'reportWin' : r.outcome === 'lose' ? 'reportLose' : 'reportNeutral'));
    row.appendChild(el('div', 'reportText', r.text));
    row.appendChild(el('div', 'reportTime', new Date(r.time).toLocaleTimeString()));
    reportPanel.appendChild(row);
  });
  if (faction.battleReports.length === 0) reportPanel.appendChild(el('div', 'emptyHint', '尚無戰報記錄。'));
  container.appendChild(reportPanel);
}

function armyStatusLabel(army) {
  if (army.status === 'garrison') return '駐守中';
  if (army.status === 'marching') return '行軍中';
  return '返回中';
}
