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

  /* ------------------------------------------------------------------------
   * 編隊：一隊最多 1 主將 ＋ SQUAD_SUB_MAX 名副將（率土之濱式的多武將編隊）。
   * 全隊武將的技能效果在戰鬥時一起疊加、統率上限相加（副將愈多能帶愈多兵），
   * 實際戰力計算在 combatSystem。
   * ------------------------------------------------------------------------ */
  const SQUAD_SUB_MAX = 2;

  /** 一支部隊目前的全部武將 id（主將在前、副將在後），過濾掉空缺。 */
  function squadHeroIds(army) {
    return [army.heroStateId].concat(army.subHeroStateIds || []).filter(Boolean);
  }

  /** 一支部隊的統率上限＝隊上所有武將統率上限之和（副將愈多，可帶兵力愈高）。 */
  function armyLeadershipCap(playerState, army) {
    return squadHeroIds(army).reduce((sum, id) => {
      const hs = playerState.heroes[id];
      return sum + (hs ? leadershipCap(hs) : 0);
    }, 0);
  }

  /** 把某武將從牠目前所在的任何一支部隊（不論主將或副將）先卸下來，確保一名武將只在一隊。 */
  function detachHeroEverywhere(playerState, heroDataId) {
    Object.values(playerState.armies).forEach((a) => {
      if (a.heroStateId === heroDataId) a.heroStateId = null;
      if (Array.isArray(a.subHeroStateIds)) a.subHeroStateIds = a.subHeroStateIds.filter((id) => id !== heroDataId);
    });
    const hs = playerState.heroes[heroDataId];
    if (hs) hs.assignedArmyId = null;
  }

  /**
   * 指派武將入隊：隊上沒有主將時成為主將，否則補為副將（副將額滿則失敗）。
   * 統率上限採全隊相加，因此加入武將只會提高上限、不會讓既有兵力超載。
   */
  function assignHeroToArmy(playerState, heroDataId, army) {
    const heroState = playerState.heroes[heroDataId];
    if (!heroState) return { ok: false, reason: '找不到武將' };
    if (army.status !== 'garrison') return { ok: false, reason: '部隊行軍中，無法調整編隊' };
    if (!Array.isArray(army.subHeroStateIds)) army.subHeroStateIds = [];
    if (army.heroStateId === heroDataId || army.subHeroStateIds.indexOf(heroDataId) >= 0) return { ok: true };
    if (army.heroStateId && army.subHeroStateIds.length >= SQUAD_SUB_MAX) {
      return { ok: false, reason: '編隊已滿（最多 1 主將 ＋ ' + SQUAD_SUB_MAX + ' 副將）' };
    }
    detachHeroEverywhere(playerState, heroDataId);
    if (!army.heroStateId) army.heroStateId = heroDataId;
    else army.subHeroStateIds.push(heroDataId);
    heroState.assignedArmyId = army.id;
    return { ok: true };
  }

  /** 把單一武將移出部隊；若移除的是主將，則由第一名副將遞補為主將。 */
  function removeHeroFromArmy(playerState, army, heroDataId) {
    if (army.status !== 'garrison') return { ok: false, reason: '部隊行軍中，無法調整編隊' };
    if (!Array.isArray(army.subHeroStateIds)) army.subHeroStateIds = [];
    if (army.heroStateId === heroDataId) {
      army.heroStateId = army.subHeroStateIds.shift() || null;
    } else {
      army.subHeroStateIds = army.subHeroStateIds.filter((id) => id !== heroDataId);
    }
    const hs = playerState.heroes[heroDataId];
    if (hs) hs.assignedArmyId = null;
    return { ok: true };
  }

  /** 解散整隊武將（主將＋全部副將都卸下），供解散部隊等情境使用。 */
  function unassignHero(playerState, army) {
    squadHeroIds(army).forEach((id) => {
      const hs = playerState.heroes[id];
      if (hs) hs.assignedArmyId = null;
    });
    army.heroStateId = null;
    army.subHeroStateIds = [];
    return { ok: true };
  }

  window.Game.Systems.Hero = {
    SQUAD_SUB_MAX,
    expNeededForLevel, effectiveStats, leadershipCap, awardExp,
    ownedHeroDataIds, unlockHeroFromMission, equipItem, unequipItem, grantItem,
    squadHeroIds, armyLeadershipCap, assignHeroToArmy, removeHeroFromArmy, unassignHero
  };
})();
