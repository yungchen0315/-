/* ============================================================================
 * bootstrap.js — 進入點：讀檔／建立新存檔、離線結算、掛上畫面與導覽、
 * 啟動主迴圈（實測 dt tick + 定期自動存檔）。必須最後載入。
 * ==========================================================================*/
(function () {
  const Save = window.App.Systems.Save;
  const Models = window.App.Models;
  const GameLoop = window.App.Systems.GameLoop;
  const Offline = window.App.Systems.Offline;
  const Modals = window.App.UI.Modals;
  const TopBar = window.App.UI.TopBar;
  const BottomNav = window.App.UI.BottomNav;
  const DiveScreen = window.App.UI.DiveScreen;
  const ModulesScreen = window.App.UI.ModulesScreen;
  const ResearchScreen = window.App.UI.ResearchScreen;
  const SurfaceScreen = window.App.UI.SurfaceScreen;
  const B = window.App.Data.BALANCE;

  let save;
  let currentScreenId = 'dive';
  let lastTickAt;
  let lastSaveAt;

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function renderScreen(screenId) {
    const container = document.getElementById('screen' + capitalize(screenId));
    if (!container) return;
    if (screenId === 'dive') {
      DiveScreen.render(container, save, () => TopBar.refresh(save));
    } else {
      const onChange = () => { TopBar.refresh(save); renderScreen(screenId); };
      if (screenId === 'modules') ModulesScreen.render(container, save, onChange);
      else if (screenId === 'research') ResearchScreen.render(container, save, onChange);
      else if (screenId === 'surface') SurfaceScreen.render(container, save, onChange);
    }
  }

  function loopTick() {
    const now = Date.now();
    const dtMs = now - lastTickAt;
    lastTickAt = now;
    const result = GameLoop.tick(save, dtMs);
    TopBar.refresh(save);
    if (currentScreenId === 'dive') DiveScreen.tick(save);
    result.newAchievements.forEach((a) => window.App.UI.Toast.toast('成就解鎖：' + a.name + (a.pearl ? '　+' + a.pearl + ' 珍珠' : '')));
    if (now - lastSaveAt >= B.AUTOSAVE_INTERVAL_MS) { Save.save(save); lastSaveAt = now; }
  }

  function init() {
    const now = Date.now();
    save = Save.load();
    let offlineReport = null;
    if (!save) {
      save = Models.createDefaultSave(now);
    } else {
      offlineReport = Offline.settle(save, now);
    }
    lastTickAt = now;
    lastSaveAt = now;

    renderScreen(currentScreenId);
    TopBar.refresh(save);

    BottomNav.bindNav((screenId) => {
      if (currentScreenId === 'dive' && screenId !== 'dive') DiveScreen.deactivate();
      currentScreenId = screenId;
      renderScreen(screenId);
    });

    if (offlineReport) Modals.showOfflineReport(offlineReport);

    setInterval(loopTick, B.TICK_INTERVAL_MS);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        Save.save(save);
      } else {
        const n = Date.now();
        const report = Offline.settle(save, n);
        lastTickAt = n;
        if (report) {
          Modals.showOfflineReport(report);
          renderScreen(currentScreenId);
        }
      }
    });

    window.addEventListener('beforeunload', () => Save.save(save));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
