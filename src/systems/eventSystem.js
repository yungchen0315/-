/* ============================================================================
 * eventSystem.js — 【骨架，尚未實作】
 *
 * 規劃職責：
 *   - tick(playerState, now)：依 PlayerState.nextEventAt 決定是否要生成新的
 *     PendingEventState（上限筆數、機率由此處定義），並對到期的事件依
 *     EventTypeDef.resourceRanges 擲骰結算，離線期間也要能安全地成批追趕
 *     （設定迴圈上限，避免長時間離線造成效能問題）。
 *   - claimEventNow(playerState, eventId)：玩家主動提前處理事件，結算方式
 *     與到期自動結算相同。
 *
 * 對應舊版 js/events.js。
 * ==========================================================================*/

(function () {
  window.Game.Systems.Event = {
    // tick(playerState, now) { ... }
    // claimEventNow(playerState, eventId) { ... }
  };
})();
