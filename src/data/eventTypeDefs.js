/* ============================================================================
 * eventTypeDefs.js — 隨機事件「種類」的靜態資料。
 *
 * 這裡只放事件的描述與數值範圍，不放「怎麼觸發、怎麼結算」的邏輯——
 * 那些規則屬於 src/systems/eventSystem.js（下一階段實作），會依 id 查這份表，
 * 在 resourceRanges 給定的範圍內擲骰決定實際結算數量。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} EventTradeOption
   * @property {Object<string,number>} give 需支付的資源。
   * @property {Object<string,number>} get 換得的資源。
   */

  /**
   * @typedef {Object} EventTypeDef
   * @property {string} id
   * @property {string} name
   * @property {string} flavor 事件敘述文字。
   * @property {number} resolveMs 事件出現後，多久沒處理會被系統自動以結算結果收尾
   *   （確保離線期間事件不會無限堆積，也不需要玩家在線才能繼續進度）。玩家若在
   *   到期前選擇了交易選項（tradeOptions）或已被結算道具，就不會再走自動結算。
   * @property {Object<string,[number,number]>} resourceRanges 各資源的結算數量範圍
   *   [min, max]，正數為獲得、負數為損失。
   * @property {[number,number]} [ingotRange] 元寶結算數量範圍（獨立於 resourceRanges，
   *   不受倉庫上限影響）。
   * @property {string[]} [itemPool] 若有此欄位，結算時會從中隨機選一件裝備發放
   *   （取代單純的資源結算，對應「獻上實際兵器」之類的事件敘述）。
   * @property {EventTradeOption[]} [tradeOptions] 若有此欄位，玩家需在城池畫面中
   *   親自選擇其中一個交易方案才會結算（對應「商隊」之類真正需要互動的事件）；
   *   若到期前都沒有處理，系統會自動挑一個玩家負擔得起的方案結算，避免離線堆積。
   */

  /** @type {EventTypeDef[]} */
  const EVENT_TYPE_DEFS = [
    { id: 'caravan', name: '商隊經過', flavor: '一支商隊路經城郊，願以優惠價格交換物資，需親自前往查看可交易的貨品。',
      resolveMs: 30 * 60000, resourceRanges: {},
      tradeOptions: [
        { give: { gold: 150 }, get: { food: 280 } },
        { give: { gold: 150 }, get: { wood: 280 } },
        { give: { gold: 150 }, get: { stone: 220 } },
        { give: { food: 200 }, get: { gold: 110 } }
      ] },
    { id: 'refugees', name: '流民歸附', flavor: '戰亂流民扶老攜幼而來，盼能在城中安身。',
      resolveMs: 30 * 60000, resourceRanges: { food: [100, 250] } },
    { id: 'bandit_raid', name: '山賊襲擾', flavor: '一股山賊夜襲糧道，需即刻調兵驅逐。',
      resolveMs: 20 * 60000, resourceRanges: { food: [-60, -20] } },
    { id: 'good_harvest', name: '豐收之年', flavor: '風調雨順，今年田畝收成格外豐足。',
      resolveMs: 40 * 60000, resourceRanges: { food: [150, 300] } },
    { id: 'old_smith', name: '老鐵匠獻寶', flavor: '一位隱居的老鐵匠感念仁德，願獻上舊藏兵器一件。',
      resolveMs: 40 * 60000, resourceRanges: {},
      itemPool: ['sword_iron', 'blade_double', 'armor_leather', 'horse_common', 'seal_general'] },
    { id: 'noble_gift', name: '貴客獻禮', flavor: '一位遠道而來的貴客，感念款待之情，留下一袋元寶。',
      resolveMs: 40 * 60000, resourceRanges: {}, ingotRange: [20, 60] }
  ];

  function eventTypeDefById(id) { return EVENT_TYPE_DEFS.find((e) => e.id === id); }

  window.Game.Data.EVENT_TYPE_DEFS = EVENT_TYPE_DEFS;
  window.Game.Data.eventTypeDefById = eventTypeDefById;
})();
