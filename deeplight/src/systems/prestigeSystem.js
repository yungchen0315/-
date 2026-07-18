/* ============================================================================
 * prestigeSystem.js — 「重返海面」轉生：本輪最大深度換算壓力核心，重置本輪
 * 進度（GL／SP／模組／壓載／研究／深度），保留核心／重構／圖鑑／成就／珍珠。
 * ==========================================================================*/
(function () {
  const D = window.App.Data;
  const B = D.BALANCE;
  const Econ = window.App.Systems.Economy;

  function eligible(save) { return save.maxDepthThisRun >= B.PRESTIGE_MIN_DEPTH; }

  /** floor((本輪最大深度 / 400)^1.15)：企劃書第 6 節公式。 */
  function previewCores(save) {
    if (save.maxDepthThisRun <= 0) return 0;
    return Math.floor(Math.pow(save.maxDepthThisRun / B.PRESTIGE_DEPTH_DIVISOR, B.PRESTIGE_EXPONENT));
  }

  function resurface(save) {
    if (!eligible(save)) return { ok: false, reason: '尚未下潛至 ' + B.PRESTIGE_MIN_DEPTH + ' 公尺，無法重返海面' };
    const gained = previewCores(save);

    save.cores += gained;
    save.stats.totalCoresEarned += gained;
    save.prestigeCount += 1;

    // 本輪進度歸零。
    save.glow = 0;
    save.samples = 0;
    save.depth = 0;
    save.maxDepthThisRun = 0;
    save.currentZone = 0;
    save.modules = {};
    save.ballastLevel = 0;
    save.research = [];

    // 重構（refits）永久保留，重新套用其中「開局附贈」類效果（例如種苗庫的起始水母）。
    const eff = Econ.computeEffects(save);
    Object.keys(eff.startModules).forEach((moduleId) => {
      save.modules[moduleId] = { count: eff.startModules[moduleId], upgradeTier: 0 };
    });

    return { ok: true, gained };
  }

  window.App.Systems.Prestige = { eligible, previewCores, resurface };
})();
