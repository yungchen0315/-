/* ============================================================================
 * city.js — 城池經營：建築升級、資源產出摘要、「城池」分頁畫面渲染。
 * ==========================================================================*/

function capitalCapLevel(faction) { return faction.buildings.capital.level; }

function nextUpgradeInfo(faction, type) {
  const cur = faction.buildings[type].level;
  const def = buildingDef(type);
  if (cur >= def.levels.length) return null;
  const targetLevel = cur + 1;
  const ld = buildingLevelDef(type, targetLevel);
  return { targetLevel, cost: ld.cost, timeMs: ld.timeMs };
}

function canStartUpgrade(faction, type) {
  if (faction.activeBuildUpgrade) return { ok: false, reason: '已有建築正在施工' };
  const info = nextUpgradeInfo(faction, type);
  if (!info) return { ok: false, reason: '已達最高等級' };
  if (type !== 'capital' && info.targetLevel > capitalCapLevel(faction)) return { ok: false, reason: '需先升級主城' };
  if (!canAfford(faction.resources, info.cost)) return { ok: false, reason: '資源不足' };
  return { ok: true, info };
}

function startUpgrade(faction, type) {
  const check = canStartUpgrade(faction, type);
  if (!check.ok) return check;
  payCost(faction.resources, check.info.cost);
  const now = nowMs();
  faction.activeBuildUpgrade = {
    buildingType: type,
    targetLevel: check.info.targetLevel,
    startAt: now,
    completeAt: now + check.info.timeMs
  };
  return { ok: true };
}

function speedUpBuildInstant(faction) {
  if (!faction.activeBuildUpgrade) return false;
  faction.activeBuildUpgrade.completeAt = nowMs();
  return true;
}

/* ---------------------------------------------------------------------- */
/* 畫面渲染                                                                 */
/* ---------------------------------------------------------------------- */
function renderCityScreen(container, faction) {
  clearNode(container);
  const eff = factionEffects(faction);

  const summary = el('div', 'panel resourceSummary');
  summary.appendChild(el('div', 'panelTitle', '主城總覽'));
  const rateRow = el('div', 'rateRow');
  rateRow.appendChild(el('span', 'rateItem', RESOURCE_ICONS.food + ' +' + formatNumber(eff.foodPerHour) + '/時'));
  rateRow.appendChild(el('span', 'rateItem', RESOURCE_ICONS.wood + ' +' + formatNumber(eff.woodPerHour) + '/時'));
  rateRow.appendChild(el('span', 'rateItem', RESOURCE_ICONS.stone + ' +' + formatNumber(eff.stonePerHour) + '/時'));
  rateRow.appendChild(el('span', 'rateItem', RESOURCE_ICONS.gold + ' +' + formatNumber(eff.goldPerHour) + '/時'));
  summary.appendChild(rateRow);

  const state = window.GameState;
  if (state) {
    const tiles = ownedResourceTiles(state, faction.id);
    if (tiles.length > 0) {
      const tileYield = ownedTileYieldPerMin(state, faction.id);
      const tileRow = el('div', 'rateRow tileYieldRow');
      RESOURCE_TYPES.forEach((r) => {
        if (tileYield[r] > 0) tileRow.appendChild(el('span', 'rateItem tileYieldItem', RESOURCE_ICONS[r] + ' +' + tileYield[r] + '/分（產地）'));
      });
      summary.appendChild(tileRow);
      summary.appendChild(el('div', 'subHint', '已佔領 ' + tiles.length + ' 個產地，持續固定產出中（不需駐守）。'));
    }
  }

  const popRow = el('div', 'popRow', '統率上限：' + factionPopUsed(faction) + ' / ' + eff.popCap);
  summary.appendChild(popRow);
  container.appendChild(summary);

  if (typeof renderEventsPanel === 'function') renderEventsPanel(container, faction);
  if (typeof renderResearchPanel === 'function') renderResearchPanel(container, faction);

  if (faction.activeBuildUpgrade) {
    const b = faction.activeBuildUpgrade;
    const box = el('div', 'panel buildingInProgress');
    box.appendChild(el('div', 'panelTitle', '施工中：' + buildingDef(b.buildingType).name + ' → ' + b.targetLevel + ' 級'));
    const remain = Math.max(0, b.completeAt - nowMs());
    box.appendChild(el('div', 'timerText', formatDuration(remain)));
    container.appendChild(box);
  }

  const list = el('div', 'buildingList');
  BUILDING_ORDER.forEach((type) => {
    const def = buildingDef(type);
    const lvl = faction.buildings[type].level;
    const card = el('div', 'buildingCard');
    const head = el('div', 'buildingHead');
    head.appendChild(el('span', 'buildingIcon', def.icon));
    head.appendChild(el('span', 'buildingName', def.name));
    head.appendChild(el('span', 'buildingLevel', lvl > 0 ? 'Lv.' + lvl : '未建造'));
    card.appendChild(head);
    card.appendChild(el('div', 'buildingDesc', def.desc));

    const check = canStartUpgrade(faction, type);
    const btn = el('button', 'upgradeBtn' + (check.ok ? '' : ' disabled'));
    if (check.ok) {
      btn.textContent = (lvl === 0 ? '建造' : '升級至 ' + check.info.targetLevel + ' 級') + '（' + formatDurationShort(check.info.timeMs) + '）';
      onTap(btn, () => {
        const r = startUpgrade(faction, type);
        if (r.ok) { toast(def.name + (lvl === 0 ? ' 建造開始' : ' 升級開始')); renderCityScreen(container, faction); refreshTopBar(); }
        else toast(r.reason);
      });
    } else {
      btn.textContent = check.reason;
    }
    card.appendChild(btn);

    if (check.ok || (!check.ok && nextUpgradeInfo(faction, type))) {
      const info = check.ok ? check.info : nextUpgradeInfo(faction, type);
      if (info) {
        const costLine = el('div', 'costLine');
        Object.keys(info.cost).forEach((r) => {
          const have = faction.resources[r] >= info.cost[r];
          costLine.appendChild(el('span', 'costItem' + (have ? '' : ' costShort'), RESOURCE_ICONS[r] + info.cost[r]));
        });
        card.appendChild(costLine);
      }
    }
    list.appendChild(card);
  });
  container.appendChild(list);

  if (typeof renderAchievementsPanel === 'function') renderAchievementsPanel(container, faction);
}
