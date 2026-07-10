/* ============================================================================
 * dialog.js — 觸控友善的自訂確認對話框（取代 window.confirm，避免在部分行動裝置
 * WebView 環境中原生 confirm 對話框顯示不穩定或被封鎖的問題）。
 * ==========================================================================*/

function showConfirm(message, okLabel, cancelLabel) {
  return new Promise((resolve) => {
    const overlay = el('div', 'confirmOverlay');
    const box = el('div', 'confirmBox');
    box.appendChild(el('div', 'confirmMessage', message));
    const btnRow = el('div', 'confirmBtnRow');
    const cancelBtn = el('button', 'setupBtn confirmCancelBtn', cancelLabel || '取消');
    const okBtn = el('button', 'setupBtn confirmOkBtn', okLabel || '確定');
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(okBtn);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function close(result) {
      document.body.removeChild(overlay);
      resolve(result);
    }
    onTap(cancelBtn, () => close(false));
    onTap(okBtn, () => close(true));
  });
}
