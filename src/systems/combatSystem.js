/* ============================================================================
 * combatSystem.js — 即時公式戰鬥結算與武將技能／裝備的戰鬥加成。
 * 對應舊版 js/army.js 的 resolveBattle() 系列與 js/skills.js。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;
  const M = window.Game.Models;

  function emptyCombatBonus() {
    return { atkPct: 0, defPct: 0, hpPct: 0, unitAtkPct: {}, lossReductionPct: 0, lootBonusPct: 0, enemyAtkPct: 0, enemyDefPct: 0, firstStrikePct: 0 };
  }

  /**
   * 套用一位武將的 skill.effects（src/data/heroDefs.js）到戰鬥加成上。effects 是
   * combatBonusFor 與 UI 顯示（heroScreen.js 的數值說明）共用的同一份資料，
   * 不會有「說明寫的效果」跟「實際套用的效果」對不起來的情況。
   */
  function applySkillEffects(bonus, heroDef, isDefender, isAttacker) {
    if (!heroDef.skill || !heroDef.skill.effects) return;
    heroDef.skill.effects.forEach((e) => {
      if (e.when === 'attacking' && !isAttacker) return;
      if (e.when === 'defending' && !isDefender) return;
      if (e.stat === 'unitAtkPct') { bonus.unitAtkPct[e.unit] = (bonus.unitAtkPct[e.unit] || 0) + e.value; return; }
      bonus[e.stat] = (bonus[e.stat] || 0) + e.value;
    });
  }

  /** 技能＋已裝備物品的綜合戰鬥加成。playerState 為 null 時（例如劇情關卡的敵軍）只回傳空加成。 */
  function combatBonusFor(playerState, heroStateId, isAttacker) {
    const bonus = emptyCombatBonus();
    if (!heroStateId || !playerState) return bonus;
    const heroDef = D.heroDefById(heroStateId);
    if (heroDef) applySkillEffects(bonus, heroDef, !isAttacker, isAttacker);
    const heroState = playerState.heroes[heroStateId];
    if (heroState && heroState.equipment) {
      D.ITEM_SLOTS.forEach((slot) => {
        const itemId = heroState.equipment[slot];
        if (!itemId) return;
        const item = D.itemDefById(itemId);
        if (!item) return;
        const e = item.effect;
        if (e.atkPct) bonus.atkPct += e.atkPct;
        if (e.defPct) bonus.defPct += e.defPct;
        if (e.hpPct) bonus.hpPct += e.hpPct;
        if (e.lossReductionPct) bonus.lossReductionPct += e.lossReductionPct;
        if (e.lootBonusPct) bonus.lootBonusPct += e.lootBonusPct;
        if (e.unitAtkPct) Object.keys(e.unitAtkPct).forEach((r) => { bonus.unitAtkPct[r] = (bonus.unitAtkPct[r] || 0) + e.unitAtkPct[r]; });
      });
    }
    return bonus;
  }

  function heroLevelIn(playerState, heroStateId) {
    const h = playerState && playerState.heroes[heroStateId];
    return h ? h.level : 1;
  }

  function sideCombatStats(units, heroStateId, eff, playerState, isAttacker) {
    const bonus = combatBonusFor(playerState, heroStateId, isAttacker);
    let atk = 0, def = 0, hp = 0;
    Object.keys(units).forEach((type) => {
      const qty = units[type] || 0;
      if (qty <= 0) return;
      const d = D.unitDefById(type);
      const roleBonus = 1 + ((eff.unitAtkPct && eff.unitAtkPct[d.role]) || 0) / 100 + (bonus.unitAtkPct[d.role] || 0) / 100;
      const siegeBonus = d.role === 'siege' ? 1 + (eff.siegeAtkPct || 0) / 100 : 1;
      atk += qty * d.stats.atk * roleBonus * siegeBonus;
      def += qty * d.stats.def * (1 + (eff.allDefPct || 0) / 100);
      hp += qty * d.stats.hp;
    });
    let heroMul = 1;
    if (heroStateId) {
      const heroDef = D.heroDefById(heroStateId);
      if (heroDef) {
        const level = heroLevelIn(playerState, heroStateId);
        heroMul = 1 + (heroDef.baseStats.force + heroDef.baseStats.cmd) / 400 + (level - 1) * 0.015;
      }
    }
    atk *= heroMul * (1 + (bonus.atkPct + bonus.firstStrikePct) / 100);
    def *= 1 + bonus.defPct / 100;
    hp *= 1 + bonus.hpPct / 100;
    return { atk, def, hp, bonus };
  }

  const TURN_DMG_SCALE = 6;
  const TURN_DEF_SOFTEN = 45;
  const MAX_TURNS = 10;

  /**
   * 攻擊方 vs 守軍（守軍可為駐守部隊＋城防加成，也可為野外據點的固定守備力）。
   * 真正逐回合計算：雙方每回合互相扣減 HP 池，直到一方歸零或達到回合上限；
   * 技能／裝備加成在戰前就摺算進 atk/def/hp（sideCombatStats），
   * 但「誰先撐不住」是由逐回合的傷害交換決定，不是單次的戰力比公式。
   * timeline 記錄每一回合的攻防事件，供 battleScreen 逐回合播放動畫用。
   * @returns {{winner:'attacker'|'defender', attackerLossRate:number, defenderLossRate:number,
   *   attackerLootBonusPct:number, turns:number, timeline:Array<Object>}}
   */
  function resolveBattle(opts) {
    const { attackerUnits, attackerHeroStateId, attackerEff, attackerPlayerState,
      defenderUnits, defenderHeroStateId, defenderEff, defenderPlayerState,
      defenderStaticGuard, wallBonusPct } = opts;

    const atkStats = sideCombatStats(attackerUnits, attackerHeroStateId, attackerEff || {}, attackerPlayerState, true);
    let defAtk = 0, defDef = 0, defHp = 0, defBonus = emptyCombatBonus();
    if (defenderUnits) {
      const dStats = sideCombatStats(defenderUnits, defenderHeroStateId, defenderEff || {}, defenderPlayerState, false);
      defAtk = dStats.atk; defDef = dStats.def; defHp = dStats.hp; defBonus = dStats.bonus;
    }
    if (defenderStaticGuard) {
      defAtk += defenderStaticGuard * 0.6;
      defDef += defenderStaticGuard * 0.8;
      defHp += defenderStaticGuard * 4;
    }
    defDef *= 1 + (wallBonusPct || 0) / 100;
    defDef *= 1 + (atkStats.bonus.enemyDefPct || 0) / 100;
    const attackerAtkFinal = atkStats.atk * (1 + (defBonus.enemyAtkPct || 0) / 100);
    const attackerLossReductionPct = U.clamp(atkStats.bonus.lossReductionPct, 0, 60);
    const defenderLossReductionPct = U.clamp(defBonus.lossReductionPct, 0, 60);

    const atkHpMax = Math.max(1, atkStats.hp);
    const defHpMax = Math.max(1, defHp);
    let atkHp = atkHpMax;
    let defHpPool = defHpMax;

    const timeline = [];
    if (attackerHeroStateId) {
      const hd = D.heroDefById(attackerHeroStateId);
      if (hd) timeline.push({ turn: 0, side: 'attacker', type: 'skill', skillName: hd.skill.name });
    }
    if (defenderHeroStateId) {
      const hd = D.heroDefById(defenderHeroStateId);
      if (hd) timeline.push({ turn: 0, side: 'defender', type: 'skill', skillName: hd.skill.name });
    }

    let turn = 0;
    let winner = null;
    while (turn < MAX_TURNS) {
      turn++;
      const dmgToDefenderRaw = (attackerAtkFinal * TURN_DMG_SCALE) / (1 + defDef / TURN_DEF_SOFTEN);
      const dmgToDefender = dmgToDefenderRaw * (1 - defenderLossReductionPct / 100);
      defHpPool = Math.max(0, defHpPool - dmgToDefender);
      timeline.push({
        turn, side: 'attacker', type: 'attack', damage: Math.round(dmgToDefender),
        atkHpPct: Math.round(atkHp / atkHpMax * 100), defHpPct: Math.round(defHpPool / defHpMax * 100)
      });
      if (defHpPool <= 0) { winner = 'attacker'; break; }

      const dmgToAttackerRaw = (defAtk * TURN_DMG_SCALE) / (1 + atkStats.def / TURN_DEF_SOFTEN);
      const dmgToAttacker = dmgToAttackerRaw * (1 - attackerLossReductionPct / 100);
      atkHp = Math.max(0, atkHp - dmgToAttacker);
      timeline.push({
        turn, side: 'defender', type: 'attack', damage: Math.round(dmgToAttacker),
        atkHpPct: Math.round(atkHp / atkHpMax * 100), defHpPct: Math.round(defHpPool / defHpMax * 100)
      });
      if (atkHp <= 0) { winner = 'defender'; break; }
    }
    if (!winner) winner = (atkHp / atkHpMax) >= (defHpPool / defHpMax) ? 'attacker' : 'defender';
    timeline.push({ turn: turn + 1, side: winner, type: 'victory' });

    const attackerLossRate = U.clamp(1 - atkHp / atkHpMax, 0.02, 0.9);
    const defenderLossRate = U.clamp(1 - defHpPool / defHpMax, 0.02, 0.9);

    return {
      winner,
      attackerPower: Math.round(attackerAtkFinal),
      defenderPower: Math.round(defAtk),
      attackerLossRate: U.clamp(attackerLossRate, 0.02, 0.9),
      defenderLossRate: U.clamp(defenderLossRate, 0.02, 0.9),
      attackerLootBonusPct: atkStats.bonus.lootBonusPct || 0,
      turns: turn,
      timeline
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

  function trimBattleLog(playerState) {
    if (playerState.battleLog.length > 40) playerState.battleLog.length = 40;
  }

  /** 野外據點／叛軍守軍沒有實際的兵種組成，依守備力換算出一組步兵，僅供戰鬥動畫顯示用。 */
  function guardDisplayUnits(guardPower) {
    return { infantry: Math.max(1, Math.round((guardPower || 0) / 15)) };
  }

  const MAP_BATTLE_MIN_DURATION_MS = 6000;
  const MAP_BATTLE_MS_PER_EVENT = 900;

  /**
   * 把一場地圖戰鬥登記為「進行中」：部隊狀態改為 fighting（暫時消失於行軍動畫，
   * 改由地塊上的觀戰標記代表它正在這裡交戰），並依 timeline 長度換算出一段
   * 近似戰役動畫實際播放時間的持續時間——這段時間內，地塊會顯示觀戰用的
   * 交戰標記，玩家點進來能看到「觀戰」按鈕即時重播這場戰鬥；時間到才會
   * 真正結算傷亡／掠奪／佔領（見 resolveActiveBattles／settleMapBattle）。
   */
  function beginMapBattle(saveGame, tile, army, engagement, now) {
    army.status = 'fighting';
    const durationMs = Math.max(MAP_BATTLE_MIN_DURATION_MS, engagement.timeline.length * MAP_BATTLE_MS_PER_EVENT + 1500);
    if (!saveGame.activeBattles) saveGame.activeBattles = {};
    saveGame.activeBattles[tile.id] = Object.assign({}, engagement, { tileId: tile.id, armyId: army.id, startAt: now, endAt: now + durationMs });
  }

  /** 某地塊目前是否有正在進行中的戰鬥（供地圖畫面顯示交戰標記／觀戰按鈕）。過期或不存在則回傳 null。 */
  function activeBattleAt(saveGame, tileId, now) {
    if (!saveGame.activeBattles) return null;
    const rec = saveGame.activeBattles[tileId];
    if (!rec || now >= rec.endAt) return null;
    return rec;
  }

  function engageCapitalBattle(saveGame, playerState, army, tile, eff, attackerUnitsBefore) {
    const Econ = window.Game.Systems.Economy;
    const defender = saveGame.players[tile.ownerFactionId];
    const defEff = Econ.computeEffects(defender);
    const garrison = Object.values(defender.armies).filter((a) => a.status === 'garrison');
    const defUnits = U.sumDicts(garrison.map((a) => a.units));
    const defenderHeroStateId = (garrison.find((a) => a.heroStateId) || {}).heroStateId || null;
    const result = resolveBattle({
      attackerUnits: army.units, attackerHeroStateId: army.heroStateId, attackerEff: eff, attackerPlayerState: playerState,
      defenderUnits: defUnits, defenderHeroStateId, defenderEff: defEff, defenderPlayerState: defender,
      wallBonusPct: defEff.defenseBonusPct + defEff.wallDefPct
    });
    const win = result.winner === 'attacker';
    const resultText = win
      ? '成功襲擾 ' + D.factionDefById(tile.ownerFactionId).name + ' 主城，掠奪資源並重創守軍。'
      : '進攻 ' + D.factionDefById(tile.ownerFactionId).name + ' 主城失利，部隊損失慘重。';
    return {
      kind: 'capital', attackerFactionId: playerState.factionId, defenderFactionId: tile.ownerFactionId,
      targetName: tile.name, purpose: army.purpose,
      title: '襲擾「' + tile.name + '」', attackerHeroStateId: army.heroStateId, attackerUnitsBefore,
      defenderHeroStateId, defenderUnitsBefore: defUnits, defenderName: D.factionDefById(tile.ownerFactionId).name + ' 守軍',
      timeline: result.timeline, win, resultText, result
    };
  }

  function engageResourceBattle(playerState, army, tile, eff, attackerUnitsBefore) {
    const defenderUnitsBefore = guardDisplayUnits(tile.guardPower);
    const result = resolveBattle({
      attackerUnits: army.units, attackerHeroStateId: army.heroStateId, attackerEff: eff, attackerPlayerState: playerState,
      defenderStaticGuard: tile.guardPower
    });
    const win = result.winner === 'attacker';
    const resultText = win
      ? '攻佔' + tile.name + '，即刻起持續獲得每分鐘 ' + tile.yieldPerMin + ' ' + D.RESOURCE_NAMES[tile.resourceType] + '的固定產出。'
      : '進攻' + tile.name + '失利，部隊損失慘重，暫時撤退。';
    return {
      kind: 'resource', attackerFactionId: playerState.factionId,
      targetName: tile.name, purpose: army.purpose,
      title: '進攻「' + tile.name + '」', attackerHeroStateId: army.heroStateId, attackerUnitsBefore,
      defenderHeroStateId: null, defenderUnitsBefore, defenderName: tile.name + '守軍',
      timeline: result.timeline, win, resultText, result
    };
  }

  function engageCityBattle(saveGame, playerState, army, tile, eff, attackerUnitsBefore) {
    const prevOwnerFactionId = tile.ownerFactionId;
    if (!prevOwnerFactionId) {
      const defenderUnitsBefore = guardDisplayUnits(tile.guardPower);
      const result = resolveBattle({
        attackerUnits: army.units, attackerHeroStateId: army.heroStateId, attackerEff: eff, attackerPlayerState: playerState,
        defenderStaticGuard: tile.guardPower
      });
      const win = result.winner === 'attacker';
      const resultText = win
        ? '擊破叛軍，收復「' + tile.name + '」，即刻起可派駐部隊、開始建設。'
        : '進攻「' + tile.name + '」失利，部隊損失慘重，暫時撤退。';
      return {
        kind: 'city', attackerFactionId: playerState.factionId,
        targetName: tile.name, purpose: army.purpose,
        title: '進攻「' + tile.name + '」', attackerHeroStateId: army.heroStateId, attackerUnitsBefore,
        defenderHeroStateId: null, defenderUnitsBefore, defenderName: '叛軍守備隊',
        timeline: result.timeline, win, resultText, result
      };
    }
    const Econ = window.Game.Systems.Economy;
    const defender = saveGame.players[prevOwnerFactionId];
    const defEff = Econ.computeEffects(defender);
    const garrison = Object.values(defender.armies).filter((a) => a.status === 'garrison');
    const defUnits = U.sumDicts(garrison.map((a) => a.units));
    const defenderHeroStateId = (garrison.find((a) => a.heroStateId) || {}).heroStateId || null;
    const result = resolveBattle({
      attackerUnits: army.units, attackerHeroStateId: army.heroStateId, attackerEff: eff, attackerPlayerState: playerState,
      defenderUnits: defUnits, defenderHeroStateId, defenderEff: defEff, defenderPlayerState: defender,
      wallBonusPct: defEff.defenseBonusPct + defEff.wallDefPct
    });
    const win = result.winner === 'attacker';
    const resultText = win
      ? '攻陷「' + tile.name + '」，從 ' + D.factionDefById(prevOwnerFactionId).name + ' 手中奪下此城，即刻起可派駐部隊、開始建設。'
      : '進攻「' + tile.name + '」失利，部隊損失慘重，暫時撤退。';
    return {
      kind: 'city', attackerFactionId: playerState.factionId, defenderFactionId: prevOwnerFactionId,
      targetName: tile.name, purpose: army.purpose,
      title: '進攻「' + tile.name + '」', attackerHeroStateId: army.heroStateId, attackerUnitsBefore,
      defenderHeroStateId, defenderUnitsBefore: defUnits, defenderName: D.factionDefById(prevOwnerFactionId).name + ' 守軍',
      timeline: result.timeline, win, resultText, result
    };
  }

  function engageMonsterBattle(playerState, army, tile, eff, attackerUnitsBefore) {
    const defenderUnitsBefore = guardDisplayUnits(tile.guardPower);
    const result = resolveBattle({
      attackerUnits: army.units, attackerHeroStateId: army.heroStateId, attackerEff: eff, attackerPlayerState: playerState,
      defenderStaticGuard: tile.guardPower
    });
    const win = result.winner === 'attacker';
    let resultText = win ? '擊破' + tile.name + '守軍，獲得豐厚資源。' : '進攻' + tile.name + '失利，部隊損失慘重，暫時撤退。';
    let itemDropId = null;
    if (win && Math.random() < 0.3) {
      const dropPool = D.ITEM_DEFS.filter((it) => it.tier <= 3);
      const dropped = U.choice(dropPool);
      itemDropId = dropped.id;
      resultText += ' 並拾獲「' + dropped.name + '」。';
    }
    return {
      kind: 'monster', attackerFactionId: playerState.factionId,
      targetName: tile.name, purpose: army.purpose,
      title: '討伐「' + tile.name + '」', attackerHeroStateId: army.heroStateId, attackerUnitsBefore,
      defenderHeroStateId: null, defenderUnitsBefore, defenderName: tile.name,
      timeline: result.timeline, win, resultText, result, itemDropId
    };
  }

  /**
   * 部隊抵達行軍目標時觸發：判定目標是否還打得成，打得成的話就開一場「進行中」的
   * 地圖戰鬥（見 beginMapBattle），實際傷亡／掠奪／佔領則交給時間到了之後的
   * settleMapBattle 結算——打不成（目標消失、已是己方、據點冷卻中等）則跟以前
   * 一樣立即折返，沒有「戰鬥」可言，不需要進行中狀態。
   * @param {SaveGame} saveGame
   * @param {PlayerState} playerState 出兵的一方。
   * @param {ArmyState} army
   * @param {number} now
   */
  function resolveArmyArrival(saveGame, playerState, army, now) {
    const Army = window.Game.Systems.Army;
    const Econ = window.Game.Systems.Economy;
    const tile = saveGame.map.tiles[army.targetTileId];

    if (!tile || (tile.type !== 'resource' && tile.type !== 'monster' && tile.type !== 'capital' && tile.type !== 'city')) {
      Army.startReturn(playerState, army, now);
      playerState.battleLog.unshift(M.createBattleState({
        attackerFactionId: playerState.factionId, attackerArmyId: army.id, targetName: tile ? tile.name : '未知地點',
        purpose: army.purpose, time: now, outcome: 'invalid', text: '目標已不存在，部隊折返。'
      }));
      trimBattleLog(playerState);
      return;
    }

    if ((tile.type === 'capital' || tile.type === 'city') && tile.ownerFactionId === playerState.factionId) {
      Army.startReturn(playerState, army, now);
      return;
    }

    if (tile.type === 'resource' && tile.ownerFactionId) {
      Army.startReturn(playerState, army, now);
      playerState.battleLog.unshift(M.createBattleState({
        attackerFactionId: playerState.factionId, attackerArmyId: army.id, targetName: tile.name,
        purpose: army.purpose, time: now, outcome: 'invalid', text: tile.name + '已被佔領，部隊折返。'
      }));
      trimBattleLog(playerState);
      return;
    }

    if (tile.type === 'monster' && tile.cooldownUntil > now) {
      Army.startReturn(playerState, army, now);
      playerState.battleLog.unshift(M.createBattleState({
        attackerFactionId: playerState.factionId, attackerArmyId: army.id, targetName: tile.name,
        purpose: army.purpose, time: now, outcome: 'empty', text: '據點守軍尚未恢復，部隊撲空折返。'
      }));
      trimBattleLog(playerState);
      return;
    }

    const eff = Econ.computeEffects(playerState);
    const attackerUnitsBefore = Object.assign({}, army.units);
    let engagement;
    if (tile.type === 'capital') engagement = engageCapitalBattle(saveGame, playerState, army, tile, eff, attackerUnitsBefore);
    else if (tile.type === 'resource') engagement = engageResourceBattle(playerState, army, tile, eff, attackerUnitsBefore);
    else if (tile.type === 'city') engagement = engageCityBattle(saveGame, playerState, army, tile, eff, attackerUnitsBefore);
    else engagement = engageMonsterBattle(playerState, army, tile, eff, attackerUnitsBefore);

    beginMapBattle(saveGame, tile, army, engagement, now);
  }

  function finishBattle(playerState, army, battle, now) {
    window.Game.Systems.Army.startReturn(playerState, army, now);
    playerState.battleLog.unshift(window.Game.Models.createBattleState(battle));
    trimBattleLog(playerState);
  }

  function settleCapitalBattle(saveGame, rec, now) {
    const attackerState = saveGame.players[rec.attackerFactionId];
    const army = attackerState.armies[rec.armyId];
    const defender = saveGame.players[rec.defenderFactionId];
    const { remaining, losses } = applyCasualties(army.units, rec.result.attackerLossRate);
    army.units = remaining;
    const battle = {
      attackerFactionId: rec.attackerFactionId, attackerArmyId: rec.armyId, targetName: rec.targetName,
      purpose: rec.purpose, time: now, losses, text: rec.resultText
    };
    if (rec.win) {
      const plunderMul = 1 + (rec.result.attackerLootBonusPct || 0) / 100;
      const plunder = {};
      D.RESOURCE_TYPES.forEach((r) => {
        const take = Math.round((defender.resources[r] || 0) * 0.15 * plunderMul);
        plunder[r] = take; defender.resources[r] -= take; attackerState.resources[r] += take;
      });
      const garrison = Object.values(defender.armies).filter((a) => a.status === 'garrison');
      garrison.forEach((a) => { const c = applyCasualties(a.units, rec.result.defenderLossRate); a.units = c.remaining; });
      battle.outcome = 'win';
      battle.loot = plunder;
      if (army.heroStateId) window.Game.Systems.Hero.awardExp(attackerState.heroes[army.heroStateId], 60);
    } else {
      battle.outcome = 'lose';
    }
    finishBattle(attackerState, army, battle, now);
  }

  function settleResourceBattle(saveGame, rec, now) {
    const attackerState = saveGame.players[rec.attackerFactionId];
    const army = attackerState.armies[rec.armyId];
    const tile = saveGame.map.tiles[rec.tileId];
    const { remaining, losses } = applyCasualties(army.units, rec.result.attackerLossRate);
    army.units = remaining;
    const battle = {
      attackerFactionId: rec.attackerFactionId, attackerArmyId: rec.armyId, targetName: rec.targetName,
      purpose: rec.purpose, time: now, losses, text: rec.resultText
    };
    if (rec.win && tile) {
      window.Game.Systems.Map.captureResourceTile(attackerState, tile, rec.result.attackerLootBonusPct, now);
      battle.outcome = 'win';
      if (army.heroStateId) window.Game.Systems.Hero.awardExp(attackerState.heroes[army.heroStateId], 30);
    } else {
      battle.outcome = 'lose';
    }
    finishBattle(attackerState, army, battle, now);
  }

  function settleCityBattle(saveGame, rec, now) {
    const attackerState = saveGame.players[rec.attackerFactionId];
    const army = attackerState.armies[rec.armyId];
    const tile = saveGame.map.tiles[rec.tileId];
    const { remaining, losses } = applyCasualties(army.units, rec.result.attackerLossRate);
    army.units = remaining;
    const battle = {
      attackerFactionId: rec.attackerFactionId, attackerArmyId: rec.armyId, targetName: rec.targetName,
      purpose: rec.purpose, time: now, losses, text: rec.resultText
    };
    if (rec.defenderFactionId) battle.defenderFactionId = rec.defenderFactionId;
    if (rec.win && tile) {
      if (rec.defenderFactionId) {
        const defender = saveGame.players[rec.defenderFactionId];
        const garrison = Object.values(defender.armies).filter((a) => a.status === 'garrison');
        garrison.forEach((a) => { const c = applyCasualties(a.units, rec.result.defenderLossRate); a.units = c.remaining; });
      }
      window.Game.Systems.Map.captureCityTile(saveGame, attackerState, tile, now);
      battle.outcome = 'win';
      if (army.heroStateId) window.Game.Systems.Hero.awardExp(attackerState.heroes[army.heroStateId], rec.defenderFactionId ? 80 : 50);
    } else {
      battle.outcome = 'lose';
    }
    finishBattle(attackerState, army, battle, now);
  }

  function settleMonsterBattle(saveGame, rec, now) {
    const attackerState = saveGame.players[rec.attackerFactionId];
    const army = attackerState.armies[rec.armyId];
    const tile = saveGame.map.tiles[rec.tileId];
    const { remaining, losses } = applyCasualties(army.units, rec.result.attackerLossRate);
    army.units = remaining;
    const battle = {
      attackerFactionId: rec.attackerFactionId, attackerArmyId: rec.armyId, targetName: rec.targetName,
      purpose: rec.purpose, time: now, losses, text: rec.resultText
    };
    if (rec.win && tile) {
      const eff = window.Game.Systems.Economy.computeEffects(attackerState);
      const lootMul = 1 + (rec.result.attackerLootBonusPct || 0) / 100;
      const lootBase = Math.round(tile.guardPower * 4 * lootMul);
      const loot = {};
      D.RESOURCE_TYPES.forEach((r) => {
        const g = Math.round(lootBase / 4);
        loot[r] = g;
        attackerState.resources[r] = U.clamp(attackerState.resources[r] + g, 0, eff.storageCap[r]);
      });
      tile.cooldownUntil = now + 10 * 60000;
      battle.outcome = 'win';
      battle.loot = loot;
      if (rec.itemDropId) { window.Game.Systems.Hero.grantItem(attackerState, rec.itemDropId, 1); battle.itemDrop = D.itemDefById(rec.itemDropId).name; }
      if (army.heroStateId) window.Game.Systems.Hero.awardExp(attackerState.heroes[army.heroStateId], 30);
    } else {
      battle.outcome = 'lose';
    }
    finishBattle(attackerState, army, battle, now);
  }

  /** 時間到了的進行中地圖戰鬥，逐一真正結算（傷亡／掠奪／佔領）並從 activeBattles 移除。 */
  function resolveActiveBattles(saveGame, now) {
    if (!saveGame.activeBattles) { saveGame.activeBattles = {}; return; }
    Object.keys(saveGame.activeBattles).forEach((tileId) => {
      const rec = saveGame.activeBattles[tileId];
      if (now < rec.endAt) return;
      if (rec.kind === 'capital') settleCapitalBattle(saveGame, rec, now);
      else if (rec.kind === 'resource') settleResourceBattle(saveGame, rec, now);
      else if (rec.kind === 'city') settleCityBattle(saveGame, rec, now);
      else settleMonsterBattle(saveGame, rec, now);
      delete saveGame.activeBattles[tileId];
    });
  }

  window.Game.Systems.Combat = {
    emptyCombatBonus, combatBonusFor, sideCombatStats, resolveBattle, applyCasualties,
    resolveArmyArrival, resolveActiveBattles, activeBattleAt, trimBattleLog
  };
})();
