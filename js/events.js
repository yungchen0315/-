/* ============================================================================
 * events.js — 隨機事件（取代伺服器活動）。事件會在到期時間自動解決，
 * 離線期間也能安全追趕，不需要玩家在線互動才會生效。
 * ==========================================================================*/

const EVENT_SPAWN_INTERVAL_MS = 8 * 60000;
const EVENT_SPAWN_CHANCE = 0.5;
const EVENT_MAX_PENDING = 3;
const EVENT_CATCHUP_CAP = 500;

function tickFactionEvents(faction, now) {
  faction.pendingEvents = faction.pendingEvents || [];
  faction.nextEventAt = faction.nextEventAt || now + EVENT_SPAWN_INTERVAL_MS;

  let iterations = 0;
  while (now >= faction.nextEventAt && iterations < EVENT_CATCHUP_CAP) {
    if (faction.pendingEvents.length < EVENT_MAX_PENDING && Math.random() < EVENT_SPAWN_CHANCE) {
      spawnRandomEvent(faction, faction.nextEventAt);
    }
    faction.nextEventAt += EVENT_SPAWN_INTERVAL_MS;
    iterations++;
  }
  if (now >= faction.nextEventAt) faction.nextEventAt = now + EVENT_SPAWN_INTERVAL_MS;

  for (let i = faction.pendingEvents.length - 1; i >= 0; i--) {
    const ev = faction.pendingEvents[i];
    if (now >= ev.deadlineAt) {
      applyEventOutcome(faction, ev);
      faction.pendingEvents.splice(i, 1);
    }
  }
}

function spawnRandomEvent(faction, at) {
  const type = choice(EVENT_TYPES);
  faction.pendingEvents.push({
    id: uid('event'), typeId: type.id, startAt: at, deadlineAt: at + type.resolveMs
  });
}

function applyEventOutcome(faction, ev) {
  const type = eventTypeById(ev.typeId);
  if (!type) return;
  const outcome = type.resolve(faction);
  const eff = factionEffects(faction);
  if (outcome.resources) {
    Object.keys(outcome.resources).forEach((r) => {
      faction.resources[r] = clamp(faction.resources[r] + outcome.resources[r], 0, eff.storageCap[r]);
    });
  }
  if (faction.isPlayer && window.__pushToast) {
    const desc = Object.keys(outcome.resources || {}).map((r) => (outcome.resources[r] >= 0 ? '+' : '') + outcome.resources[r] + RESOURCE_NAMES[r]).join('　');
    window.__pushToast('事件「' + type.name + '」：' + desc);
  }
}

function claimEventNow(faction, eventId) {
  const idx = faction.pendingEvents.findIndex((e) => e.id === eventId);
  if (idx < 0) return { ok: false, reason: '事件不存在' };
  applyEventOutcome(faction, faction.pendingEvents[idx]);
  faction.pendingEvents.splice(idx, 1);
  return { ok: true };
}

/* ---------------------------------------------------------------------- */
/* 畫面渲染（嵌入城池分頁）                                                  */
/* ---------------------------------------------------------------------- */
function renderEventsPanel(container, faction) {
  const panel = el('div', 'panel');
  panel.appendChild(el('div', 'panelTitle', '城中事件'));
  faction.pendingEvents = faction.pendingEvents || [];
  if (faction.pendingEvents.length === 0) {
    panel.appendChild(el('div', 'emptyHint', '目前沒有事件，過一段時間再來看看。'));
  } else {
    faction.pendingEvents.forEach((ev) => {
      const type = eventTypeById(ev.typeId);
      const row = el('div', 'eventRow');
      row.appendChild(el('div', 'eventName', type.name));
      row.appendChild(el('div', 'eventFlavor', type.flavor));
      row.appendChild(el('div', 'timerText', '剩餘 ' + formatDuration(Math.max(0, ev.deadlineAt - nowMs()))));
      const btn = el('button', 'smallBtn', '立即處理');
      onTap(btn, () => {
        claimEventNow(faction, ev.id);
        toast('事件已處理');
        renderCityScreen(document.getElementById('screenCity'), faction);
        refreshTopBar();
      });
      row.appendChild(btn);
      panel.appendChild(row);
    });
  }
  container.appendChild(panel);
}
