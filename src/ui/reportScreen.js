/* ============================================================================
 * reportScreen.js — 「戰報」分頁：戰鬥紀錄列表。
 * ==========================================================================*/

(function () {
  const U = window.Game.Utils;

  function render(container, playerState) {
    U.clearNode(container);
    const panel = U.el('div', 'panel');
    panel.appendChild(U.el('div', 'panelTitle', '戰報記錄'));
    playerState.battleLog.slice(0, 40).forEach((r) => {
      const row = U.el('div', 'reportRow ' + (r.outcome === 'win' ? 'reportWin' : r.outcome === 'lose' ? 'reportLose' : 'reportNeutral'));
      row.appendChild(U.el('div', 'reportText', r.text));
      row.appendChild(U.el('div', 'reportTime', new Date(r.time).toLocaleTimeString()));
      panel.appendChild(row);
    });
    if (playerState.battleLog.length === 0) panel.appendChild(U.el('div', 'emptyHint', '尚無戰報記錄。'));
    container.appendChild(panel);
  }

  window.Game.UI.ReportScreen = { render };
})();
