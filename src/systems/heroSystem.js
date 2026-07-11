/* ============================================================================
 * heroSystem.js — 武將取得（劇情／探索，無抽卡）、升級、統率上限、裝備。
 * 對應舊版 js/generals.js 與 js/items.js。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;
  const M = window.Game.Models;

  const EXPLORE_BASE_MS = 6 * 60000;
  const EXPLORE_COST = { gold: 150 };
  const LEADERSHIP_PER_CMD = 5;
  const GENERAL_MAX_LEVEL = 30;

  function expNeededForLevel(level) { return 80 + level * 40; }

  function effectiveStats(heroState) {
    const def = D.heroDefById(heroState.heroDataId);
    const mul = 1 + (heroState.level - 1) * 0.05 * def.growth;
    return {
      force: Math.round(def.baseStats.force * mul),
      cmd: Math.round(def.baseStats.cmd * mul),
      intel: Math.round(def.baseStats.intel * mul)
    };
  }

  function leadershipCap(heroState) {
    return effectiveStats(heroState).cmd * LEADERSHIP_PER_CMD;
  }

  function awardExp(heroState, amount) {
    if (heroState.level >= GENERAL_MAX_LEVEL) return;
    heroState.exp += amount;
    let needed = expNeededForLevel(heroState.level);
    while (heroState.exp >= needed && heroState.level < GENERAL_MAX_LEVEL) {
      heroState.exp -= needed;
      heroState.level += 1;
      needed = expNeededForLevel(heroState.level);
    }
  }

  function ownedHeroDataIds(playerState) { return new Set(Object.keys(playerState.heroes)); }

  function availableExploreTargets(playerState) {
    const owned = ownedHeroDataIds(playerState);
    return D.HERO_DEFS.filter((h) => h.factionId === playerState.factionId && h.source.type === 'explore' && !owned.has(h.id));
  }

  function primaryCityTavernLevel(playerState) {
    const city = Object.values(playerState.cities)[0];
    return city ? city.buildings.tavern.level : 0;
  }

  function startExplore(playerState, heroDataId, now) {
    if (primaryCityTavernLevel(playerState) <= 0) return { ok: false, reason: '需先建造酒館' };
    const eff = window.Game.Systems.Economy.computeEffects(playerState);
    if (playerState.explorations.length >= eff.exploreSlots) return { ok: false, reason: '探索隊已全數派出' };
    const heroDef = D.HERO_DEFS.find((h) => h.id === heroDataId && h.factionId === playerState.factionId);
    if (!heroDef || heroDef.source.type !== 'explore') return { ok: false, reason: '此武將無法探索取得' };
    if (ownedHeroDataIds(playerState).has(heroDataId)) return { ok: false, reason: '已擁有此武將' };
    if (!U.canAfford(playerState.resources, EXPLORE_COST)) return { ok: false, reason: '銀兩不足' };
    U.subtractResources(playerState.resources, EXPLORE_COST);
    const timeMs = Math.round(EXPLORE_BASE_MS / (eff.exploreSpeedMul || 1));
    playerState.explorations.push({ id: U.generateId('explore'), heroDataId, startAt: now, completeAt: now + timeMs });
    return { ok: true };
  }

  /** @returns {{heroGained?: string}[]} 供呼叫方（例如提示 toast）知道有哪些武將到位。 */
  function resolveExplorations(playerState, now) {
    const results = [];
    for (let i = playerState.explorations.length - 1; i >= 0; i--) {
      const job = playerState.explorations[i];
      if (now < job.completeAt) continue;
      playerState.explorations.splice(i, 1);
      if (!playerState.heroes[job.heroDataId]) {
        playerState.heroes[job.heroDataId] = M.createHeroState(job.heroDataId);
        results.push({ heroGained: job.heroDataId });
      } else {
        // 武將已透過其他管道取得（例如同時派了兩隊探索同一人），改發銀兩安慰獎，不重複發武將。
        const eff = window.Game.Systems.Economy.computeEffects(playerState);
        playerState.resources.gold = U.clamp(playerState.resources.gold + 200, 0, eff.storageCap.gold);
        results.push({ consolationGold: 200 });
      }
    }
    return results;
  }

  function unlockHeroFromMission(playerState, heroDataId) {
    if (!heroDataId) return;
    if (playerState.heroes[heroDataId]) return;
    if (!D.heroDefById(heroDataId)) return;
    playerState.heroes[heroDataId] = M.createHeroState(heroDataId);
  }

  function equipItem(playerState, heroDataId, itemDefId) {
    const heroState = playerState.heroes[heroDataId];
    if (!heroState) return { ok: false, reason: '找不到武將' };
    if (!playerState.inventory[itemDefId] || playerState.inventory[itemDefId] <= 0) return { ok: false, reason: '庫存中沒有此裝備' };
    const item = D.itemDefById(itemDefId);
    if (!item) return { ok: false, reason: '未知裝備' };
    const prev = heroState.equipment[item.slot];
    if (prev) playerState.inventory[prev] = (playerState.inventory[prev] || 0) + 1;
    heroState.equipment[item.slot] = itemDefId;
    playerState.inventory[itemDefId] -= 1;
    return { ok: true };
  }

  function unequipItem(playerState, heroDataId, slot) {
    const heroState = playerState.heroes[heroDataId];
    if (!heroState || !heroState.equipment[slot]) return { ok: false, reason: '該部位沒有裝備' };
    const itemDefId = heroState.equipment[slot];
    playerState.inventory[itemDefId] = (playerState.inventory[itemDefId] || 0) + 1;
    heroState.equipment[slot] = null;
    return { ok: true };
  }

  function grantItem(playerState, itemDefId, qty) {
    if (!itemDefId) return;
    playerState.inventory[itemDefId] = (playerState.inventory[itemDefId] || 0) + (qty || 1);
  }

  /**
   * 指派武將領軍，強制統率上限：部隊目前的統率需求（armySystem.leadershipUsed）
   * 不能超過武將的統率上限。
   */
  function assignHeroToArmy(playerState, heroDataId, army) {
    const heroState = playerState.heroes[heroDataId];
    if (!heroState) return { ok: false, reason: '找不到武將' };
    if (army.status !== 'garrison') return { ok: false, reason: '部隊行軍中，無法更換主將' };
    const cap = leadershipCap(heroState);
    const used = window.Game.Systems.Army.leadershipUsed(army);
    if (used > cap) {
      return { ok: false, reason: D.heroDefById(heroDataId).name + '統率上限為 ' + cap + '，此部隊統率需求為 ' + used + '，請先精簡兵力' };
    }
    Object.values(playerState.armies).forEach((a) => { if (a.heroStateId === heroDataId) a.heroStateId = null; });
    Object.values(playerState.heroes).forEach((h) => { if (h.assignedArmyId === army.id) h.assignedArmyId = null; });
    army.heroStateId = heroDataId;
    heroState.assignedArmyId = army.id;
    return { ok: true };
  }

  function unassignHero(playerState, army) {
    if (army.heroStateId) {
      const heroState = playerState.heroes[army.heroStateId];
      if (heroState) heroState.assignedArmyId = null;
    }
    army.heroStateId = null;
    return { ok: true };
  }

  window.Game.Systems.Hero = {
    expNeededForLevel, effectiveStats, leadershipCap, awardExp,
    ownedHeroDataIds, availableExploreTargets, startExplore, resolveExplorations,
    unlockHeroFromMission, equipItem, unequipItem, grantItem,
    assignHeroToArmy, unassignHero
  };
})();
