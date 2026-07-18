/* ============================================================================
 * balance.js — 全遊戲數值常數的唯一真相源。調參只改這裡，不要在 systems 裡
 * 散落魔法數字。對應企劃書第 3~6 節的公式。
 * ==========================================================================*/
(function () {
  const BALANCE = {
    // 模組成本成長率：cost(n) = baseCost * MODULE_COST_GROWTH^n（n = 目前持有數）。
    MODULE_COST_GROWTH: 1.15,
    // 模組升級：持有數達到門檻時解鎖一次 x2 產量升級，費用 = baseCost * 對應倍率。
    MODULE_UPGRADE_THRESHOLDS: [10, 25, 50],
    MODULE_UPGRADE_COST_MULTIPLIERS: [50, 500, 5000],
    MODULE_UPGRADE_PROD_MULT: 2, // 每買一階，該模組單體產量再 x2（可疊乘）

    // 壓載升級：descentRate = BALLAST_BASE_RATE + BALLAST_RATE_PER_LEVEL * level。
    // cost(level) = BALLAST_BASE_COST * BALLAST_COST_GROWTH^(level-1)，level 從 1 起算下一級費用。
    BALLAST_BASE_RATE: 2, // m/min，level 0（未升級）
    BALLAST_RATE_PER_LEVEL: 2,
    BALLAST_BASE_COST: 200,
    BALLAST_COST_GROWTH: 3,
    BALLAST_MAX_LEVEL: 8,

    // 離線進度：全速時窗 + 半速時窗，超過兩者總和不再累積（絕對上限另外夾限）。
    OFFLINE_FULL_HOURS: 8,
    OFFLINE_HALF_HOURS: 16,
    OFFLINE_ABSOLUTE_CAP_HOURS: 48,
    OFFLINE_MIN_SECONDS: 10, // 低於此秒數不彈報告、不結算（避免切分頁瞬間觸發）

    // 轉生（重返海面）：需求最低深度、核心結算公式。
    PRESTIGE_MIN_DEPTH: 2000,
    PRESTIGE_DEPTH_DIVISOR: 400,
    PRESTIGE_EXPONENT: 1.15,
    CORE_PRODUCTION_BONUS_PCT: 10, // 每顆壓力核心 +10% 全螢光產量（乘法疊加）
    BESTIARY_PROD_BONUS_PCT: 2, // 深淵圖鑑每記錄一種生物 +2% 全螢光產量，永久保留

    // 點擊與生物。
    CLICK_TAP_GLOW: 1, // 手動點擊水域的固定螢光獎勵（不受產量倍率影響，只是起步用）
    CREATURE_SPAWN_INTERVAL_MS: [20000, 45000], // 路過生物出現間隔隨機範圍
    CREATURE_SAMPLE_DROP_CHANCE: 0.25, // 非首次遇見時，額外掉落樣本的機率
    CREATURE_BURST_SECONDS: 30, // 點擊生物獲得「N 秒產量」的爆發獎勵
    CREATURE_RARE_CHANCE: 0.15, // 生物生成時抽到稀有種的機率（該海域稀有種存在時才生效）

    CREATURE_MISSED_INTERVAL_MS: 2 * 3600 * 1000, // 離線每滿 2 小時記一次「錯過的生物」
    CREATURE_MISSED_QUEUE_CAP: 5,

    AUTOSAVE_INTERVAL_MS: 10000,
    TICK_INTERVAL_MS: 250
  };

  window.App.Data.BALANCE = BALANCE;
})();
