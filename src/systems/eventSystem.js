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

  function tradeOptionAffordable(playerState, opt) {
    return Object.keys(opt.give).every((r) => (playerState.resources[r] || 0) >= opt.give[r]);
  }

  function applyEventOutcome(playerState, event) {
    const eventType = D.eventTypeDefById(event.eventTypeDefId);
    if (!eventType) return null;
    const eff = window.Game.Systems.Economy.computeEffects(playerState);
    const delta = {};
    Object.keys(eventType.resourceRanges || {}).forEach((r) => {
      const [min, max] = eventType.resourceRanges[r];
      const amount = min <= max ? U.randomInt(min, max) : U.randomInt(max, min);
      delta[r] = amount;
      playerState.resources[r] = U.clamp(playerState.resources[r] + amount, 0, eff.storageCap[r]);
    });
    if (eventType.ingotRange) {
      const [min, max] = eventType.ingotRange;
      const amount = U.randomInt(min, max);
      delta.ingot = amount;
      playerState.resources.ingot = (playerState.resources.ingot || 0) + amount;
    }
    if (eventType.itemPool && eventType.itemPool.length) {
      const itemId = U.choice(eventType.itemPool);
      window.Game.Systems.Hero.grantItem(playerState, itemId, 1);
      delta.item = itemId;
    }
    if (eventType.tradeOptions && eventType.tradeOptions.length) {
      const affordable = eventType.tradeOptions.filter((o) => tradeOptionAffordable(playerState, o));
      if (affordable.length) {
        const opt = U.choice(affordable);
        Object.keys(opt.give).forEach((r) => { playerState.resources[r] -= opt.give[r]; });
        Object.keys(opt.get).forEach((r) => { playerState.resources[r] = U.clamp((playerState.resources[r] || 0) + opt.get[r], 0, eff.storageCap[r]); });
        delta.trade = opt;
      }
    }
    return { eventType, delta };
  }

  /**
   * 玩家親自選定某個交易方案（目前僅「商隊經過」事件會有 tradeOptions）。
   * @param {PlayerState} playerState
   * @param {string} eventId
   * @param {number} optionIndex
   */
  function resolveTrade(playerState, eventId, optionIndex) {
    const idx = playerState.pendingEvents.findIndex((e) => e.id === eventId);
    if (idx < 0) return { ok: false, reason: '事件不存在' };
    const event = playerState.pendingEvents[idx];
    const eventType = D.eventTypeDefById(event.eventTypeDefId);
    const opt = eventType && eventType.tradeOptions && eventType.tradeOptions[optionIndex];
    if (!opt) return { ok: false, reason: '無此交易選項' };
    if (!tradeOptionAffordable(playerState, opt)) return { ok: false, reason: '資源不足，無法交易' };
    const eff = window.Game.Systems.Economy.computeEffects(playerState);
    Object.keys(opt.give).forEach((r) => { playerState.resources[r] -= opt.give[r]; });
    Object.keys(opt.get).forEach((r) => { playerState.resources[r] = U.clamp((playerState.resources[r] || 0) + opt.get[r], 0, eff.storageCap[r]); });
    playerState.pendingEvents.splice(idx, 1);
    return { ok: true, eventType, give: opt.give, get: opt.get };
  }

  /** 把 applyEventOutcome／resolveTrade 的結果轉成人類可讀的一句話，供 UI 顯示。 */
  function describeOutcome(outcome) {
    if (!outcome) return '事件已處理';
    const parts = [];
    const delta = outcome.delta || outcome;
    if (outcome.give && outcome.get) {
      parts.push('支付 ' + describeAmounts(outcome.give) + '，換得 ' + describeAmounts(outcome.get));
    } else {
      if (delta.trade) parts.push('支付 ' + describeAmounts(delta.trade.give) + '，換得 ' + describeAmounts(delta.trade.get));
      if (delta.item) parts.push('獲得裝備「' + D.itemDefById(delta.item).name + '」');
      D.RESOURCE_TYPES.forEach((r) => {
        if (delta[r]) parts.push((delta[r] > 0 ? '獲得' : '損失') + D.RESOURCE_NAMES[r] + ' ' + Math.abs(delta[r]));
      });
      if (delta.ingot) parts.push('獲得元寶 ' + delta.ingot);
    }
    return parts.length ? parts.join('，') : '事件已處理，但沒有可負擔的結果';
  }

  function describeAmounts(amounts) {
    return Object.keys(amounts).map((r) => D.RESOURCE_NAMES[r] + amounts[r]).join('、');
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

  window.Game.Systems.Event = { tick, claimEventNow, spawnRandomEvent, applyEventOutcome, resolveTrade, describeOutcome, describeAmounts, tradeOptionAffordable };
})();
