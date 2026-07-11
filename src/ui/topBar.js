/* ============================================================================
 * topBar.js — 頂部狀態列：資源與國力。對應舊版 js/ui.js 的 refreshTopBar()。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;

  /** @param {PlayerState} playerState */
  function refresh(playerState) {
    const eff = window.Game.Systems.Economy.computeEffects(playerState);
    D.RESOURCE_TYPES.forEach((r) => {
      const node = document.getElementById('topRes_' + r);
      if (node) node.textContent = D.RESOURCE_ICONS[r] + formatNum(playerState.resources[r]) + '/' + formatNum(eff.storageCap[r]);
    });
    const ingotNode = document.getElementById('topRes_ingot');
    if (ingotNode) ingotNode.textContent = '🧧' + formatNum(playerState.resources.ingot || 0);
    const powerNode = document.getElementById('topPower');
    if (powerNode) powerNode.textContent = '國力 ' + formatNum(window.Game.Systems.Economy.computePower(playerState));
  }

  function formatNum(n) {
    n = Math.floor(n);
    if (n >= 1000000) return (n / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
    if (n >= 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  window.Game.UI.TopBar = { refresh, formatNum };
})();
