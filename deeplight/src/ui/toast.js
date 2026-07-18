/* ============================================================================
 * toast.js — 畫面底部短暫提示訊息（購買失敗原因、成就解鎖等）。
 * ==========================================================================*/
(function () {
  const U = window.App.Utils;

  function toast(message) {
    const box = document.getElementById('toastBox');
    if (!box) return;
    const node = U.el('div', 'toastMsg', message);
    box.appendChild(node);
    requestAnimationFrame(() => node.classList.add('toastShow'));
    setTimeout(() => {
      node.classList.remove('toastShow');
      setTimeout(() => node.remove(), 300);
    }, 2200);
  }

  window.App.UI.Toast = { toast };
})();
