/* ============================================================================
 * surfaceScreen.js — 「海面」分頁：重返海面（轉生）、重構升級、成就、設定。
 * ==========================================================================*/
(function () {
  const U = window.App.Utils;
  const D = window.App.Data;
  const Prestige = window.App.Systems.Prestige;
  const Save = window.App.Systems.Save;
  const Toast = window.App.UI.Toast;

  function render(container, save, onChange) {
    U.clearNode(container);

    const prestigePanel = U.el('div', 'panel');
    prestigePanel.appendChild(U.el('div', 'panelTitle', '重返海面'));
    prestigePanel.appendChild(U.el('div', 'subHint', '本輪最大深度：' + Math.floor(save.maxDepthThisRun) + ' m'));
    const preview = Prestige.previewCores(save);
    prestigePanel.appendChild(U.el('div', 'subHint', '可獲得壓力核心：' + preview));
    const eligible = Prestige.eligible(save);
    const btn = U.el('button', 'prestigeBtn' + (eligible ? '' : ' disabled'), '重返海面');
    U.onTap(btn, () => {
      const r = Prestige.resurface(save);
      if (r.ok) { Toast.toast('重返海面！獲得 ' + r.gained + ' 顆壓力核心'); onChange(); }
      else Toast.toast(r.reason);
    });
    prestigePanel.appendChild(btn);
    if (!eligible) prestigePanel.appendChild(U.el('div', 'lockedHint', '需下潛至 ' + D.BALANCE.PRESTIGE_MIN_DEPTH + ' 公尺才能轉生'));
    container.appendChild(prestigePanel);

    const refitPanel = U.el('div', 'panel');
    refitPanel.appendChild(U.el('div', 'panelTitle', '重構升級（壓力核心 ' + save.cores + '）'));
    D.REFIT_DEFS.forEach((def) => {
      const owned = save.refits.includes(def.id);
      const row = U.el('div', 'refitRow' + (owned ? ' refitOwned' : ''));
      row.appendChild(U.el('span', 'refitName', (owned ? '✔ ' : '') + def.name));
      row.appendChild(U.el('span', 'refitDesc', def.desc));
      if (!owned) {
        const canAfford = save.cores >= def.cost;
        const buyBtn = U.el('button', 'smallBtn' + (canAfford ? '' : ' disabled'), def.cost + ' 核心');
        U.onTap(buyBtn, () => {
          if (save.cores < def.cost) { Toast.toast('壓力核心不足'); return; }
          save.cores -= def.cost;
          save.refits.push(def.id);
          onChange();
        });
        row.appendChild(buyBtn);
      }
      refitPanel.appendChild(row);
    });
    container.appendChild(refitPanel);

    const achPanel = U.el('div', 'panel');
    achPanel.appendChild(U.el('div', 'panelTitle', '成就（' + save.achievements.length + ' / ' + D.ACHIEVEMENT_DEFS.length + '）　珍珠 ' + save.pearls));
    D.ACHIEVEMENT_DEFS.forEach((a) => {
      const done = save.achievements.includes(a.id);
      const row = U.el('div', 'achRow' + (done ? ' achDone' : ''));
      row.appendChild(U.el('span', '', (done ? '✔ ' : '☐ ') + a.name));
      row.appendChild(U.el('span', 'achDesc', a.desc));
      achPanel.appendChild(row);
    });
    container.appendChild(achPanel);

    const settingsPanel = U.el('div', 'panel');
    settingsPanel.appendChild(U.el('div', 'panelTitle', '設定'));
    const resetBtn = U.el('button', 'smallBtn dangerBtn', '重置存檔');
    U.onTap(resetBtn, () => {
      if (window.confirm('確定要重置存檔嗎？此動作無法復原。')) {
        Save.reset();
        location.reload();
      }
    });
    settingsPanel.appendChild(resetBtn);
    settingsPanel.appendChild(U.el('div', 'subHint', '《潛燈》DEEPLIGHT v1.0'));
    container.appendChild(settingsPanel);
  }

  window.App.UI.SurfaceScreen = { render };
})();
