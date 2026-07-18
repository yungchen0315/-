/* ============================================================================
 * SaveGame.js — 整份存檔的形狀與「建立空殼」工廠函式。純資料，不含遊戲規則。
 * 衍生數值（螢光/秒、各種倍率）一律不存檔，載入時由 systems 重新計算。
 * @typedef {Object} SaveGame
 * @property {number} version
 * @property {number} createdAt
 * @property {number} lastActiveAt 絕對時戳，供離線進度結算使用。
 * @property {number} glow 螢光（軟性主貨幣，轉生重置）。
 * @property {number} samples 樣本（研究樹貨幣，轉生重置）。
 * @property {number} pearls 深海珍珠（成就掉落，永久保留，v1 無消耗項）。
 * @property {number} cores 壓力核心（轉生貨幣，永久保留）。
 * @property {number} depth 目前深度（公尺），轉生重置。
 * @property {number} maxDepthThisRun 本輪最大深度，決定轉生結算，轉生重置。
 * @property {number} maxDepthEver 史上最大深度，永久保留（成就用）。
 * @property {number} currentZone 目前海域索引（ZONE_DEFS 的 id），轉生重置。
 * @property {Object<string,{count:number, upgradeTier:number}>} modules 以 ModuleDef.id 為 key，轉生重置。
 * @property {number} ballastLevel 壓載等級 0~8，轉生重置。
 * @property {string[]} research 已完成研究 id（RESEARCH_DEFS），轉生重置。
 * @property {string[]} refits 已購重構 id（REFIT_DEFS），永久保留。
 * @property {Object<string,{seen:number, firstAt:number}>} bestiary 以 CreatureDef.id 為 key，永久保留。
 * @property {number} pendingCreatures 離線期間累積、尚未點擊領取的「錯過的生物」數量 0~5。
 * @property {string[]} achievements 已解鎖成就 id，永久保留。
 * @property {number} prestigeCount 已轉生次數，永久保留。
 * @property {{totalGlowEarned:number, totalTaps:number, totalCoresEarned:number}} stats 永久保留的統計數字。
 * @property {{sound:boolean}} settings
 * ==========================================================================*/
(function () {
  function createDefaultSave(now) {
    return {
      version: 1,
      createdAt: now,
      lastActiveAt: now,
      glow: 0,
      samples: 0,
      pearls: 0,
      cores: 0,
      depth: 0,
      maxDepthThisRun: 0,
      maxDepthEver: 0,
      currentZone: 0,
      modules: {},
      ballastLevel: 0,
      research: [],
      refits: [],
      bestiary: {},
      pendingCreatures: 0,
      achievements: [],
      prestigeCount: 0,
      stats: { totalGlowEarned: 0, totalTaps: 0, totalCoresEarned: 0 },
      settings: { sound: true }
    };
  }

  window.App.Models.createDefaultSave = createDefaultSave;
})();
