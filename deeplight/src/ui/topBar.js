/* ============================================================================
 * topBar.js — 頂欄常駐狀態：螢光總量/秒、深度、樣本。
 * ==========================================================================*/
(function () {
  const U = window.App.Utils;
  const Econ = window.App.Systems.Economy;

  function refresh(save) {
    const gps = Econ.glowPerSec(save);
    document.getElementById('topGlow').textContent = U.formatNum(save.glow);
    document.getElementById('topGlowRate').textContent = U.formatRate(gps) + '/s';
    document.getElementById('topDepth').textContent = Math.floor(save.depth) + ' m';
    document.getElementById('topSamples').textContent = save.samples;
  }

  window.App.UI.TopBar = { refresh };
})();
