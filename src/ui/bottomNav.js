/* ============================================================================
 * bottomNav.js — 底部分頁導覽。對應舊版 js/ui.js 的 initBottomNav()。
 * ==========================================================================*/

(function () {
  const U = window.Game.Utils;

  function init(onSwitchScreen) {
    document.querySelectorAll('#bottomNav .navBtn').forEach((btn) => {
      U.onTap(btn, () => onSwitchScreen(btn.dataset.screen));
    });
  }

  function setActive(screenId) {
    document.querySelectorAll('#bottomNav .navBtn').forEach((btn) => {
      btn.classList.toggle('navActive', btn.dataset.screen === screenId);
    });
  }

  window.Game.UI.BottomNav = { init, setActive };
})();
