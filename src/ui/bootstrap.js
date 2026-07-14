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

    U.onTap(document.getElementById('topHelpBtn'), () => { if (window.GameSave) window.Game.UI.Tutorial.start(); });
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
    normalizeSave(window.GameSave);
    const awayMs = Math.max(0, U.now() - window.GameSave.lastActiveAt);
    const player = humanPlayer();
    const before = player ? Object.assign({}, player.resources) : null;
    window.Game.Systems.GameLoop.advanceTime(window.GameSave, U.now());
    afterReady();
    if (player && before) showOfflineReport(player, before, awayMs);
  }

  // 離線收益回報：讀檔續玩時比對「advanceTime 追趕離線進度前後」的資源存量差額，
  // 只要離開超過一分鐘且確實有進帳，就跳出提示告知玩家離線期間各項資源獲得多少
  // （不論來源是城池產出、產地產出還是部隊返程掠奪，一律算在內，不需逐一列舉來源）。
  const OFFLINE_REPORT_MIN_AWAY_MS = 60000;
  function showOfflineReport(player, before, awayMs) {
    if (awayMs < OFFLINE_REPORT_MIN_AWAY_MS) return;
    const D = window.Game.Data;
    const eff = window.Game.Systems.Economy.computeEffects(player);
    const lines = [];
    D.RESOURCE_TYPES.forEach((r) => {
      // 該資源目前已存滿（達倉庫上限）就不用標示了——滿的話多出來的產出等於
      // 白白浪費，告知「獲得多少」沒有意義，且可能誤導玩家以為還有空間。
      if ((player.resources[r] || 0) >= eff.storageCap[r]) return;
      const gain = Math.round((player.resources[r] || 0) - (before[r] || 0));
      if (gain > 0) lines.push(D.RESOURCE_NAMES[r] + D.RESOURCE_ICONS[r] + ' +' + gain);
    });
    const ingotGain = Math.round((player.resources.ingot || 0) - (before.ingot || 0));
    if (ingotGain > 0) lines.push('元寶🧧 +' + ingotGain);
    if (!lines.length) return;
    Dlg.showInfo('你離開了 ' + U.formatDurationWords(awayMs) + '，領地在此期間持續產出：', lines);
  }

  // 舊存檔相容：補上後來才加入的欄位，讓載入舊進度時不會因為缺欄位而出錯。
  function normalizeSave(saveGame) {
    // 舊存檔沒有新手教學欄位：一律視為已看過，避免老玩家讀檔時被硬塞教學畫面。
    if (saveGame.tutorialSeen === undefined) saveGame.tutorialSeen = true;
    Object.values(saveGame.players || {}).forEach((p) => {
      Object.values(p.armies || {}).forEach((army) => {
        if (!Array.isArray(army.subHeroStateIds)) army.subHeroStateIds = [];
      });
      Object.values(p.heroes || {}).forEach((hero) => {
        if (!Array.isArray(hero.tactics)) hero.tactics = [];
      });
      if (!Array.isArray(p.learnedTactics)) p.learnedTactics = [];
      if (!p.defeated) window.Game.Systems.NewGame.grantStarterHeroIfMissing(p);
      // 舊存檔可能還留著已刪除建築（糧倉／伐木場／採石場／金礦）的資料，
      // 這些型別在 D.BUILDING_DEFS 已經不存在，留著只會讓依賴 buildingDefById
      // 的畫面在讀到孤兒資料時炸掉，直接清掉（連同尚未完工的升級一起作廢）。
      const capitalTile = window.Game.Systems.Map.capitalTileOf(saveGame.map, p.factionId);
      Object.values(p.cities || {}).forEach((city) => {
        Object.keys(city.buildings || {}).forEach((type) => {
          if (!window.Game.Data.buildingDefById(type)) delete city.buildings[type];
        });
        // 舊存檔沒有 isCapital 欄位：用地圖上該勢力實際的主城座標比對回填，
        // 不能單純假設字典裡第一筆就是主城（armySystem.primaryCity 依 isCapital
        // 判斷，回填錯了會讓訓練／招募／研究全部指向錯的城池）。
        if (city.isCapital === undefined) {
          city.isCapital = !!(capitalTile && city.tileX === capitalTile.x && city.tileY === capitalTile.y);
        }
      });
    });
    if (!saveGame.activeBattles) saveGame.activeBattles = {};
    Object.values((saveGame.map && saveGame.map.tiles) || {}).forEach((t) => {
      if (!t.terrain) t.terrain = 'plain';
      // 舊存檔的資源格／土地格沒有等級概念，一律補上「目前的 yieldPerMin／guardPower
      // 就是 1 級的基準值」，避免升級系統把舊存檔的數值當成已經疊乘過等級的結果。
      if (t.type === 'resource' && !t.level) {
        t.level = 1;
        t.baseYieldPerMin = t.yieldPerMin;
        t.baseGuardPower = t.guardPower;
      }
    });
    // 舊存檔的空地一律轉為可佔領的土地格（新地圖在 generateMap 時就已轉換）。
    if (saveGame.map) window.Game.Systems.Map.convertEmptyTilesToLand(saveGame.map);
  }

  function startFresh(factionId) {
    window.GameSave = window.Game.Systems.NewGame.createNewGame(factionId);
    afterReady();
    if (!window.GameSave.tutorialSeen) {
      window.Game.UI.Tutorial.start(() => {
        window.GameSave.tutorialSeen = true;
        window.Game.Systems.Save.saveToLocalStorage(window.GameSave);
      });
    }
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

  // 結局畫面：天下統一／敗亡。只在 outcome 尚未被玩家看過時顯示一次。
  let outcomeOverlayOpen = false;
  function maybeShowOutcome() {
    const outcome = window.GameSave.outcome;
    if (!outcome || outcome.acknowledged || outcomeOverlayOpen) return;
    outcomeOverlayOpen = true;
    const win = outcome.result === 'victory';
    const overlay = U.el('div', 'confirmOverlay');
    const box = U.el('div', 'confirmBox outcomeBox');
    box.appendChild(U.el('div', 'outcomeTitle' + (win ? ' outcomeTitleWin' : ' outcomeTitleLose'), win ? '天下統一' : '江山傾覆'));
    box.appendChild(U.el('div', 'confirmMessage', win
      ? '三分歸一統！你已攻陷所有敵對勢力的主城，亂世至此平定，天下盡歸你手。'
      : '主城陷落，社稷傾覆……你的勢力已然敗亡。可重新開始，再爭天下。'));
    const btnRow = U.el('div', 'confirmBtnRow');
    if (win) {
      const okBtn = U.el('button', 'setupBtn confirmOkBtn', '繼續遊玩');
      U.onTap(okBtn, () => { outcome.acknowledged = true; window.Game.Systems.Save.saveToLocalStorage(window.GameSave); document.body.removeChild(overlay); outcomeOverlayOpen = false; });
      btnRow.appendChild(okBtn);
    } else {
      const watchBtn = U.el('button', 'setupBtn confirmCancelBtn', '繼續觀望');
      U.onTap(watchBtn, () => { outcome.acknowledged = true; window.Game.Systems.Save.saveToLocalStorage(window.GameSave); document.body.removeChild(overlay); outcomeOverlayOpen = false; });
      const restartBtn = U.el('button', 'setupBtn confirmOkBtn', '重新開始');
      U.onTap(restartBtn, () => { window.Game.Systems.Save.deleteSave(); location.reload(); });
      btnRow.appendChild(watchBtn);
      btnRow.appendChild(restartBtn);
    }
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  function gameTick() {
    if (!window.GameSave) return;
    window.Game.Systems.GameLoop.advanceTime(window.GameSave, U.now());
    maybeShowOutcome();
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
