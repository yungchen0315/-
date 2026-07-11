/* ============================================================================
 * heroSystem.js — 武將取得（劇情解鎖／酒館招募）、升級、統率上限、裝備。
 * 酒館招募本身的抽取邏輯在 src/systems/gachaSystem.js；這裡只保留
 * unlockHeroFromMission（劇情解鎖）與升級/裝備/領軍等共用邏輯。
 * 對應舊版 js/generals.js 與 js/items.js。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;
  const M = window.Game.Models;

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
    ownedHeroDataIds, unlockHeroFromMission, equipItem, unequipItem, grantItem,
    assignHeroToArmy, unassignHero
  };
})();
