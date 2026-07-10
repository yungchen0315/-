/* ============================================================================
 * research.js — 學院科技研究：佇列、解鎖條件、「城池」分頁中的科技面板。
 * ==========================================================================*/

const MAX_RESEARCH_QUEUE_LEN = 1;

function techUnlocked(faction, tech) {
  return tech.requires.every((r) => faction.researchedTechs.includes(r));
}

function techAvailableTier(faction) {
  const lvl = faction.buildings.academy.level;
  if (lvl <= 0) return 0;
  return buildingLevelDef('academy', lvl).effect.unlockTechTier || 1;
}

function availableTechs(faction) {
  const tier = techAvailableTier(faction);
  return TECHS.filter((t) => t.tier <= tier && !faction.researchedTechs.includes(t.id) && techUnlocked(faction, t));
}

function canQueueResearch(faction, techId) {
  if (faction.buildings.academy.level <= 0) return { ok: false, reason: '需先建造學院' };
  if (faction.researchQueue.length >= MAX_RESEARCH_QUEUE_LEN) return { ok: false, reason: '學院同時只能研究一項科技' };
  const tech = techById(techId);
  if (!tech) return { ok: false, reason: '未知科技' };
  if (faction.researchedTechs.includes(techId)) return { ok: false, reason: '已研究完成' };
  if (!techUnlocked(faction, tech)) return { ok: false, reason: '尚未滿足前置科技條件' };
  if (tech.tier > techAvailableTier(faction)) return { ok: false, reason: '學院等級不足' };
  if (!canAfford(faction.resources, tech.cost)) return { ok: false, reason: '資源不足' };
  return { ok: true, tech };
}

function queueResearch(faction, techId, now) {
  const check = canQueueResearch(faction, techId);
  if (!check.ok) return check;
  payCost(faction.resources, check.tech.cost);
  const eff = factionEffects(faction);
  const timeMs = Math.round(check.tech.timeMs / (eff.researchSpeedMul || 1));
  now = now || nowMs();
  faction.researchQueue.push({ techId, startAt: now, completeAt: now + timeMs });
  return { ok: true };
}

const TECH_CATEGORY_LABELS = { economy: '經濟', military: '軍事', city: '城防' };

function renderResearchPanel(container, faction) {
  if (faction.buildings.academy.level <= 0) return;
  const panel = el('div', 'panel');
  panel.appendChild(el('div', 'panelTitle', '學院科技研究'));

  if (faction.researchQueue.length > 0) {
    const item = faction.researchQueue[0];
    const row = el('div', 'queueRow');
    row.appendChild(el('span', '', '研究中：' + techById(item.techId).name));
    row.appendChild(el('span', 'timerText', formatDuration(Math.max(0, item.completeAt - nowMs()))));
    panel.appendChild(row);
  }

  const techs = availableTechs(faction);
  if (techs.length === 0) {
    panel.appendChild(el('div', 'emptyHint', faction.researchQueue.length > 0 ? '研究進行中。' : '暫無可研究的科技，請升級學院解鎖更高階科技。'));
  } else {
    techs.forEach((tech) => {
      const check = canQueueResearch(faction, tech.id);
      const row = el('div', 'techRow');
      row.appendChild(el('div', 'techName', '【' + TECH_CATEGORY_LABELS[tech.category] + '】' + tech.name));
      row.appendChild(el('div', 'techCost', Object.keys(tech.cost).map((r) => RESOURCE_ICONS[r] + tech.cost[r]).join(' ') + '　' + formatDurationShort(tech.timeMs)));
      const btn = el('button', 'smallBtn' + (check.ok ? '' : ' disabled'), check.ok ? '研究' : check.reason);
      if (check.ok) {
        onTap(btn, () => {
          const r = queueResearch(faction, tech.id);
          if (r.ok) { toast('開始研究：' + tech.name); renderCityScreen(container, faction); refreshTopBar(); }
          else toast(r.reason);
        });
      }
      row.appendChild(btn);
      panel.appendChild(row);
    });
  }

  if (faction.researchedTechs.length > 0) {
    const doneWrap = el('div', 'techDoneWrap');
    doneWrap.appendChild(el('span', 'subHint', '已完成：' + faction.researchedTechs.map((id) => techById(id).name).join('、')));
    panel.appendChild(doneWrap);
  }

  container.appendChild(panel);
}
