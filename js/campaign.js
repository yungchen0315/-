/* ============================================================================
 * campaign.js — 主線戰役／劇情任務：10~15 個關卡＋官渡／赤壁／夷陵史詩事件戰。
 * ==========================================================================*/

function isCampaignCompleted(state, missionId) { return state.campaignProgress.completedIds.includes(missionId); }

function fightCampaignMission(state, faction, missionId, armyId) {
  const mission = campaignById(missionId);
  if (!mission) return { ok: false, reason: '找不到此關卡' };
  if (isCampaignCompleted(state, missionId)) return { ok: false, reason: '此關卡已完成' };
  const unlocked = campaignsUnlocked(state.campaignProgress.completedIds).some((c) => c.id === missionId);
  if (!unlocked) return { ok: false, reason: '尚未解鎖此關卡' };
  const army = faction.armies.find((a) => a.id === armyId);
  if (!army || army.status !== 'garrison') return { ok: false, reason: '部隊不可用' };
  if (armyUnitCount(army) === 0) return { ok: false, reason: '部隊沒有兵力' };

  const eff = factionEffects(faction);
  const result = resolveBattle({
    attackerUnits: army.units, attackerGeneralId: army.generalId, attackerEff: eff, attackerFaction: faction,
    defenderUnits: mission.enemy.units, defenderGeneralId: null, defenderEff: {}
  });
  const { remaining, losses } = applyCasualties(army.units, result.attackerLossRate);
  army.units = remaining;

  const report = {
    id: uid('report'), time: nowMs(), factionId: faction.id,
    armyName: army.name, targetName: mission.name, purpose: 'campaign', losses
  };

  if (result.winner === 'attacker') {
    state.campaignProgress.completedIds.push(missionId);
    RESOURCE_TYPES.forEach((r) => {
      if (mission.reward.resources[r]) {
        faction.resources[r] = clamp(faction.resources[r] + mission.reward.resources[r], 0, factionEffects(faction).storageCap[r]);
      }
    });
    if (mission.reward.unlockGeneral) unlockGeneralFromCampaign(faction, mission.reward.unlockGeneral);
    if (mission.reward.itemReward) grantItem(faction, mission.reward.itemReward, 1);
    if (army.generalId) awardGeneralExp(faction, army.generalId, 100);
    report.outcome = 'win';
    report.text = '「' + mission.name + '」戰役勝利！' +
      (mission.reward.unlockGeneral ? '武將「' + generalById(mission.reward.unlockGeneral).name + '」加入陣營。' : '') +
      (mission.reward.itemReward ? '獲得「' + itemById(mission.reward.itemReward).name + '」。' : '');
  } else {
    report.outcome = 'lose';
    report.text = '「' + mission.name + '」戰役失利，部隊損失慘重，可整軍後再戰。';
  }
  faction.battleReports.unshift(report);
  trimReports(faction);
  return { ok: true, win: result.winner === 'attacker', report };
}

/* ---------------------------------------------------------------------- */
/* 畫面渲染                                                                 */
/* ---------------------------------------------------------------------- */
function renderCampaignScreen(container, state, faction) {
  clearNode(container);
  const unlocked = campaignsUnlocked(state.campaignProgress.completedIds);
  const completed = CAMPAIGNS.filter((c) => isCampaignCompleted(state, c.id));

  const progressPanel = el('div', 'panel');
  progressPanel.appendChild(el('div', 'panelTitle', '戰役進度：' + completed.length + ' / ' + CAMPAIGNS.length));
  container.appendChild(progressPanel);

  const listPanel = el('div', 'panel');
  listPanel.appendChild(el('div', 'panelTitle', unlocked.length ? '可挑戰的關卡' : '已完成全部主線關卡'));
  unlocked.forEach((mission) => {
    const card = el('div', 'campaignCard' + (mission.epic ? ' epicCard' : ''));
    card.appendChild(el('div', 'campaignName', (mission.epic ? '★ ' : '') + mission.name));
    card.appendChild(el('div', 'campaignFlavor', mission.flavor));
    card.appendChild(el('div', 'campaignEnemy', '敵軍：' + mission.enemy.name + '　' +
      Object.keys(mission.enemy.units).map((u) => unitDef(u).icon + mission.enemy.units[u]).join(' ')));
    const rewardLine = el('div', 'campaignReward', '獎勵：' +
      Object.keys(mission.reward.resources).map((r) => RESOURCE_ICONS[r] + mission.reward.resources[r]).join(' ') +
      (mission.reward.unlockGeneral ? '　武將：' + generalById(mission.reward.unlockGeneral).name : '') +
      (mission.reward.itemReward ? '　裝備：' + itemById(mission.reward.itemReward).name : ''));
    card.appendChild(rewardLine);

    const garrisonArmies = faction.armies.filter((a) => a.status === 'garrison' && armyUnitCount(a) > 0);
    if (garrisonArmies.length === 0) {
      card.appendChild(el('div', 'emptyHint', '沒有可用部隊，請先訓練兵力。'));
    } else {
      const row = el('div', 'campaignFightRow');
      const select = document.createElement('select');
      select.className = 'armySelect';
      garrisonArmies.forEach((a) => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = a.name + '（' + armyUnitCount(a) + ' 兵）';
        select.appendChild(opt);
      });
      row.appendChild(select);
      const btn = el('button', 'smallBtn', '出戰');
      onTap(btn, () => {
        const r = fightCampaignMission(state, faction, mission.id, select.value);
        if (r.ok) {
          toast(r.win ? '戰役勝利！' : '戰役失利，可再次挑戰');
          renderCampaignScreen(container, state, faction);
          refreshTopBar();
        } else toast(r.reason);
      });
      row.appendChild(btn);
      card.appendChild(row);
    }
    listPanel.appendChild(card);
  });
  container.appendChild(listPanel);

  if (completed.length) {
    const donePanel = el('div', 'panel');
    donePanel.appendChild(el('div', 'panelTitle', '已完成關卡'));
    completed.forEach((c) => donePanel.appendChild(el('div', 'campaignDoneRow', '✔ ' + c.name)));
    container.appendChild(donePanel);
  }
}
