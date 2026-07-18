/* ============================================================================
 * offlineSystem.js — 離線進度結算（企劃書第 5 節精確公式）。
 * ==========================================================================*/
(function () {
  const D = window.App.Data;
  const B = D.BALANCE;
  const Econ = window.App.Systems.Economy;
  const Descent = window.App.Systems.Descent;

  /**
   * @param {SaveGame} save
   * @param {number} now 絕對時戳（ms）。
   * @returns {?{elapsedMs:number, glowGained:number, depthGained:number, missedCount:number}}
   *   離線時間太短（&lt; OFFLINE_MIN_SECONDS）時回傳 null，且不彈報告。
   */
  function settle(save, now) {
    const elapsedMs = now - save.lastActiveAt;
    const elapsedSec = elapsedMs / 1000;
    if (elapsedSec < B.OFFLINE_MIN_SECONDS) { save.lastActiveAt = now; return null; }

    const eff = Econ.computeEffects(save);
    const absCapSec = B.OFFLINE_ABSOLUTE_CAP_HOURS * 3600;
    const cappedSec = Math.min(elapsedSec, absCapSec);
    const fullSec = eff.offlineFullHours * 3600;
    const halfSec = eff.offlineHalfHours * 3600;
    const fullPart = Math.min(cappedSec, fullSec);
    const halfPart = Math.min(Math.max(cappedSec - fullSec, 0), halfSec);
    const effectiveSec = fullPart + 0.5 * halfPart;

    const gps = Econ.glowPerSec(save);
    const glowGained = Math.max(0, gps * effectiveSec * eff.offlineMult);
    save.glow += glowGained;
    save.stats.totalGlowEarned += glowGained;

    const depthBefore = save.depth;
    // 深度用實際經過秒數（非折算後的 effectiveSec）推進，反正 Descent.advance 本來就會夾在
    // 海域錨點深度以內，離線再久也不會超額推進，不需要额外套用 48h 上限。
    Descent.advance(save, Math.max(0, elapsedSec));
    const depthGained = save.depth - depthBefore;

    const room = B.CREATURE_MISSED_QUEUE_CAP - save.pendingCreatures;
    const missedCount = Math.max(0, Math.min(room, Math.floor((cappedSec * 1000) / B.CREATURE_MISSED_INTERVAL_MS)));
    save.pendingCreatures += missedCount;

    save.lastActiveAt = now;

    return { elapsedMs, glowGained, depthGained, missedCount };
  }

  window.App.Systems.Offline = { settle };
})();
