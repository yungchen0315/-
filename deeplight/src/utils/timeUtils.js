/* ============================================================================
 * timeUtils.js — 時間工具：現在時刻、倒數／時長格式化。與存檔的絕對時戳哲學
 * 一致——所有進度都用 Date.now() 差值算，不假設固定 tick 步長。
 * ==========================================================================*/
(function () {
  function now() { return Date.now(); }

  function formatDurationWords(ms) {
    const totalSec = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return h + ' 小時 ' + m + ' 分';
    if (m > 0) return m + ' 分 ' + s + ' 秒';
    return s + ' 秒';
  }

  function formatClock(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  window.App.Utils.now = now;
  window.App.Utils.formatDurationWords = formatDurationWords;
  window.App.Utils.formatClock = formatClock;
})();
