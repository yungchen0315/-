/* ============================================================================
 * descentSystem.js — 深度隨時間推進、抵達錨點後停住等待玩家付費通過。
 * ==========================================================================*/
(function () {
  const D = window.App.Data;
  const Econ = window.App.Systems.Economy;

  /** 依經過的秒數推進深度，夾在目前海域的錨點深度以內（含離線追趕時呼叫）。 */
  function advance(save, dtSeconds) {
    const zone = D.zoneById(save.currentZone) || D.ZONE_DEFS[0];
    const rate = Econ.descentRate(save); // m/min
    const gained = (rate / 60) * dtSeconds;
    save.depth = Math.min(save.depth + gained, zone.anchorDepth);
    if (save.depth > save.maxDepthThisRun) save.maxDepthThisRun = save.depth;
    if (save.depth > save.maxDepthEver) save.maxDepthEver = save.depth;
  }

  function atGate(save) {
    const zone = D.zoneById(save.currentZone) || D.ZONE_DEFS[0];
    return !zone.comingSoon && save.depth >= zone.anchorDepth;
  }

  function nextZone(save) {
    return D.zoneById(save.currentZone + 1);
  }

  /** 支付通過目前錨點，進入下一海域；成功時附帶 3 SP 獎勵（企劃書第 4a 節）。 */
  function passGate(save) {
    const zone = D.zoneById(save.currentZone) || D.ZONE_DEFS[0];
    if (zone.comingSoon) return { ok: false, reason: '此海域尚未開放' };
    if (save.depth < zone.anchorDepth) return { ok: false, reason: '尚未抵達錨點' };
    if (save.glow < zone.gateCost) return { ok: false, reason: '螢光不足' };
    const next = nextZone(save);
    if (!next) return { ok: false, reason: '已達目前版本最深處' };
    save.glow -= zone.gateCost;
    save.currentZone += 1;
    save.samples = (save.samples || 0) + 3;
    return { ok: true, zone: next };
  }

  window.App.Systems.Descent = { advance, atGate, nextZone, passGate };
})();
