/* ============================================================================
 * dialog.js — 觸控友善的 Toast 提示與自訂確認對話框，取代 window.confirm
 * （部分行動裝置 WebView 環境中原生對話框顯示不穩定）。對應舊版 js/dialog.js + toast。
 * ==========================================================================*/

(function () {
  const U = window.Game.Utils;

  function toast(message, ms) {
    const box = document.getElementById('toastBox');
    if (!box) return;
    const t = U.el('div', 'toast', message);
    box.appendChild(t);
    setTimeout(() => { t.classList.add('toastOut'); }, (ms || 1800) - 250);
    setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, ms || 1800);
  }

  /**
   * @param {string} message
   * @param {string} [okLabel]
   * @param {string} [cancelLabel]
   * @returns {Promise<boolean>}
   */
  function showConfirm(message, okLabel, cancelLabel) {
    return new Promise((resolve) => {
      const overlay = U.el('div', 'confirmOverlay');
      const box = U.el('div', 'confirmBox');
      box.appendChild(U.el('div', 'confirmMessage', message));
      const btnRow = U.el('div', 'confirmBtnRow');
      const cancelBtn = U.el('button', 'setupBtn confirmCancelBtn', cancelLabel || '取消');
      const okBtn = U.el('button', 'setupBtn confirmOkBtn', okLabel || '確定');
      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(okBtn);
      box.appendChild(btnRow);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      function close(result) {
        document.body.removeChild(overlay);
        resolve(result);
      }
      U.onTap(cancelBtn, () => close(false));
      U.onTap(okBtn, () => close(true));
    });
  }

  window.Game.UI.Dialog = { toast, showConfirm };
})();
