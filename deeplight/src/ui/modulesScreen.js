/* ============================================================================
 * modulesScreen.js — 「模組」分頁：壓載升級 + 6 種發光模組購買／升級列表。
 * ==========================================================================*/
(function () {
  const U = window.App.Utils;
  const D = window.App.Data;
  const PR = window.App.UI.PixelRenderer;
  const Econ = window.App.Systems.Economy;
  const Toast = window.App.UI.Toast;

  function render(container, save, onChange) {
    U.clearNode(container);

    const ballastPanel = U.el('div', 'panel');
    ballastPanel.appendChild(U.el('div', 'panelTitle', '壓載系統'));
    const rate = Econ.descentRate(save);
    const row = U.el('div', 'ballastRow');
    row.appendChild(U.el('span', '', '下潛速度：' + rate.toFixed(1) + ' m/min（Lv.' + save.ballastLevel + '/' + D.BALANCE.BALLAST_MAX_LEVEL + '）'));
    const ballastCost = Econ.ballastCost(save);
    if (ballastCost !== null) {
      const btn = U.el('button', 'smallBtn' + (save.glow < ballastCost ? ' disabled' : ''), '升級 · ' + U.formatNum(ballastCost));
      U.onTap(btn, () => {
        const r = Econ.buyBallast(save);
        if (r.ok) onChange(); else Toast.toast(r.reason);
      });
      row.appendChild(btn);
    } else {
      row.appendChild(U.el('span', 'maxedHint', '已達最高等級'));
    }
    ballastPanel.appendChild(row);
    container.appendChild(ballastPanel);

    const listPanel = U.el('div', 'panel');
    listPanel.appendChild(U.el('div', 'panelTitle', '發光模組'));
    const eff = Econ.computeEffects(save);
    D.MODULE_DEFS.forEach((def) => {
      const state = save.modules[def.id] || { count: 0, upgradeTier: 0 };
      const locked = save.depth < def.unlockDepth && state.count === 0;
      if (locked) {
        listPanel.appendChild(U.el('div', 'moduleLockedHint', '深度達 ' + def.unlockDepth + 'm 解鎖：' + def.name));
        return;
      }

      const row = U.el('div', 'moduleRow');
      row.appendChild(PR.spriteCanvasEl(def.icon, 2));
      const info = U.el('div', 'moduleInfo');
      info.appendChild(U.el('div', 'moduleName', def.name + '（持有 ' + state.count + '）'));
      const unitProd = Econ.moduleUnitProd(save, eff, def.id);
      info.appendChild(U.el('div', 'moduleSub', '單體 ' + U.formatRate(unitProd) + '/s'));
      row.appendChild(info);

      const cost = Econ.moduleCost(save, def.id);
      const buyBtn = U.el('button', 'smallBtn' + (save.glow < cost ? ' disabled' : ''), '購買 · ' + U.formatNum(cost));
      U.onTap(buyBtn, () => {
        const r = Econ.buyModule(save, def.id);
        if (r.ok) onChange(); else Toast.toast(r.reason);
      });
      row.appendChild(buyBtn);
      listPanel.appendChild(row);

      const upgradeInfo = Econ.moduleUpgradeInfo(save, def.id);
      if (upgradeInfo && upgradeInfo.unlocked) {
        const upRow = U.el('div', 'moduleUpgradeRow');
        upRow.appendChild(U.el('span', '', '升級 ×2 產量（' + (upgradeInfo.tier + 1) + '/' + D.BALANCE.MODULE_UPGRADE_THRESHOLDS.length + '）'));
        const upBtn = U.el('button', 'smallBtn' + (save.glow < upgradeInfo.cost ? ' disabled' : ''), U.formatNum(upgradeInfo.cost));
        U.onTap(upBtn, () => {
          const r = Econ.buyModuleUpgrade(save, def.id);
          if (r.ok) onChange(); else Toast.toast(r.reason);
        });
        upRow.appendChild(upBtn);
        listPanel.appendChild(upRow);
      } else if (upgradeInfo && !upgradeInfo.unlocked) {
        listPanel.appendChild(U.el('div', 'moduleUpgradeHint', '持有 ' + upgradeInfo.threshold + ' 個解鎖下一階升級'));
      }
    });
    container.appendChild(listPanel);
  }

  window.App.UI.ModulesScreen = { render };
})();
