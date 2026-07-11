/* ============================================================================
 * bootstrap.js — App 進入點：新遊戲／繼續遊戲、主迴圈、自動存檔。
 * 對應舊版 js/game.js + js/ui.js 的畫面切換調度。
 * ==========================================================================*/

(function () {
  const U = window.Game.Utils;
  const Dlg = window.Game.UI.Dialog;

  const SCREENS = ['city', 'map', 'hero', 'army', 'mission', 'gacha', 'report'];

  let tickHandle = null;
  let saveHandle = null;

  function boot() {
    const saved = window.Game.Systems.Save.hasSave();
    const overlay = document.getElementById('setupOverlay');
    document.getElementById('continueBtn').style.display = saved ? '' : 'none';
    if (!saved && window.Game.Systems.Save.hasLegacySave()) {
      document.getElementById('legacyNotice').style.display = '';
      window.Game.Systems.Save.deleteLegacySave();
    }
    overlay.classList.add('activeOverlay');

    U.onTap(document.getElementById('continueBtn'), () => { overlay.classList.remove('activeOverlay'); startWithSave(); });
    U.onTap(document.getElementById('newGameBtn'), async () => {
      if (saved) {
        const confirmed = await Dlg.showConfirm('已有存檔，開始新遊戲將會覆蓋現有進度，確定要繼續嗎？');
        if (!confirmed) return;
      }
      showFactionPicker();
    });
  }

  function showFactionPicker() {
    document.getElementById('setupStepMain').style.display = 'none';
    const panel = document.getElementById('setupStepFaction');
    panel.style.display = '';
    const list = document.getElementById('factionPickList');
    U.clearNode(list);
    window.Game.Data.FACTION_DEFS.forEach((f) => {
      const card = U.el('div', 'factionPickCard');
      card.style.borderColor = f.color;
      const name = U.el('div', 'factionPickName', f.name);
      name.style.color = f.color;
      card.appendChild(name);
      card.appendChild(U.el('div', 'factionPickDesc', f.desc));
      U.onTap(card, () => {
        document.getElementById('setupOverlay').classList.remove('activeOverlay');
        window.Game.Systems.Save.deleteSave();
        startFresh(f.id);
      });
      list.appendChild(card);
    });
  }

  function startWithSave() {
    const restored = window.Game.Systems.Save.loadFromLocalStorage();
    window.GameSave = restored || window.Game.Systems.NewGame.createNewGame();
    window.Game.Systems.GameLoop.advanceTime(window.GameSave, U.now());
    afterReady();
  }

  function startFresh(factionId) {
    window.GameSave = window.Game.Systems.NewGame.createNewGame(factionId);
    afterReady();
  }

  function afterReady() {
    window.Game.UI.BottomNav.init(switchScreen);
    window.Game.UI.MapScreen.init(document.getElementById('mapCanvas'));
    window.addEventListener('resize', () => { if (window.GameSave.activeScreenId === 'map') { window.Game.UI.MapScreen.resize(); window.Game.UI.MapScreen.draw(); } });
    switchScreen(window.GameSave.activeScreenId || 'city');
    window.Game.UI.TopBar.refresh(humanPlayer());
    startMainLoop();
    window.Game.Systems.Save.saveToLocalStorage(window.GameSave);
  }

  function humanPlayer() { return Object.values(window.GameSave.players).find((p) => p.isHuman); }

  function switchScreen(name) {
    if (SCREENS.indexOf(name) < 0) return;
    window.GameSave.activeScreenId = name;
    SCREENS.forEach((s) => {
      const node = document.getElementById('screen' + capitalize(s));
      if (node) node.classList.toggle('activeScreen', s === name);
    });
    window.Game.UI.BottomNav.setActive(name);
    renderCurrentScreen();
    if (name === 'map') window.Game.UI.MapScreen.onActivate(window.GameSave, humanPlayer());
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function renderCurrentScreen() {
    const name = window.GameSave.activeScreenId;
    const player = humanPlayer();
    if (name === 'city') window.Game.UI.CityScreen.render(document.getElementById('screenCity'), window.GameSave, player);
    else if (name === 'hero') window.Game.UI.HeroScreen.render(document.getElementById('screenHero'), window.GameSave, player);
    else if (name === 'army') window.Game.UI.ArmyScreen.render(document.getElementById('screenArmy'), window.GameSave, player);
    else if (name === 'mission') window.Game.UI.MissionScreen.render(document.getElementById('screenMission'), window.GameSave, player);
    else if (name === 'gacha') window.Game.UI.GachaScreen.render(document.getElementById('screenGacha'), window.GameSave, player);
    else if (name === 'report') window.Game.UI.ReportScreen.render(document.getElementById('screenReport'), player);
    else if (name === 'map') window.Game.UI.MapScreen.draw();
  }

  function refreshArmyScreenIfActive() {
    if (window.GameSave.activeScreenId === 'army') window.Game.UI.ArmyScreen.render(document.getElementById('screenArmy'), window.GameSave, humanPlayer());
  }

  function startMainLoop() {
    if (tickHandle) clearInterval(tickHandle);
    if (saveHandle) clearInterval(saveHandle);
    tickHandle = setInterval(gameTick, 1000);
    saveHandle = setInterval(() => window.Game.Systems.Save.saveToLocalStorage(window.GameSave), 20000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) window.Game.Systems.Save.saveToLocalStorage(window.GameSave); });
    window.addEventListener('beforeunload', () => window.Game.Systems.Save.saveToLocalStorage(window.GameSave));
  }

  function gameTick() {
    if (!window.GameSave) return;
    window.Game.Systems.GameLoop.advanceTime(window.GameSave, U.now());
    window.Game.UI.TopBar.refresh(humanPlayer());
    const screen = window.GameSave.activeScreenId;
    if (screen === 'city' || screen === 'army' || screen === 'hero' || screen === 'map' || screen === 'gacha') {
      renderCurrentScreen();
      if (screen === 'map') window.Game.UI.MapScreen.renderInfoPanel(window.GameSave, humanPlayer());
    }
  }

  window.Game.UI.Bootstrap = { boot, switchScreen, refreshArmyScreenIfActive };

  document.addEventListener('DOMContentLoaded', boot);
})();
