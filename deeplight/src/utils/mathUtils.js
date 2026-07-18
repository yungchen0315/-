/* ============================================================================
 * mathUtils.js — 通用數學工具：大數字格式化（萬／億／兆）、夾限、隨機。
 * ==========================================================================*/
(function () {
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function lerp(a, b, t) { return a + (b - a) * t; }

  /** 大數字格式化：1000 以下顯示整數，之後依萬／億／兆分級，取合適小數位數。 */
  function formatNum(n) {
    if (n === undefined || n === null || Number.isNaN(n)) return '0';
    const sign = n < 0 ? '-' : '';
    n = Math.abs(n);
    if (n < 1000) return sign + Math.floor(n).toString();
    const units = [[1e12, '兆'], [1e8, '億'], [1e4, '萬']];
    for (let i = 0; i < units.length; i++) {
      const [v, label] = units[i];
      if (n >= v) {
        const scaled = n / v;
        const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
        return sign + scaled.toFixed(decimals) + label;
      }
    }
    return sign + Math.floor(n).toString();
  }

  /** 格式化「每秒」類數值：小於 10 時保留 1 位小數，避免 0.1/s 之類的數字被無條件捨去顯示成 0。 */
  function formatRate(n) {
    if (n < 10) return n.toFixed(1);
    return formatNum(n);
  }

  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /** 加權隨機選一項；weightFn(item) 回傳權重（不需總和為 1）。 */
  function weightedChoice(items, weightFn) {
    const total = items.reduce((s, it) => s + weightFn(it), 0);
    let r = Math.random() * total;
    for (const it of items) {
      r -= weightFn(it);
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }

  window.App.Utils.clamp = clamp;
  window.App.Utils.lerp = lerp;
  window.App.Utils.formatNum = formatNum;
  window.App.Utils.formatRate = formatRate;
  window.App.Utils.randomInt = randomInt;
  window.App.Utils.choice = choice;
  window.App.Utils.weightedChoice = weightedChoice;
})();
