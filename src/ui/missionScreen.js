/* ============================================================================
 * missionScreen.js — 「戰役」分頁：主線關卡列表與出戰。對應舊版 js/campaign.js。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;
  const Dlg = window.Game.UI.Dialog;

  function render(container, saveGame, playerState) {
    U.clearNode(container);
    const Mission = window.Game.Systems.Mission;
    const Army = window.Game.Systems.Army;

    const factionMissions = D.missionDefsForFaction(playerState.factionId);
    const missionStates = Object.values(playerState.missions);
    const completed = missionStates.filter((m) => m.status === 'completed');
    const available = factionMissions.filter((m) => playerState.missions[m.id].status === 'available');

    const progressPanel = U.el('div', 'panel');
    progressPanel.appendChild(U.el('div', 'panelTitle', '戰役進度：' + completed.length + ' / ' + factionMissions.length));
    container.appendChild(progressPanel);

    const listPanel = U.el('div', 'panel');
    listPanel.appendChild(U.el('div', 'panelTitle', available.length ? '可挑戰的關卡' : '已完成全部主線關卡'));
    available.forEach((mission) => {
      const card = U.el('div', 'campaignCard' + (mission.epic ? ' epicCard' : ''));
      card.appendChild(U.el('div', 'campaignName', (mission.epic ? '★ ' : '') + mission.name));
      card.appendChild(U.el('div', 'campaignFlavor', mission.flavor));
      card.appendChild(U.el('div', 'campaignEnemy', '敵軍：' + mission.enemy.name + '　' +
        Object.keys(mission.enemy.units).map((u) => D.unitDefById(u).icon + mission.enemy.units[u]).join(' ')));
      card.appendChild(U.el('div', 'campaignReward', '獎勵：' +
        Object.keys(mission.reward.resources).map((r) => D.RESOURCE_ICONS[r] + mission.reward.resources[r]).join(' ') +
        (mission.reward.unlockHeroId ? '　武將：' + D.heroDefById(mission.reward.unlockHeroId).name : '') +
        (mission.reward.itemReward ? '　裝備：' + D.itemDefById(mission.reward.itemReward).name : '')));

      const garrisonArmies = Object.values(playerState.armies).filter((a) => a.status === 'garrison' && Army.unitCount(a) > 0);
      if (garrisonArmies.length === 0) {
        card.appendChild(U.el('div', 'emptyHint', '沒有可用部隊，請先訓練兵力。'));
      } else {
        const row = U.el('div', 'campaignFightRow');
        const select = document.createElement('select');
        select.className = 'armySelect';
        garrisonArmies.forEach((a) => {
          const opt = document.createElement('option');
          opt.value = a.id;
          opt.textContent = a.name + '（' + Army.unitCount(a) + ' 兵）';
          select.appendChild(opt);
        });
        row.appendChild(select);
        const btn = U.el('button', 'smallBtn', '出戰');
        U.onTap(btn, () => {
          const r = Mission.fightMission(saveGame, playerState, mission.id, select.value, U.now());
          if (!r.ok) { Dlg.toast(r.reason); return; }
          window.Game.UI.TopBar.refresh(playerState);
          window.Game.UI.BattleScreen.play(playerState, {
            title: mission.name,
            attackerHeroStateId: r.attackerHeroStateId,
            attackerSubHeroStateIds: r.attackerSubHeroStateIds,
            attackerUnitsBefore: r.attackerUnitsBefore,
            defenderHeroStateId: r.defenderHeroStateId,
            defenderUnitsBefore: r.defenderUnitsBefore,
            defenderName: r.defenderName,
            defenderFactionId: mission.enemy.factionId,
            timeline: r.result.timeline,
            win: r.win,
            resultText: r.battle.text
          }, () => {
            Dlg.toast(r.win ? '戰役勝利！' : '戰役失利，可再次挑戰');
            render(container, saveGame, playerState);
          });
        });
        row.appendChild(btn);
        card.appendChild(row);
      }
      listPanel.appendChild(card);
    });
    container.appendChild(listPanel);

    if (completed.length) {
      const donePanel = U.el('div', 'panel');
      donePanel.appendChild(U.el('div', 'panelTitle', '已完成關卡'));
      completed.forEach((m) => donePanel.appendChild(U.el('div', 'campaignDoneRow', '✔ ' + D.missionDefById(m.missionDefId).name)));
      container.appendChild(donePanel);
    }
  }

  window.Game.UI.MissionScreen = { render };
})();
