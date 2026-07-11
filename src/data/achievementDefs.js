/* ============================================================================
 * achievementDefs.js — 成就靜態資料。
 *
 * `condition` 用宣告式的描述（type + 參數）取代直接寫函式，讓判斷邏輯真正留在
 * src/systems/achievementSystem.js（下一階段實作）裡集中解讀，資料檔本身
 * 不含任何會讀取 PlayerState 內部欄位的程式碼。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} AchievementCondition
   * @property {'buildingLevelAny'|'buildingLevel'|'heroCount'|'heroLevelAny'|
   *   'battleWinCount'|'missionCompletedCount'|'missionCompletedAll'|
   *   'itemEverObtained'|'heroFullyEquippedAny'} type
   * @property {string} [building] type 為 'buildingLevel' 時指定建築 id。
   * @property {number} [atLeast] 門檻數值。
   */

  /**
   * @typedef {Object} AchievementDef
   * @property {string} id
   * @property {string} name
   * @property {string} desc
   * @property {{resources: Object<string,number>, ingot?: number}} reward
   * @property {AchievementCondition} condition
   */

  /** @type {AchievementDef[]} */
  const ACHIEVEMENT_DEFS = [
    { id: 'first_upgrade', name: '基業初立', desc: '完成一次建築升級',
      reward: { resources: { gold: 100 }, ingot: 20 }, condition: { type: 'buildingLevelAny', atLeast: 2 } },
    { id: 'capital5', name: '固若金湯', desc: '主城升級至 5 級',
      reward: { resources: { gold: 400, stone: 300 }, ingot: 60 }, condition: { type: 'buildingLevel', building: 'capital', atLeast: 5 } },
    { id: 'capital10', name: '王城巍峨', desc: '主城升級至 10 級',
      reward: { resources: { gold: 1500 }, ingot: 150 }, condition: { type: 'buildingLevel', building: 'capital', atLeast: 10 } },
    { id: 'five_heroes', name: '五虎齊聚', desc: '擁有至少 5 名武將',
      reward: { resources: { gold: 300 }, ingot: 40 }, condition: { type: 'heroCount', atLeast: 5 } },
    { id: 'ten_heroes', name: '猛將如雲', desc: '擁有至少 10 名武將',
      reward: { resources: { gold: 600 }, ingot: 80 }, condition: { type: 'heroCount', atLeast: 10 } },
    { id: 'hero_lv10', name: '身經百戰', desc: '任一武將等級達到 10',
      reward: { resources: { food: 300, wood: 300 }, ingot: 40 }, condition: { type: 'heroLevelAny', atLeast: 10 } },
    { id: 'first_win', name: '初戰告捷', desc: '取得第一次戰鬥勝利',
      reward: { resources: { gold: 150 }, ingot: 20 }, condition: { type: 'battleWinCount', atLeast: 1 } },
    { id: 'ten_wins', name: '百戰百勝', desc: '累計取得 10 次戰鬥勝利',
      reward: { resources: { gold: 500 }, ingot: 60 }, condition: { type: 'battleWinCount', atLeast: 10 } },
    { id: 'five_missions', name: '初露鋒芒', desc: '完成 5 個主線戰役關卡',
      reward: { resources: { gold: 400 }, ingot: 50 }, condition: { type: 'missionCompletedCount', atLeast: 5 } },
    { id: 'all_missions', name: '天下歸一', desc: '完成全部主線戰役關卡',
      reward: { resources: { gold: 2000, food: 1000, wood: 1000, stone: 1000 }, ingot: 300 }, condition: { type: 'missionCompletedAll' } },
    { id: 'first_item', name: '寶物初現', desc: '取得第一件裝備',
      reward: { resources: { gold: 150 }, ingot: 20 }, condition: { type: 'itemEverObtained' } },
    { id: 'full_equip', name: '披堅執銳', desc: '讓任一武將裝備滿四個部位',
      reward: { resources: { gold: 500 }, ingot: 60 }, condition: { type: 'heroFullyEquippedAny' } }
  ];

  function achievementDefById(id) { return ACHIEVEMENT_DEFS.find((a) => a.id === id); }

  window.Game.Data.ACHIEVEMENT_DEFS = ACHIEVEMENT_DEFS;
  window.Game.Data.achievementDefById = achievementDefById;
})();
