/* ============================================================================
 * missionSystem.js — 主線戰役／劇情任務進度與戰鬥結算。對應舊版 js/campaign.js。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;
  const M = window.Game.Models;

  /** 依前置關卡是否完成，把符合條件的關卡狀態從 'locked' 更新為 'available'。 */
  function refreshMissionStatuses(playerState) {
    D.MISSION_DEFS.forEach((mission) => {
      const state = playerState.missions[mission.id];
      if (state.status === 'completed') return;
      const unlocked = mission.requires.every((r) => playerState.missions[r].status === 'completed');
      state.status = unlocked ? 'available' : 'locked';
    });
  }

  function unlockedMissions(playerState) {
    return D.MISSION_DEFS.filter((m) => playerState.missions[m.id].status === 'available');
  }

  /**
   * @param {SaveGame} saveGame
   * @param {PlayerState} playerState
   * @param {string} missionDefId
   * @param {string} armyId
   * @param {number} now
   */
  function fightMission(saveGame, playerState, missionDefId, armyId, now) {
    const mission = D.missionDefById(missionDefId);
    if (!mission) return { ok: false, reason: '找不到此關卡' };
    const missionState = playerState.missions[missionDefId];
    if (missionState.status === 'completed') return { ok: false, reason: '此關卡已完成' };
    if (missionState.status !== 'available') return { ok: false, reason: '尚未解鎖此關卡' };
    const army = playerState.armies[armyId];
    if (!army || army.status !== 'garrison') return { ok: false, reason: '部隊不可用' };
    if (window.Game.Systems.Army.unitCount(army) === 0) return { ok: false, reason: '部隊沒有兵力' };

    missionState.attempts += 1;
    const attackerUnitsBefore = Object.assign({}, army.units);
    const eff = window.Game.Systems.Economy.computeEffects(playerState);
    const result = window.Game.Systems.Combat.resolveBattle({
      attackerUnits: army.units, attackerHeroStateId: army.heroStateId, attackerEff: eff, attackerPlayerState: playerState,
      defenderUnits: mission.enemy.units, defenderHeroStateId: mission.enemy.heroId, defenderEff: {}
    });
    const { remaining, losses } = window.Game.Systems.Combat.applyCasualties(army.units, result.attackerLossRate);
    army.units = remaining;

    const battle = { attackerFactionId: playerState.factionId, attackerArmyId: army.id, targetName: mission.name, purpose: 'campaign', losses, time: now };
    const win = result.winner === 'attacker';

    if (win) {
      missionState.status = 'completed';
      missionState.completedAt = now;
      D.RESOURCE_TYPES.forEach((r) => {
        if (mission.reward.resources[r]) {
          playerState.resources[r] = U.clamp(playerState.resources[r] + mission.reward.resources[r], 0, eff.storageCap[r]);
        }
      });
      if (mission.reward.unlockHeroId) window.Game.Systems.Hero.unlockHeroFromMission(playerState, mission.reward.unlockHeroId);
      if (mission.reward.itemReward) window.Game.Systems.Hero.grantItem(playerState, mission.reward.itemReward, 1);
      if (army.heroStateId) window.Game.Systems.Hero.awardExp(playerState.heroes[army.heroStateId], 100);
      refreshMissionStatuses(playerState);
      battle.outcome = 'win';
      battle.text = '「' + mission.name + '」戰役勝利！' +
        (mission.reward.unlockHeroId ? '武將「' + D.heroDefById(mission.reward.unlockHeroId).name + '」加入陣營。' : '') +
        (mission.reward.itemReward ? '獲得「' + D.itemDefById(mission.reward.itemReward).name + '」。' : '');
    } else {
      battle.outcome = 'lose';
      battle.text = '「' + mission.name + '」戰役失利，部隊損失慘重，可整軍後再戰。';
    }

    playerState.battleLog.unshift(M.createBattleState(battle));
    window.Game.Systems.Combat.trimBattleLog(playerState);
    return {
      ok: true, win, battle, result,
      attackerHeroStateId: army.heroStateId,
      attackerUnitsBefore,
      defenderName: mission.enemy.name,
      defenderHeroStateId: mission.enemy.heroId,
      defenderUnitsBefore: mission.enemy.units
    };
  }

  window.Game.Systems.Mission = { refreshMissionStatuses, unlockedMissions, fightMission };
})();
