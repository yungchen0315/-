/* ============================================================================
 * modals.js — 全螢幕彈窗：潛航報告（離線回訪）、新發現卡片（首次記錄生物）。
 * v1 只有這兩種模態層，其餘一律用 toast。
 * ==========================================================================*/
(function () {
  const U = window.App.Utils;
  const PR = window.App.UI.PixelRenderer;

  function showModal(buildContent) {
    const overlay = document.getElementById('modalOverlay');
    U.clearNode(overlay);
    const box = U.el('div', 'modalBox');
    function close() { overlay.style.display = 'none'; U.clearNode(overlay); }
    buildContent(box, close);
    overlay.appendChild(box);
    overlay.style.display = 'flex';
    return close;
  }

  function showOfflineReport(report, onClose) {
    showModal((box, close) => {
      box.appendChild(U.el('div', 'modalTitle', '潛航報告'));
      box.appendChild(U.el('div', 'modalLine', '離線時間：' + U.formatDurationWords(report.elapsedMs)));
      box.appendChild(U.el('div', 'modalLine', '獲得螢光：+' + U.formatNum(report.glowGained)));
      box.appendChild(U.el('div', 'modalLine', '下潛深度：+' + Math.round(report.depthGained) + ' 公尺'));
      if (report.missedCount > 0) {
        box.appendChild(U.el('div', 'modalLine modalHighlight', '有 ' + report.missedCount + ' 隻生物趁你不在時游過，回潛航畫面點擊領取'));
      }
      const btn = U.el('button', 'modalBtn', '知道了');
      U.onTap(btn, () => { close(); if (onClose) onClose(); });
      box.appendChild(btn);
    });
  }

  function showDiscoveryCard(creatureDef, onClose) {
    showModal((box, close) => {
      box.appendChild(U.el('div', 'modalTitle', '新發現！'));
      const iconWrap = U.el('div', 'discoveryIconWrap');
      iconWrap.appendChild(PR.spriteCanvasEl(creatureDef.icon, 6));
      box.appendChild(iconWrap);
      box.appendChild(U.el('div', 'modalLine discoveryName', creatureDef.name + (creatureDef.rare ? '　★稀有' : '')));
      box.appendChild(U.el('div', 'modalLine', '已記錄進深淵圖鑑，永久 +2% 全螢光產量'));
      const btn = U.el('button', 'modalBtn', '太好了');
      U.onTap(btn, () => { close(); if (onClose) onClose(); });
      box.appendChild(btn);
    });
  }

  window.App.UI.Modals = { showModal, showOfflineReport, showDiscoveryCard };
})();
