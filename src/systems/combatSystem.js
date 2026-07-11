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

  // 技能對戰鬥的實際數值影響，取代純敘述文字。key 為 HeroData.id。
  const SKILL_HANDLERS = {
    guanyu: (b) => { b.unitAtkPct.infantry = (b.unitAtkPct.infantry || 0) + 15; b.unitAtkPct.spearman = (b.unitAtkPct.spearman || 0) + 15; },
    zhangfei: (b) => { b.enemyDefPct -= 12; },
    zhaoyun: (b) => { b.lossReductionPct += 10; },
    machao: (b) => { b.unitAtkPct.cavalry = (b.unitAtkPct.cavalry || 0) + 18; },
    huangzhong: (b) => { b.unitAtkPct.crossbowman = (b.unitAtkPct.crossbowman || 0) + 16; b.unitAtkPct.horsearcher = (b.unitAtkPct.horsearcher || 0) + 16; },
    zhugeliang: (b) => { b.lossReductionPct += 12; b.lootBonusPct += 15; },
    jiangwei: (b) => { b.atkPct += 8; },
    weiyan: (b) => { b.firstStrikePct += 15; },
    pangtong: (b) => { b.enemyAtkPct -= 12; },
    liyan: (b) => { b.lootBonusPct += 10; },

    caocao: (b) => { b.atkPct += 10; },
    simayi: (b, isDefender) => { if (isDefender) b.enemyAtkPct -= 15; },
    xiahoudun: (b) => { b.hpPct += 12; },
    zhangliao: (b, isDefender, isAttacker) => { if (isAttacker) b.firstStrikePct += 18; },
    xuhuang: (b) => { b.atkPct += 8; },
    dianwei: (b) => { b.defPct += 15; },
    xuchu: (b) => { b.hpPct += 15; },
    guojia: (b, isDefender, isAttacker) => { if (isAttacker) b.firstStrikePct += 10; },
    zhangjunyi: (b) => { b.defPct += 8; },
    caoren: (b, isDefender) => { if (isDefender) b.defPct += 15; },

    sunquan: (b) => { b.atkPct += 6; b.defPct += 6; },
    zhouyu: (b, isDefender, isAttacker) => { if (isAttacker) b.enemyDefPct -= 10; },
    luxun: (b, isDefender) => { if (isDefender) b.enemyAtkPct -= 12; },
    ganning: (b, isDefender, isAttacker) => { if (isAttacker) b.atkPct += 14; },
    taishici: (b) => { b.atkPct += 10; },
    lumeng: (b) => { b.lossReductionPct += 10; },
    huanggai: (b, isDefender) => { if (isDefender) b.enemyAtkPct -= 8; },
    lusu: (b) => { b.lossReductionPct += 6; },
    sunshangxiang: (b) => { b.unitAtkPct.horsearcher = (b.unitAtkPct.horsearcher || 0) + 16; },
    zhoutai: (b) => { b.hpPct += 10; }
  };

  /** 技能＋已裝備物品的綜合戰鬥加成。playerState 為 null 時（例如劇情關卡的敵軍）只回傳空加成。 */
  function combatBonusFor(playerState, heroStateId, isAttacker) {
    const bonus = emptyCombatBonus();
    if (!heroStateId || !playerState) return bonus;
    const handler = SKILL_HANDLERS[heroStateId];
    if (handler) handler(bonus, !isAttacker, isAttacker);
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

  /**
   * 部隊抵達行軍目標時的結算：敵方主城／產地／野怪營地三種分支。
   * @param {SaveGame} saveGame
   * @param {PlayerState} playerState 出兵的一方。
   * @param {ArmyState} army
   * @param {number} now
   */
  function resolveArmyArrival(saveGame, playerState, army, now) {
    const Army = window.Game.Systems.Army;
    const Econ = window.Game.Systems.Economy;
    const tile = saveGame.map.tiles[army.targetTileId];
    const battle = { attackerFactionId: playerState.factionId, attackerArmyId: army.id, targetName: tile ? tile.name : '未知地點', purpose: army.purpose, time: now };

    if (!tile || (tile.type !== 'resource' && tile.type !== 'monster' && tile.type !== 'capital' && tile.type !== 'city')) {
      Army.startReturn(playerState, army, now);
      playerState.battleLog.unshift(M.createBattleState(Object.assign(battle, { outcome: 'invalid', text: '目標已不存在，部隊折返。' })));
      trimBattleLog(playerState);
      return;
    }

    if ((tile.type === 'capital' || tile.type === 'city') && tile.ownerFactionId === playerState.factionId) {
      Army.startReturn(playerState, army, now);
      return;
    }

    const eff = Econ.computeEffects(playerState);
    let result;

    if (tile.type === 'capital') {
      const defender = saveGame.players[tile.ownerFactionId];
      const defEff = Econ.computeEffects(defender);
      const garrison = Object.values(defender.armies).filter((a) => a.status === 'garrison');
      const defUnits = U.sumDicts(garrison.map((a) => a.units));
      const defenderHeroStateId = (garrison.find((a) => a.heroStateId) || {}).heroStateId || null;
      result = resolveBattle({
        attackerUnits: army.units, attackerHeroStateId: army.heroStateId, attackerEff: eff, attackerPlayerState: playerState,
        defenderUnits: defUnits, defenderHeroStateId, defenderEff: defEff, defenderPlayerState: defender,
        wallBonusPct: defEff.defenseBonusPct + defEff.wallDefPct
      });
      const { remaining, losses } = applyCasualties(army.units, result.attackerLossRate);
      army.units = remaining;
      if (result.winner === 'attacker') {
        const plunderMul = 1 + (result.attackerLootBonusPct || 0) / 100;
        const plunder = {};
        D.RESOURCE_TYPES.forEach((r) => {
          const take = Math.round((defender.resources[r] || 0) * 0.15 * plunderMul);
          plunder[r] = take; defender.resources[r] -= take; playerState.resources[r] += take;
        });
        garrison.forEach((a) => { const c = applyCasualties(a.units, result.defenderLossRate); a.units = c.remaining; });
        battle.outcome = 'win';
        battle.text = '成功襲擾 ' + D.factionDefById(tile.ownerFactionId).name + ' 主城，掠奪資源並重創守軍。';
        battle.loot = plunder;
        if (army.heroStateId) window.Game.Systems.Hero.awardExp(playerState.heroes[army.heroStateId], 60);
      } else {
        battle.outcome = 'lose';
        battle.text = '進攻 ' + D.factionDefById(tile.ownerFactionId).name + ' 主城失利，部隊損失慘重。';
      }
      battle.losses = losses;
    } else if (tile.type === 'resource' && tile.ownerFactionId) {
      Army.startReturn(playerState, army, now);
      battle.outcome = 'invalid';
      battle.text = tile.name + '已被佔領，部隊折返。';
      playerState.battleLog.unshift(M.createBattleState(battle));
      trimBattleLog(playerState);
      return;
    } else if (tile.type === 'resource') {
      result = resolveBattle({
        attackerUnits: army.units, attackerHeroStateId: army.heroStateId, attackerEff: eff, attackerPlayerState: playerState,
        defenderStaticGuard: tile.guardPower
      });
      const { remaining, losses } = applyCasualties(army.units, result.attackerLossRate);
      army.units = remaining;
      battle.losses = losses;
      if (result.winner === 'attacker') {
        window.Game.Systems.Map.captureResourceTile(playerState, tile, result.attackerLootBonusPct, now);
        battle.outcome = 'win';
        battle.text = '攻佔' + tile.name + '，即刻起持續獲得每分鐘 ' + tile.yieldPerMin + ' ' + D.RESOURCE_NAMES[tile.resourceType] + '的固定產出。';
        if (army.heroStateId) window.Game.Systems.Hero.awardExp(playerState.heroes[army.heroStateId], 30);
      } else {
        battle.outcome = 'lose';
        battle.text = '進攻' + tile.name + '失利，部隊損失慘重，暫時撤退。';
      }
    } else if (tile.type === 'city') {
      const prevOwnerFactionId = tile.ownerFactionId;
      if (prevOwnerFactionId) {
        // 攻打其他勢力已收復／攻下的城池：比照攻打主城的方式，以對方全部駐守部隊合計為守軍。
        const defender = saveGame.players[prevOwnerFactionId];
        const defEff = Econ.computeEffects(defender);
        const garrison = Object.values(defender.armies).filter((a) => a.status === 'garrison');
        const defUnits = U.sumDicts(garrison.map((a) => a.units));
        const defenderHeroStateId = (garrison.find((a) => a.heroStateId) || {}).heroStateId || null;
        result = resolveBattle({
          attackerUnits: army.units, attackerHeroStateId: army.heroStateId, attackerEff: eff, attackerPlayerState: playerState,
          defenderUnits: defUnits, defenderHeroStateId, defenderEff: defEff, defenderPlayerState: defender,
          wallBonusPct: defEff.defenseBonusPct + defEff.wallDefPct
        });
        const { remaining, losses } = applyCasualties(army.units, result.attackerLossRate);
        army.units = remaining;
        battle.losses = losses;
        battle.defenderFactionId = prevOwnerFactionId;
        if (result.winner === 'attacker') {
          garrison.forEach((a) => { const c = applyCasualties(a.units, result.defenderLossRate); a.units = c.remaining; });
          window.Game.Systems.Map.captureCityTile(saveGame, playerState, tile, now);
          battle.outcome = 'win';
          battle.text = '攻陷「' + tile.name + '」，從 ' + D.factionDefById(prevOwnerFactionId).name + ' 手中奪下此城，即刻起可派駐部隊、開始建設。';
          if (army.heroStateId) window.Game.Systems.Hero.awardExp(playerState.heroes[army.heroStateId], 80);
        } else {
          battle.outcome = 'lose';
          battle.text = '進攻「' + tile.name + '」失利，部隊損失慘重，暫時撤退。';
        }
      } else {
        // 叛軍佔據，尚未被任何勢力收復。
        result = resolveBattle({
          attackerUnits: army.units, attackerHeroStateId: army.heroStateId, attackerEff: eff, attackerPlayerState: playerState,
          defenderStaticGuard: tile.guardPower
        });
        const { remaining, losses } = applyCasualties(army.units, result.attackerLossRate);
        army.units = remaining;
        battle.losses = losses;
        if (result.winner === 'attacker') {
          window.Game.Systems.Map.captureCityTile(saveGame, playerState, tile, now);
          battle.outcome = 'win';
          battle.text = '擊破叛軍，收復「' + tile.name + '」，即刻起可派駐部隊、開始建設。';
          if (army.heroStateId) window.Game.Systems.Hero.awardExp(playerState.heroes[army.heroStateId], 50);
        } else {
          battle.outcome = 'lose';
          battle.text = '進攻「' + tile.name + '」失利，部隊損失慘重，暫時撤退。';
        }
      }
    } else {
      // monster：可重複刷，擊破後進入冷卻，而非永久佔領。
      result = resolveBattle({
        attackerUnits: army.units, attackerHeroStateId: army.heroStateId, attackerEff: eff, attackerPlayerState: playerState,
        defenderStaticGuard: tile.cooldownUntil > now ? 0 : tile.guardPower
      });
      if (tile.cooldownUntil > now) {
        Army.startReturn(playerState, army, now);
        battle.outcome = 'empty';
        battle.text = '據點守軍尚未恢復，部隊撲空折返。';
        playerState.battleLog.unshift(M.createBattleState(battle));
        trimBattleLog(playerState);
        return;
      }
      const { remaining, losses } = applyCasualties(army.units, result.attackerLossRate);
      army.units = remaining;
      battle.losses = losses;
      if (result.winner === 'attacker') {
        const lootMul = 1 + (result.attackerLootBonusPct || 0) / 100;
        const lootBase = Math.round(tile.guardPower * 4 * lootMul);
        const loot = {};
        D.RESOURCE_TYPES.forEach((r) => {
          const g = Math.round(lootBase / 4);
          loot[r] = g;
          playerState.resources[r] = U.clamp(playerState.resources[r] + g, 0, eff.storageCap[r]);
        });
        tile.cooldownUntil = now + 10 * 60000;
        battle.outcome = 'win';
        battle.text = '擊破' + tile.name + '守軍，獲得豐厚資源。';
        battle.loot = loot;
        if (army.heroStateId) window.Game.Systems.Hero.awardExp(playerState.heroes[army.heroStateId], 30);
        if (Math.random() < 0.3) {
          const dropPool = D.ITEM_DEFS.filter((it) => it.tier <= 3);
          const dropped = U.choice(dropPool);
          window.Game.Systems.Hero.grantItem(playerState, dropped.id, 1);
          battle.itemDrop = dropped.name;
          battle.text += ' 並拾獲「' + dropped.name + '」。';
        }
      } else {
        battle.outcome = 'lose';
        battle.text = '進攻' + tile.name + '失利，部隊損失慘重，暫時撤退。';
      }
    }

    Army.startReturn(playerState, army, now);
    playerState.battleLog.unshift(M.createBattleState(battle));
    trimBattleLog(playerState);
  }

  window.Game.Systems.Combat = {
    emptyCombatBonus, combatBonusFor, sideCombatStats, resolveBattle, applyCasualties,
    resolveArmyArrival, trimBattleLog
  };
})();
