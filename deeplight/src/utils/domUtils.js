/* ============================================================================
 * domUtils.js — 建立元素、清空節點、觸控/點擊綁定的小工具。
 * ==========================================================================*/
(function () {
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function clearNode(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  /** 統一點擊/觸控綁定，避免同一元素被 click 與 touchend 重複觸發。 */
  function onTap(node, handler) {
    let touched = false;
    node.addEventListener('touchend', (e) => { touched = true; e.preventDefault(); handler(e); }, { passive: false });
    node.addEventListener('click', (e) => { if (touched) { touched = false; return; } handler(e); });
  }

  window.App.Utils.el = el;
  window.App.Utils.clearNode = clearNode;
  window.App.Utils.onTap = onTap;
})();
