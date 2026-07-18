/* ============================================================================
 * bottomNav.js — 底部 4 鍵導覽，切換分頁容器的可見狀態。
 * ==========================================================================*/
(function () {
  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function bindNav(onSwitch) {
    document.querySelectorAll('#bottomNav .navBtn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const screenId = btn.dataset.screen;
        document.querySelectorAll('.screen').forEach((s) => s.classList.remove('activeScreen'));
        const target = document.getElementById('screen' + capitalize(screenId));
        if (target) target.classList.add('activeScreen');
        document.querySelectorAll('#bottomNav .navBtn').forEach((b) => b.classList.toggle('navActive', b === btn));
        onSwitch(screenId);
      });
    });
  }

  window.App.UI.BottomNav = { bindNav };
})();
