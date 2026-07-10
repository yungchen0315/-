/* ============================================================================
 * resourceMath.js — 對「資源數量字典」（例如 {food:10, wood:5}）做的通用數學運算。
 * 這裡只處理數字加減，不判斷「這個行動該不該花這筆錢」——那屬於遊戲規則，
 * 應該放在 src/systems 底下，不放在這裡。
 * ==========================================================================*/

(function () {
  /**
   * 將多個資源字典加總成一個新字典。
   * @param {Object<string,number>[]} dicts
   * @returns {Object<string,number>}
   */
  function sumDicts(dicts) {
    const out = {};
    dicts.forEach((d) => {
      if (!d) return;
      Object.keys(d).forEach((k) => { out[k] = (out[k] || 0) + d[k]; });
    });
    return out;
  }

  /**
   * 檢查 `stock` 是否每一項都 >= `cost` 對應的數量。
   * @param {Object<string,number>} stock
   * @param {Object<string,number>} cost
   * @returns {boolean}
   */
  function canAfford(stock, cost) {
    return Object.keys(cost).every((k) => (stock[k] || 0) >= cost[k]);
  }

  /**
   * 直接從 `stock` 扣除 `cost`（會就地修改 stock）。呼叫前應先用 canAfford 檢查。
   */
  function subtract(stock, cost) {
    Object.keys(cost).forEach((k) => { stock[k] = (stock[k] || 0) - cost[k]; });
  }

  /**
   * 直接把 `amount` 加進 `stock`（會就地修改 stock），可選乘上一個比例係數（例如退款 50%）。
   */
  function add(stock, amount, ratio) {
    const mul = ratio === undefined ? 1 : ratio;
    Object.keys(amount).forEach((k) => { stock[k] = (stock[k] || 0) + amount[k] * mul; });
  }

  window.Game.Utils.sumDicts = sumDicts;
  window.Game.Utils.canAfford = canAfford;
  window.Game.Utils.subtractResources = subtract;
  window.Game.Utils.addResources = add;
})();
