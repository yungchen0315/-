/* ============================================================================
 * SaveGame.js — 存檔主結構。整份存檔就是一個 SaveGame 物件，
 * 直接 JSON.stringify / JSON.parse 即可（所有子模型都只由純資料組成，
 * 不含函式或 DOM 參照），對應「存檔格式先用 JSON」的需求。
 * ==========================================================================*/

(function () {
  const SAVE_VERSION = 1;

  /**
   * @typedef {Object} SaveGame
   * @property {number} version 存檔格式版本號，讀檔時用來判斷是否需要遷移或直接拒讀。
   * @property {number} createdAt 建立新遊戲的時間戳（epoch ms）。
   * @property {number} lastActiveAt 最後一次呼叫 advanceTime 的時間戳，用於離線時長計算。
   * @property {MapState} map 三個勢力共用的世界地圖。
   * @property {Object<string,PlayerState>} players 以 FactionDef.id 為 key，
   *   目前固定是 { shu, wei, wu } 三筆。
   * @property {number} nextAiTickAt AI 勢力下一次決策排程的時間戳。
   * @property {string} activeScreenId 目前選中的畫面分頁 id（純 UI 狀態，但為了讓玩家
   *   下次開遊戲回到同一畫面，一併存進存檔）。
   * @property {boolean} tutorialSeen 是否已經看過新手教學（見 src/ui/tutorialScreen.js）。
   *   新遊戲建立時為 false，教學跑完或跳過後設為 true，避免每次開遊戲都重複彈出。
   * @property {{result:'victory'|'defeat', at:number, acknowledged:boolean}} [outcome]
   *   天下大勢的最終結局：玩家滅盡所有 AI 勢力＝victory（天下統一），玩家主城被攻陷＝
   *   defeat（敗亡）。由 gameLoopSystem.checkWorldOutcome 判定一次後寫入，bootstrap
   *   據此顯示結局畫面（acknowledged 記錄玩家是否已看過，避免重複跳出）。
   * @property {Object<string,Object>} activeBattles 以出征部隊 armyId 為 key（每筆紀錄內仍
   *   帶有 tileId），記錄「目前正在進行中」的地圖戰鬥（見 combatSystem.resolveArmyArrival／
   *   resolveActiveBattles）：部隊抵達目標後不會立即結算，而是先登記一場進行中的戰鬥，地圖上
   *   會顯示交戰標記，玩家點進該格能看到「觀戰」按鈕即時重播；時間到了才會真正結算傷亡／掠奪／
   *   佔領並移除此筆紀錄。不存在或已過期即代表該支部隊／該格目前沒有戰鬥在進行。以 armyId 為
   *   key 是因為同一地塊可能同時有多支部隊交戰（例如兩軍同時攻打同一據點），用 tile id 當 key
   *   會讓後到的部隊覆蓋掉先到部隊的記錄，使先到部隊卡在 fighting 狀態卻永遠等不到結算。
   */

  /**
   * 建立一個空的 SaveGame 骨架：地圖與三個勢力的 PlayerState 都已就位，
   * 但地圖尚未生成內容、勢力也還沒有城池/武將/部隊——那些交給下一階段的
   * newGameSystem 依 FACTION_DEFS 與 MAP_CONFIG 實際生成。
   * 這個函式純粹示範「存檔主結構長什麼樣子」，也可作為系統實作的起點。
   *
   * @param {number} now
   * @returns {SaveGame}
   */
  function createEmptySaveGame(now) {
    const players = {};
    window.Game.Data.FACTION_DEFS.forEach((f) => {
      players[f.id] = window.Game.Models.createPlayerState(f.id, f.isHuman, now);
    });

    return {
      version: SAVE_VERSION,
      createdAt: now,
      lastActiveAt: now,
      map: window.Game.Models.createEmptyMapState(window.Game.Data.MAP_CONFIG.width, window.Game.Data.MAP_CONFIG.height),
      players,
      nextAiTickAt: now + 5 * 60000,
      activeScreenId: 'city',
      activeBattles: {},
      tutorialSeen: false
    };
  }

  /**
   * 序列化存檔為 JSON 字串。
   * @param {SaveGame} saveGame
   * @returns {string}
   */
  function serializeSaveGame(saveGame) {
    return JSON.stringify(saveGame);
  }

  /**
   * 從 JSON 字串還原存檔。版本不符時回傳 null，交由呼叫方決定是否視為無效存檔。
   * @param {string} json
   * @returns {SaveGame|null}
   */
  function deserializeSaveGame(json) {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || parsed.version !== SAVE_VERSION) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  window.Game.Models.SAVE_VERSION = SAVE_VERSION;
  window.Game.Models.createEmptySaveGame = createEmptySaveGame;
  window.Game.Models.serializeSaveGame = serializeSaveGame;
  window.Game.Models.deserializeSaveGame = deserializeSaveGame;
})();
