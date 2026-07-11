/* ============================================================================
 * gachaPoolDefs.js — 抽獎獎池靜態資料。依稀有度分三個池：銅／銀／金，
 * 池越貴，池內武將的稀有度下限越高、金/絕世的中獎權重也越高。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} GachaPoolDef
   * @property {string} id
   * @property {string} name
   * @property {number} costSingle 單抽消耗元寶。
   * @property {number} costTen 十連消耗元寶（略低於單抽 x10，鼓勵十連）。
   * @property {[number,number]} heroRarityRange 池內武將稀有度範圍（含端點）。
   * @property {[number,number]} itemTierRange 池內裝備 tier 範圍（含端點）。
   */

  /** @type {GachaPoolDef[]} */
  const GACHA_POOLS = [
    { id: 'bronze', name: '銅池', costSingle: 100, costTen: 900, heroRarityRange: [2, 3], itemTierRange: [1, 2] },
    { id: 'silver', name: '銀池', costSingle: 300, costTen: 2700, heroRarityRange: [2, 4], itemTierRange: [1, 3] },
    { id: 'gold', name: '金池', costSingle: 600, costTen: 5400, heroRarityRange: [3, 5], itemTierRange: [2, 5] }
  ];

  /** 稀有度／tier（共用 1~5 分級）對應的抽中權重，數字越大越常出現。 */
  const GACHA_RARITY_WEIGHT = { 1: 50, 2: 38, 3: 20, 4: 8, 5: 2 };

  function gachaPoolById(id) { return GACHA_POOLS.find((p) => p.id === id); }

  window.Game.Data.GACHA_POOLS = GACHA_POOLS;
  window.Game.Data.GACHA_RARITY_WEIGHT = GACHA_RARITY_WEIGHT;
  window.Game.Data.gachaPoolById = gachaPoolById;
})();
