/* ============================================================================
 * armyScreen.js — 「軍隊」分頁：練兵、部隊列表、主將指派、拆分/解散。
 * 對應舊版 js/army.js 的畫面渲染部分。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;
  const Dlg = window.Game.UI.Dialog;

  function render(container, saveGame, playerState) {
    U.clearNode(container);
    const Army = window.Game.Systems.Army;
    const city = Army.primaryCity(playerState);

    const trainPanel = U.el('div', 'panel');
    trainPanel.appendChild(U.el('div', 'panelTitle', '訓練部隊'));
    ['barracks', 'drillground', 'workshop'].forEach((bt) => {
      const b = city.buildings[bt];
      const box = U.el('div', 'trainBuildingBox');
      box.appendChild(U.el('div', 'trainBuildingTitle', D.buildingDefById(bt).icon + ' ' + D.buildingDefById(bt).name + '（Lv.' + b.level + '）'));
      if (b.level > 0) {
        Army.trainableUnitIds(bt).forEach((ut) => {
          const unit = D.unitDefById(ut);
          const ld = D.buildingLevelDef(bt, b.level);
          const locked = unit.tier > (ld.effect.unlockUnitTier || 1);
          const row = U.el('div', 'trainUnitRow' + (locked ? ' locked' : ''));
          row.appendChild(U.el('span', 'unitIcon', unit.icon));
          const counterText = D.describeCounters(unit);
          row.appendChild(U.el('span', 'unitName', unit.name + (counterText ? '（' + counterText + '）' : '')));
          row.appendChild(U.el('span', 'unitStats', '攻' + unit.stats.atk + ' 防' + unit.stats.def + ' 血' + unit.stats.hp));
          row.appendChild(U.el('span', 'unitCost', Object.keys(unit.cost).map((r) => D.RESOURCE_ICONS[r] + unit.cost[r]).join(' ')));
          if (!locked) {
            const btn5 = U.el('button', 'smallBtn', '訓練x5');
            U.onTap(btn5, () => {
              const r = Army.queueTraining(playerState, city, bt, ut, 5, U.now());
              if (r.ok) { Dlg.toast('已加入訓練佇列'); render(container, saveGame, playerState); window.Game.UI.TopBar.refresh(playerState); } else Dlg.toast(r.reason);
            });
            row.appendChild(btn5);
          } else {
            row.appendChild(U.el('span', 'lockedHint', '尚未解鎖'));
          }
          box.appendChild(row);
        });
        b.trainQueue.forEach((item, idx) => {
          const q = U.el('div', 'queueRow');
          q.appendChild(U.el('span', '', (idx === 0 ? '訓練中：' : '排隊中：') + D.unitDefById(item.unitDefId).name + ' x' + item.qty));
          q.appendChild(U.el('span', 'timerText', idx === 0 ? U.formatCountdown(Math.max(0, item.completeAt - U.now())) : ''));
          box.appendChild(q);
        });
      }
      trainPanel.appendChild(box);
    });
    container.appendChild(trainPanel);

    const armies = Object.values(playerState.armies);
    const marchingArmies = armies.filter((a) => a.status !== 'garrison');
    if (marchingArmies.length > 0) {
      const marchPanel = U.el('div', 'panel marchPanel');
      marchPanel.appendChild(U.el('div', 'panelTitle', '出征中部隊（' + marchingArmies.length + '）'));
      marchingArmies.forEach((army) => { marchPanel.appendChild(buildArmyCard(container, saveGame, playerState, army, false)); });
      container.appendChild(marchPanel);
    }

    const armyPanel = U.el('div', 'panel');
    armyPanel.appendChild(U.el('div', 'panelTitle', '駐守部隊'));
    const garrisonArmies = armies.filter((a) => a.status === 'garrison');
    if (garrisonArmies.length === 0) armyPanel.appendChild(U.el('div', 'emptyHint', '目前沒有駐守部隊。'));
    garrisonArmies.forEach((army, idx) => { armyPanel.appendChild(buildArmyCard(container, saveGame, playerState, army, idx === 0)); });

    if (garrisonArmies.length > 0 && Army.unitCount(garrisonArmies[0]) >= 2) {
      const splitBtn = U.el('button', 'smallBtn', '拆分部隊（各兵種各半組成新軍）');
      U.onTap(splitBtn, () => {
        const r = Army.formNewArmyFromHalf(playerState);
        if (r.ok) { Dlg.toast('已組成新部隊「' + r.army.name + '」'); render(container, saveGame, playerState); } else Dlg.toast(r.reason);
      });
      armyPanel.appendChild(splitBtn);
    }
    container.appendChild(armyPanel);
  }

  /**
   * 編隊面板：一隊 1 主將＋最多 2 副將。全隊技能在戰鬥時一起疊加、統率上限相加，
   * 因此副將愈多能帶愈多兵、戰力也愈強（率土之濱式多武將編隊）。駐守時可自由增減，
   * 行軍／交戰中則鎖定不可調整。
   */
  function buildSquadEditor(card, saveGame, playerState, army) {
    const Army = window.Game.Systems.Army;
    const Hero = window.Game.Systems.Hero;
    const heroName = (id) => (D.heroDefById(id) || {}).name || '未知武將';
    const squadIds = Hero.squadHeroIds(army);

    card.appendChild(U.el('div', 'armyGeneral', squadIds.length
      ? '主將：' + heroName(army.heroStateId) + ((army.subHeroStateIds || []).length ? '　副將：' + army.subHeroStateIds.map(heroName).join('、') : '')
      : '未編列武將'));
    card.appendChild(U.el('div', 'armySquadHint', '編隊統率上限 ' + Hero.armyLeadershipCap(playerState, army) + '　部隊統率需求 ' + Army.leadershipUsed(army)));

    // 武將羈絆：已觸發的合擊／連攜（綠色），以及差一名即可觸發的提示（灰色）。
    D.activeBonds(squadIds).forEach((b) => {
      card.appendChild(U.el('div', 'squadBondLine', '⚡ ' + b.type + '【' + b.name + '】　' + D.describeSkillEffects(b.effects)));
    });
    D.nearBonds(squadIds).forEach((b) => {
      const missing = b.heroIds.filter((id) => squadIds.indexOf(id) < 0).map((id) => (D.heroDefById(id) || {}).name);
      card.appendChild(U.el('div', 'squadBondHint', '差一名可觸發【' + b.name + '】：' + missing.join('／')));
    });

    if (army.status !== 'garrison') return; // 行軍／交戰中不可調整編隊。

    // 已在隊上的武將：各自可「卸除」（若卸除主將，由第一名副將遞補）。
    squadIds.forEach((id, idx) => {
      const row = U.el('div', 'squadSlotRow');
      const hs = playerState.heroes[id];
      row.appendChild(U.el('span', 'squadSlotRole', idx === 0 ? '主將' : '副將'));
      row.appendChild(U.el('span', 'squadSlotName', heroName(id) + '（統率 ' + (hs ? Hero.leadershipCap(hs) : 0) + '）'));
      const removeBtn = U.el('button', 'smallBtn squadRemoveBtn', '卸除');
      U.onTap(removeBtn, () => {
        const r = Hero.removeHeroFromArmy(playerState, army, id);
        if (r.ok) { render(document.getElementById('screenArmy'), saveGame, playerState); } else Dlg.toast(r.reason);
      });
      row.appendChild(removeBtn);
      card.appendChild(row);
    });

    // 還有空位（主將未指派，或副將未滿）時，提供一個下拉選單指派尚未編隊的武將。
    const hasRoom = !army.heroStateId || (army.subHeroStateIds || []).length < Hero.SQUAD_SUB_MAX;
    if (!hasRoom) return;
    const available = Object.values(playerState.heroes).filter((h) => !h.assignedArmyId);
    if (available.length === 0) {
      if (squadIds.length === 0) card.appendChild(U.el('div', 'emptyHint', '目前沒有可編入的武將。'));
      return;
    }
    const assignRow = U.el('div', 'generalAssignRow');
    const select = document.createElement('select');
    select.className = 'armySelect';
    available.forEach((h) => {
      const opt = document.createElement('option');
      opt.value = h.heroDataId;
      opt.textContent = D.heroDefById(h.heroDataId).name + '（統率上限 ' + Hero.leadershipCap(h) + '）';
      select.appendChild(opt);
    });
    assignRow.appendChild(select);
    const assignBtn = U.el('button', 'smallBtn', army.heroStateId ? '加入副將' : '指派主將');
    U.onTap(assignBtn, () => {
      const r = Hero.assignHeroToArmy(playerState, select.value, army);
      if (r.ok) { render(document.getElementById('screenArmy'), saveGame, playerState); } else Dlg.toast(r.reason);
    });
    assignRow.appendChild(assignBtn);
    card.appendChild(assignRow);
  }

  function buildArmyCard(container, saveGame, playerState, army, isPrimary) {
    const Army = window.Game.Systems.Army;
    const Hero = window.Game.Systems.Hero;
    const card = U.el('div', 'armyCard' + (army.status !== 'garrison' ? ' armyCardMarching' : ''));
    const head = U.el('div', 'armyHead');
    head.appendChild(U.el('span', 'armyName', army.name));
    head.appendChild(U.el('span', 'armyStatus', armyStatusLabel(army)));
    card.appendChild(head);
    const unitsLine = U.el('div', 'armyUnits', Object.keys(army.units).filter((u) => army.units[u] > 0)
      .map((u) => { const d = D.unitDefById(u); return d.icon + army.units[u] + '（攻' + d.stats.atk + ' 防' + d.stats.def + '）'; }).join('　') || '（無兵力）');
    card.appendChild(unitsLine);
    buildSquadEditor(card, saveGame, playerState, army);

    if (army.status === 'fighting') {
      const destName = marchTargetName(saveGame, playerState, army);
      card.appendChild(U.el('div', 'armyDestination', '交戰地點：' + destName));
      const activeBattle = window.Game.Systems.Combat.activeBattleForArmy(saveGame, army.id, U.now());
      if (activeBattle) {
        const progress = U.clamp((U.now() - activeBattle.startAt) / Math.max(1, activeBattle.endAt - activeBattle.startAt), 0, 1);
        const barWrap = U.el('div', 'marchBarWrap');
        const bar = U.el('div', 'marchBar');
        bar.style.width = Math.round(progress * 100) + '%';
        barWrap.appendChild(bar);
        card.appendChild(barWrap);
      }
      card.appendChild(U.el('div', 'timerText', '⚔ 戰鬥進行中，前往地圖點選該地可觀戰'));
    } else if (army.status !== 'garrison') {
      const destName = marchTargetName(saveGame, playerState, army);
      card.appendChild(U.el('div', 'armyDestination', (army.status === 'marching' ? '目的地：' : '返回：') + destName));
      const progress = U.clamp((U.now() - army.departAt) / Math.max(1, army.arriveAt - army.departAt), 0, 1);
      const barWrap = U.el('div', 'marchBarWrap');
      const bar = U.el('div', 'marchBar');
      bar.style.width = Math.round(progress * 100) + '%';
      barWrap.appendChild(bar);
      card.appendChild(barWrap);
      card.appendChild(U.el('div', 'timerText', '預計 ' + U.formatCountdown(Math.max(0, army.arriveAt - U.now())) + ' 後' + (army.status === 'marching' ? '抵達' : '返回')));
    } else {
      const goMapBtn = U.el('button', 'smallBtn', '前往地圖派兵');
      U.onTap(goMapBtn, () => { window.Game.UI.MapScreen.setPendingArmy(army.id); window.Game.UI.Bootstrap.switchScreen('map'); });
      card.appendChild(goMapBtn);
      if (!isPrimary) {
        const disbandBtn = U.el('button', 'smallBtn disbandBtn', '解散並歸還主力部隊');
        U.onTap(disbandBtn, () => {
          Army.disbandArmyIntoHome(playerState, army.id);
          Dlg.toast('已解散並歸還兵力');
          render(document.getElementById('screenArmy'), saveGame, playerState);
        });
        card.appendChild(disbandBtn);
      }
    }
    return card;
  }

  function marchTargetName(saveGame, playerState, army) {
    const key = (army.status === 'marching' || army.status === 'fighting') ? army.targetTileId : null;
    if (army.status === 'returning') return '本城';
    const tile = key ? saveGame.map.tiles[key] : null;
    if (!tile) return '未知地點';
    return tile.name || '未知地點';
  }

  function armyStatusLabel(army) {
    if (army.status === 'garrison') return '駐守中';
    if (army.status === 'marching') return '行軍中';
    if (army.status === 'fighting') return '交戰中';
    return '返回中';
  }

  window.Game.UI.ArmyScreen = { render };
})();
