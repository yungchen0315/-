/* ============================================================================
 * mathUtils.js — 與遊戲規則無關的通用數學工具。
 * ==========================================================================*/

(function () {
  /**
   * 將數值限制在 [lo, hi] 範圍內。
   * @param {number} value
   * @param {number} lo
   * @param {number} hi
   * @returns {number}
   */
  function clamp(value, lo, hi) {
    return Math.max(lo, Math.min(hi, value));
  }

  /**
   * 線性插值，t=0 回傳 a，t=1 回傳 b。
   * @param {number} a
   * @param {number} b
   * @param {number} t 0~1
   * @returns {number}
   */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * 兩點間的歐幾里得距離。
   */
  function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  /**
   * 兩個格座標間的棋盤格距離（Chebyshev distance），用於地圖行軍距離估算。
   * @param {{x:number,y:number}} a
   * @param {{x:number,y:number}} b
   * @returns {number}
   */
  function tileDistance(a, b) {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  }

  /**
   * 傳回 [min, max] 之間（含端點）的隨機整數。
   */
  function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  /**
   * 從陣列中隨機取一個元素。
   * @template T
   * @param {T[]} arr
   * @returns {T}
   */
  function choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  window.Game.Utils.clamp = clamp;
  window.Game.Utils.lerp = lerp;
  window.Game.Utils.distance = distance;
  window.Game.Utils.tileDistance = tileDistance;
  window.Game.Utils.randomInt = randomInt;
  window.Game.Utils.choice = choice;
})();
