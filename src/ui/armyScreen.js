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
          row.appendChild(U.el('span', 'unitName', unit.name));
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
      marchPanel.appendChild(U.el('div', 'panelTitle', '行軍中部隊（' + marchingArmies.length + '）'));
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
    const heroState = army.heroStateId ? playerState.heroes[army.heroStateId] : null;
    card.appendChild(U.el('div', 'armyGeneral', heroState ? '主將：' + D.heroDefById(heroState.heroDataId).name : '未指派主將'));

    const heroList = Object.values(playerState.heroes);
    if (army.status === 'garrison' && heroList.length > 0) {
      const assignRow = U.el('div', 'generalAssignRow');
      const select = document.createElement('select');
      select.className = 'armySelect';
      const noneOpt = document.createElement('option');
      noneOpt.value = '';
      noneOpt.textContent = '（不指派）';
      select.appendChild(noneOpt);
      heroList.forEach((h) => {
        const opt = document.createElement('option');
        opt.value = h.heroDataId;
        opt.textContent = D.heroDefById(h.heroDataId).name + '（統率上限 ' + Hero.leadershipCap(h) + '）';
        if (h.heroDataId === army.heroStateId) opt.selected = true;
        select.appendChild(opt);
      });
      assignRow.appendChild(select);
      const assignBtn = U.el('button', 'smallBtn', '指派主將');
      U.onTap(assignBtn, () => {
        const r = select.value ? Hero.assignHeroToArmy(playerState, select.value, army) : Hero.unassignHero(playerState, army);
        if (r.ok) { Dlg.toast('已更新主將'); render(document.getElementById('screenArmy'), saveGame, playerState); }
        else Dlg.toast(r.reason);
      });
      assignRow.appendChild(assignBtn);
      card.appendChild(assignRow);
    }

    if (army.status !== 'garrison') {
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
    const key = army.status === 'marching' ? army.targetTileId : null;
    if (army.status === 'returning') return '本城';
    const tile = key ? saveGame.map.tiles[key] : null;
    if (!tile) return '未知地點';
    return tile.name || '未知地點';
  }

  function armyStatusLabel(army) {
    if (army.status === 'garrison') return '駐守中';
    if (army.status === 'marching') return '行軍中';
    return '返回中';
  }

  window.Game.UI.ArmyScreen = { render };
})();
