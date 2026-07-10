/* ============================================================================
 * domUtils.js — 通用 DOM／觸控小工具。不包含任何遊戲規則或畫面配置，
 * 純粹是 src/ui 各畫面共用的建構元件，方便日後畫面實作時重複使用。
 * ==========================================================================*/

(function () {
  /**
   * 建立一個 DOM 元素。
   * @param {string} tag
   * @param {string} [className]
   * @param {string} [html] 若提供則設為 innerHTML。
   * @returns {HTMLElement}
   */
  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  /** 清空一個節點底下所有子節點。 */
  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  /**
   * 綑綁觸控 tap 事件：優先使用 touchend（並阻止其合成出的 click），
   * 同時保留 click 作為備援（部分引擎不會可靠地從觸控合成出 click）。
   * @param {HTMLElement} target
   * @param {(e: Event) => void} handler
   */
  function onTap(target, handler) {
    if (!target) return;
    let lastTouchAt = 0;
    target.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      lastTouchAt = Date.now();
      handler(e);
    }, { passive: false });
    target.addEventListener('click', (e) => {
      if (Date.now() - lastTouchAt < 700) return;
      handler(e);
    });
  }

  window.Game.Utils.el = el;
  window.Game.Utils.clearNode = clearNode;
  window.Game.Utils.onTap = onTap;
})();
