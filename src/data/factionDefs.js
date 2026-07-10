/* ============================================================================
 * factionDefs.js — 勢力靜態資料。與存檔進度無關，三個新遊戲永遠讀到同一份表。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} FactionDef
   * @property {string} id
   * @property {string} name
   * @property {string} short
   * @property {string} color CSS 顏色，用於地圖與 UI 標示。
   * @property {boolean} isHuman 是否為玩家操控的勢力。
   * @property {string} desc
   */

  /** @type {FactionDef[]} */
  const FACTION_DEFS = [
    { id: 'shu', name: '蜀漢', short: '蜀', color: '#3aa15c', isHuman: true,
      desc: '劉備一統天下的最後希望，兵少而將精，長於防守與奇襲。' },
    { id: 'wei', name: '魏', short: '魏', color: '#3a6bb0', isHuman: false,
      desc: '曹氏根基最厚，地廣糧多，長於堂堂正正的國力壓制。' },
    { id: 'wu', name: '吳', short: '吳', color: '#c0392b', isHuman: false,
      desc: '孫氏割據江東，長於水戰與快速擴張，善於見縫插針。' }
  ];

  function factionDefById(id) { return FACTION_DEFS.find((f) => f.id === id); }

  window.Game.Data.FACTION_DEFS = FACTION_DEFS;
  window.Game.Data.factionDefById = factionDefById;
})();
