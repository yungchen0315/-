/* ============================================================================
 * cityScreen.js — 「城池」分頁：建築升級、事件、科技研究、成就摘要。
 * 對應舊版 js/city.js + js/events.js 事件面板 + js/research.js 面板 + js/achievements.js 面板。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;
  const Dlg = window.Game.UI.Dialog;

  let selectedCityId = null;

  function renderCitySwitcher(container, saveGame, playerState) {
    const cityList = Object.values(playerState.cities);
    if (cityList.length <= 1) return;
    const row = U.el('div', 'citySwitchRow');
    cityList.forEach((c) => {
      const active = c.id === (selectedCityId || cityList[0].id);
      const btn = U.el('button', 'citySwitchBtn' + (active ? ' citySwitchActive' : ''), c.name);
      U.onTap(btn, () => { selectedCityId = c.id; render(container, saveGame, playerState); });
      row.appendChild(btn);
    });
    container.appendChild(row);
  }

  function render(container, saveGame, playerState) {
    U.clearNode(container);
    if (Object.keys(playerState.cities).length === 0) { container.appendChild(U.el('div', 'emptyHint', '尚無城池')); return; }
    if (!selectedCityId || !playerState.cities[selectedCityId]) selectedCityId = Object.values(playerState.cities)[0].id;
    const city = playerState.cities[selectedCityId];
    const eff = window.Game.Systems.Economy.computeEffects(playerState);

    renderCitySwitcher(container, saveGame, playerState);

    const summary = U.el('div', 'panel resourceSummary');
    summary.appendChild(U.el('div', 'panelTitle', '總覽（全部 ' + Object.keys(playerState.cities).length + ' 座城池合計）'));
    const rateRow = U.el('div', 'rateRow');
    rateRow.appendChild(U.el('span', 'rateItem', D.RESOURCE_ICONS.food + ' +' + Math.round(eff.foodPerHour) + '/時'));
    rateRow.appendChild(U.el('span', 'rateItem', D.RESOURCE_ICONS.wood + ' +' + Math.round(eff.woodPerHour) + '/時'));
    rateRow.appendChild(U.el('span', 'rateItem', D.RESOURCE_ICONS.stone + ' +' + Math.round(eff.stonePerHour) + '/時'));
    rateRow.appendChild(U.el('span', 'rateItem', D.RESOURCE_ICONS.gold + ' +' + Math.round(eff.goldPerHour) + '/時'));
    summary.appendChild(rateRow);

    const tiles = window.Game.Systems.Map.ownedResourceTiles(saveGame.map, playerState.factionId);
    if (tiles.length > 0) {
      const tileYield = window.Game.Systems.Map.ownedResourceYieldPerMin(saveGame.map, playerState.factionId);
      const tileRow = U.el('div', 'rateRow tileYieldRow');
      D.RESOURCE_TYPES.forEach((r) => {
        if (tileYield[r] > 0) tileRow.appendChild(U.el('span', 'rateItem tileYieldItem', D.RESOURCE_ICONS[r] + ' +' + tileYield[r] + '/分（產地）'));
      });
      summary.appendChild(tileRow);
      summary.appendChild(U.el('div', 'subHint', '已佔領 ' + tiles.length + ' 個產地，持續固定產出中（不需駐守）。'));
    }

    if (eff.dailyIngotYield > 0) {
      summary.appendChild(U.el('div', 'subHint', '每座已攻佔城池每天固定產出元寶（首都全額、其他城池半額）：🧧 +' + eff.dailyIngotYield + '/天'));
    }

    const popUsed = window.Game.Systems.Army.leadershipUsedByFaction(playerState);
    summary.appendChild(U.el('div', 'popRow', '統率上限：' + popUsed + ' / ' + eff.popCap));
    container.appendChild(summary);

    renderEventsPanel(container, playerState);
    renderResearchPanel(container, playerState);

    const hasActiveUpgrade = window.Game.Systems.CityBuilding.hasActiveUpgrade(city);
    Object.keys(city.buildings).forEach((type) => {
      const b = city.buildings[type];
      if (b.upgrade) {
        const box = U.el('div', 'panel buildingInProgress');
        box.appendChild(U.el('div', 'panelTitle', '施工中：' + D.buildingDefById(type).name + ' → ' + b.upgrade.targetLevel + ' 級'));
        box.appendChild(U.el('div', 'timerText', formatCountdown(Math.max(0, b.upgrade.completeAt - U.now()))));
        container.appendChild(box);
      }
    });

    container.appendChild(U.el('div', 'panelTitle citySectionTitle', '城池建設：' + city.name));
    const list = U.el('div', 'buildingList');
    D.BUILDING_ORDER.forEach((type) => {
      list.appendChild(buildingCard(container, saveGame, playerState, city, type));
    });
    container.appendChild(list);

    renderAchievementsPanel(container, playerState);
  }

  function buildingCard(container, saveGame, playerState, city, type) {
    const def = D.buildingDefById(type);
    const b = city.buildings[type];
    const CB = window.Game.Systems.CityBuilding;
    const card = U.el('div', 'buildingCard');
    const head = U.el('div', 'buildingHead');
    head.appendChild(U.el('span', 'buildingIcon', def.icon));
    head.appendChild(U.el('span', 'buildingName', def.name));
    head.appendChild(U.el('span', 'buildingLevel', b.level > 0 ? 'Lv.' + b.level : '未建造'));
    card.appendChild(head);
    card.appendChild(U.el('div', 'buildingDesc', def.desc));

    const check = CB.canStartUpgrade(city, type);
    const btn = U.el('button', 'upgradeBtn' + (check.ok ? '' : ' disabled'));
    if (check.ok) {
      btn.textContent = (b.level === 0 ? '建造' : '升級至 ' + check.info.targetLevel + ' 級') + '（' + formatDurationWords(check.info.timeMs) + '）';
      U.onTap(btn, () => {
        if (!U.canAfford(playerState.resources, check.info.cost)) { Dlg.toast('資源不足'); return; }
        const r = CB.startUpgrade(playerState, city, type, U.now());
        if (r.ok) { Dlg.toast(def.name + (b.level === 0 ? ' 建造開始' : ' 升級開始')); render(container, saveGame, playerState); window.Game.UI.TopBar.refresh(playerState); }
        else Dlg.toast(r.reason);
      });
    } else {
      btn.textContent = check.reason;
    }
    card.appendChild(btn);

    const info = check.ok ? check.info : CB.nextUpgradeInfo(city, type);
    if (info) {
      const costLine = U.el('div', 'costLine');
      Object.keys(info.cost).forEach((r) => {
        const have = playerState.resources[r] >= info.cost[r];
        costLine.appendChild(U.el('span', 'costItem' + (have ? '' : ' costShort'), D.RESOURCE_ICONS[r] + info.cost[r]));
      });
      card.appendChild(costLine);
    }
    return card;
  }

  function renderEventsPanel(container, playerState) {
    const panel = U.el('div', 'panel');
    panel.appendChild(U.el('div', 'panelTitle', '城中事件'));
    if (playerState.pendingEvents.length === 0) {
      panel.appendChild(U.el('div', 'emptyHint', '目前沒有事件，過一段時間再來看看。'));
    } else {
      playerState.pendingEvents.forEach((ev) => {
        const eventType = D.eventTypeDefById(ev.eventTypeDefId);
        const Event = window.Game.Systems.Event;
        const row = U.el('div', 'eventRow');
        row.appendChild(U.el('div', 'eventName', eventType.name));
        row.appendChild(U.el('div', 'eventFlavor', eventType.flavor));
        row.appendChild(U.el('div', 'timerText', '剩餘 ' + formatCountdown(Math.max(0, ev.deadlineAt - U.now()))));

        if (eventType.tradeOptions && eventType.tradeOptions.length) {
          const tradeRow = U.el('div', 'eventTradeRow');
          eventType.tradeOptions.forEach((opt, idx) => {
            const affordable = Event.tradeOptionAffordable(playerState, opt);
            const label = Event.describeAmounts(opt.give) + ' → ' + Event.describeAmounts(opt.get);
            const btn = U.el('button', 'smallBtn' + (affordable ? '' : ' disabled'), label);
            if (affordable) {
              U.onTap(btn, () => {
                const r = Event.resolveTrade(playerState, ev.id, idx);
                Dlg.toast(r.ok ? Event.describeOutcome(r) : r.reason);
                render(container, window.GameSave, playerState);
                window.Game.UI.TopBar.refresh(playerState);
              });
            }
            tradeRow.appendChild(btn);
          });
          row.appendChild(tradeRow);
        } else {
          const btn = U.el('button', 'smallBtn', '立即處理');
          U.onTap(btn, () => {
            const r = Event.claimEventNow(playerState, ev.id);
            Dlg.toast(r.ok ? Event.describeOutcome(r.outcome) : r.reason);
            render(container, window.GameSave, playerState);
            window.Game.UI.TopBar.refresh(playerState);
          });
          row.appendChild(btn);
        }
        panel.appendChild(row);
      });
    }
    container.appendChild(panel);
  }

  const TECH_CATEGORY_LABELS = { economy: '經濟', military: '軍事', city: '城防' };

  function renderResearchPanel(container, playerState) {
    const hasAcademy = Object.values(playerState.cities).some((c) => c.buildings.academy.level > 0);
    if (!hasAcademy) return;
    const Tech = window.Game.Systems.Technology;
    const panel = U.el('div', 'panel');
    panel.appendChild(U.el('div', 'panelTitle', '學院科技研究'));

    const researching = Object.values(playerState.technologies).find((t) => t.status === 'researching');
    if (researching) {
      const row = U.el('div', 'queueRow');
      row.appendChild(U.el('span', '', '研究中：' + D.technologyDefById(researching.technologyDefId).name));
      row.appendChild(U.el('span', 'timerText', formatCountdown(Math.max(0, researching.completeAt - U.now()))));
      panel.appendChild(row);
    }

    const techs = Tech.availableTechnologies(playerState);
    if (techs.length === 0) {
      panel.appendChild(U.el('div', 'emptyHint', researching ? '研究進行中。' : '暫無可研究的科技，請升級學院解鎖更高階科技。'));
    } else {
      techs.forEach((tech) => {
        const check = Tech.canQueueResearch(playerState, tech.id);
        const row = U.el('div', 'techRow');
        row.appendChild(U.el('div', 'techName', '【' + TECH_CATEGORY_LABELS[tech.category] + '】' + tech.name));
        row.appendChild(U.el('div', 'techCost', Object.keys(tech.cost).map((r) => D.RESOURCE_ICONS[r] + tech.cost[r]).join(' ') + '　' + formatDurationWords(tech.timeMs)));
        const btn = U.el('button', 'smallBtn' + (check.ok ? '' : ' disabled'), check.ok ? '研究' : check.reason);
        if (check.ok) {
          U.onTap(btn, () => {
            const r = Tech.queueResearch(playerState, tech.id, U.now());
            if (r.ok) { Dlg.toast('開始研究：' + tech.name); render(container, window.GameSave, playerState); window.Game.UI.TopBar.refresh(playerState); }
            else Dlg.toast(r.reason);
          });
        }
        row.appendChild(btn);
        panel.appendChild(row);
      });
    }

    const completed = Object.values(playerState.technologies).filter((t) => t.status === 'completed');
    if (completed.length > 0) {
      panel.appendChild(U.el('div', 'techDoneWrap subHint', '已完成：' + completed.map((t) => D.technologyDefById(t.technologyDefId).name).join('、')));
    }
    container.appendChild(panel);
  }

  function renderAchievementsPanel(container, playerState) {
    const panel = U.el('div', 'panel');
    panel.appendChild(U.el('div', 'panelTitle', '成就（' + playerState.unlockedAchievementIds.length + ' / ' + D.ACHIEVEMENT_DEFS.length + '）'));
    const unlocked = new Set(playerState.unlockedAchievementIds);
    D.ACHIEVEMENT_DEFS.forEach((a) => {
      const done = unlocked.has(a.id);
      const row = U.el('div', 'achievementRow' + (done ? ' achievementDone' : ''));
      row.appendChild(U.el('span', 'achievementName', (done ? '✔ ' : '☐ ') + a.name));
      row.appendChild(U.el('span', 'achievementDesc', a.desc));
      panel.appendChild(row);
    });
    container.appendChild(panel);
  }

  function formatCountdown(ms) { return window.Game.Utils.formatCountdown(ms); }
  function formatDurationWords(ms) { return window.Game.Utils.formatDurationWords(ms); }

  window.Game.UI.CityScreen = { render };
})();
