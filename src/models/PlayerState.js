/* ============================================================================
 * PlayerState.js — 單一勢力（玩家或 AI）的完整動態狀態。是存檔裡最大的一塊，
 * 把前面幾個模型（ResourceState／CityState／HeroState／ArmyState／
 * TechnologyState／MissionState／BattleState）依勢力聚合在一起。
 *
 * 這個檔案只負責「長什麼樣子」與「空殼要怎麼生出來」，不做任何遊戲規則判斷
 * （例如「該不該解鎖某個科技」）——那些交給 src/systems 依存檔內容與
 * src/data 的靜態表在執行期算出來，模型本身保持中立、可序列化成 JSON。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} PendingEventState
   * 對應 EventTypeDef（src/data/eventTypeDefs.js）的一筆進行中事件。
   * 沒有列在使用者要求的型別清單裡，先以最小可序列化形狀存在 PlayerState 裡，
   * 之後如果需要可以獨立拆成 EventState.js。
   * @property {string} id
   * @property {string} eventTypeDefId
   * @property {number} startAt
   * @property {number} deadlineAt 到期時間；系統會在到期時自動以結算結果收尾，
   *   離線期間不需要玩家在線互動也能正確推進。
   */

  /**
   * @typedef {Object} PlayerState
   * @property {string} factionId 對應 FactionDef.id。
   * @property {boolean} isHuman
   * @property {ResourceState} resources
   * @property {Object<string,CityState>} cities 以 cityId 為 key。MVP 階段只有一筆，
   *   但形狀本身支援未來的多城池。
   * @property {Object<string,HeroState>} heroes 以 HeroData.id 為 key（每位武將全局唯一，
   *   不會有多份拷貝）。
   * @property {Object<string,ArmyState>} armies 以 armyId 為 key。
   * @property {Object<string,number>} inventory 未裝備的道具庫存，以 ItemDef.id 為 key。
   * @property {Object<string,TechnologyState>} technologies 以 TechnologyDef.id 為 key。
   * @property {Object<string,MissionState>} missions 以 MissionDef.id 為 key
   *   （AI 勢力目前不會有進度，但形狀保持一致，方便日後如果要給 AI 也接上劇情）。
   * @property {BattleState[]} battleLog 依時間新到舊排列，供戰報畫面與成就系統查詢。
   * @property {PendingEventState[]} pendingEvents
   * @property {string[]} unlockedAchievementIds
   * @property {number} nextEventAt 下一次隨機事件的排程時間戳，供事件系統使用。
   * @property {number} lastDailyRewardAt 上次發放每日簽到元寶的時間戳，供 gachaSystem 使用。
   */

  /**
   * 建立一個「空殼」PlayerState：資源給新遊戲的起始值，其餘集合皆為空，
   * technologies／missions 依靜態表鋪好全部項目但狀態都是 'locked'。
   * 實際的新遊戲初始化（放置主城、給起始武將與部隊、解鎖第一批任務／科技）
   * 屬於系統層（下一階段的 newGameSystem），不在這個工廠函式裡做。
   *
   * @param {string} factionId
   * @param {boolean} isHuman
   * @param {number} now
   * @returns {PlayerState}
   */
  function createPlayerState(factionId, isHuman, now) {
    const technologies = {};
    window.Game.Data.TECHNOLOGY_DEFS.forEach((t) => {
      technologies[t.id] = window.Game.Models.createTechnologyState(t.id);
    });

    const missions = {};
    window.Game.Data.missionDefsForFaction(factionId).forEach((m) => {
      missions[m.id] = window.Game.Models.createMissionState(m.id);
    });

    return {
      factionId,
      isHuman: !!isHuman,
      resources: window.Game.Models.createResourceState(),
      cities: {},
      heroes: {},
      armies: {},
      inventory: {},
      technologies,
      missions,
      battleLog: [],
      pendingEvents: [],
      unlockedAchievementIds: [],
      nextEventAt: now + 8 * 60000,
      lastDailyRewardAt: now
    };
  }

  window.Game.Models.createPlayerState = createPlayerState;
})();
