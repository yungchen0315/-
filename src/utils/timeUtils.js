/* ============================================================================
 * timeUtils.js — 時間相關工具。所有長時間機制（建造/練兵/研究/行軍/事件）都採用
 * 絕對時間戳（epoch ms）而非倒數秒數，離線進度追趕只需要比較「現在」與
 * completeAt/arriveAt 等時間戳即可，不需要額外的補幀模擬迴圈。
 * ==========================================================================*/

(function () {
  /** @returns {number} 目前的 epoch 毫秒數。 */
  function now() {
    return Date.now();
  }

  /**
   * 將毫秒數格式化為 HH:MM:SS 或 MM:SS（用於進行中的倒數計時顯示）。
   * @param {number} ms
   * @returns {string}
   */
  function formatCountdown(ms) {
    if (ms <= 0) return '00:00:00';
    const totalSec = Math.ceil(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (v) => String(v).padStart(2, '0');
    if (h > 0) return pad(h) + ':' + pad(m) + ':' + pad(s);
    return pad(m) + ':' + pad(s);
  }

  /**
   * 將毫秒數格式化為口語化的簡短時長（用於「約需 X 分」這類提示文字）。
   * @param {number} ms
   * @returns {string}
   */
  function formatDurationWords(ms) {
    if (ms <= 0) return '0秒';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return h + '時' + m + '分';
    if (m > 0) return m + '分' + s + '秒';
    return s + '秒';
  }

  window.Game.Utils.now = now;
  window.Game.Utils.formatCountdown = formatCountdown;
  window.Game.Utils.formatDurationWords = formatDurationWords;
})();
