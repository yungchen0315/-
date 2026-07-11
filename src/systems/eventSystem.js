/* ============================================================================
 * eventSystem.js — 隨機事件生成與結算。對應舊版 js/events.js。
 * 到期時自動以結算結果收尾，離線期間也能安全追趕（迴圈次數設有上限）。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;

  const SPAWN_INTERVAL_MS = 8 * 60000;
  const SPAWN_CHANCE = 0.5;
  const MAX_PENDING = 3;
  const CATCHUP_CAP = 500;

  function spawnRandomEvent(playerState, at) {
    const eventType = U.choice(D.EVENT_TYPE_DEFS);
    playerState.pendingEvents.push({ id: U.generateId('event'), eventTypeDefId: eventType.id, startAt: at, deadlineAt: at + eventType.resolveMs });
  }

  function applyEventOutcome(playerState, event) {
    const eventType = D.eventTypeDefById(event.eventTypeDefId);
    if (!eventType) return null;
    const eff = window.Game.Systems.Economy.computeEffects(playerState);
    const delta = {};
    Object.keys(eventType.resourceRanges).forEach((r) => {
      const [min, max] = eventType.resourceRanges[r];
      const amount = min <= max ? U.randomInt(min, max) : U.randomInt(max, min);
      delta[r] = amount;
      playerState.resources[r] = U.clamp(playerState.resources[r] + amount, 0, eff.storageCap[r]);
    });
    return { eventType, delta };
  }

  /** @param {PlayerState} playerState @param {number} now */
  function tick(playerState, now) {
    playerState.nextEventAt = playerState.nextEventAt || now + SPAWN_INTERVAL_MS;
    let iterations = 0;
    while (now >= playerState.nextEventAt && iterations < CATCHUP_CAP) {
      if (playerState.pendingEvents.length < MAX_PENDING && Math.random() < SPAWN_CHANCE) {
        spawnRandomEvent(playerState, playerState.nextEventAt);
      }
      playerState.nextEventAt += SPAWN_INTERVAL_MS;
      iterations++;
    }
    if (now >= playerState.nextEventAt) playerState.nextEventAt = now + SPAWN_INTERVAL_MS;

    const resolved = [];
    for (let i = playerState.pendingEvents.length - 1; i >= 0; i--) {
      const event = playerState.pendingEvents[i];
      if (now >= event.deadlineAt) {
        resolved.push(applyEventOutcome(playerState, event));
        playerState.pendingEvents.splice(i, 1);
      }
    }
    return resolved;
  }

  function claimEventNow(playerState, eventId) {
    const idx = playerState.pendingEvents.findIndex((e) => e.id === eventId);
    if (idx < 0) return { ok: false, reason: '事件不存在' };
    const outcome = applyEventOutcome(playerState, playerState.pendingEvents[idx]);
    playerState.pendingEvents.splice(idx, 1);
    return { ok: true, outcome };
  }

  window.Game.Systems.Event = { tick, claimEventNow, spawnRandomEvent, applyEventOutcome };
})();
