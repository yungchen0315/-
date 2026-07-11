/* ============================================================================
 * gachaSystem.js — 酒館招募邏輯：三個依稀有度分級的獎池，消耗元寶招募武將／裝備。
 * 需先建成酒館（tavern.level >= 1）才能招募，酒館與科技的 gachaDiscountPct
 * 效果會降低花費。武將抽到重複的（已擁有）不會覆蓋，改為部分元寶返還，避免
 * 抽到「已經有的」卻沒有任何回饋。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;

  const DAILY_REWARD_INTERVAL_MS = 24 * 3600000;
  const DAILY_REWARD_INGOT = 50;
  const DAILY_REWARD_MAX_CATCHUP = 7;

  /**
   * 每日簽到元寶，只發給玩家（AI 不需要）。離線超過數天時最多一次補發 7 天份，
   * 避免長時間離線回來後元寶暴增。
   * @param {PlayerState} playerState
   * @param {number} now
   * @returns {number} 這次補發的天數（0 表示還沒到下一次發放時間）。
   */
  function tickDailyReward(playerState, now) {
    if (!playerState.isHuman) return 0;
    if (!playerState.lastDailyRewardAt) playerState.lastDailyRewardAt = now;
    let days = 0;
    while (now - playerState.lastDailyRewardAt >= DAILY_REWARD_INTERVAL_MS && days < DAILY_REWARD_MAX_CATCHUP) {
      playerState.lastDailyRewardAt += DAILY_REWARD_INTERVAL_MS;
      days++;
    }
    if (days > 0) playerState.resources.ingot = (playerState.resources.ingot || 0) + DAILY_REWARD_INGOT * days;
    return days;
  }

  /** @returns {Array<{kind:'hero'|'item', id:string, weight:number}>} */
  function poolEntries(pool) {
    const entries = [];
    D.HERO_DEFS.forEach((h) => {
      if (h.rarity >= pool.heroRarityRange[0] && h.rarity <= pool.heroRarityRange[1]) {
        entries.push({ kind: 'hero', id: h.id, weight: D.GACHA_RARITY_WEIGHT[h.rarity] || 1 });
      }
    });
    D.ITEM_DEFS.forEach((it) => {
      if (it.tier >= pool.itemTierRange[0] && it.tier <= pool.itemTierRange[1]) {
        entries.push({ kind: 'item', id: it.id, weight: D.GACHA_RARITY_WEIGHT[it.tier] || 1 });
      }
    });
    return entries;
  }

  function drawOne(pool) {
    return U.weightedChoice(poolEntries(pool), (e) => e.weight);
  }

  function tavernLevel(playerState) {
    const city = window.Game.Systems.Army.primaryCity(playerState);
    return city ? city.buildings.tavern.level : 0;
  }

  /**
   * @param {PlayerState} playerState
   * @param {string} poolId
   * @param {1|10} count
   * @returns {{ok:boolean, reason?:string, draws?:Array<Object>, poolId?:string}}
   */
  function draw(playerState, poolId, count) {
    if (tavernLevel(playerState) <= 0) return { ok: false, reason: '需先建造酒館' };
    const pool = D.gachaPoolById(poolId);
    if (!pool) return { ok: false, reason: '找不到此獎池' };
    const n = count === 10 ? 10 : 1;
    const eff = window.Game.Systems.Economy.computeEffects(playerState);
    const baseCost = n === 10 ? pool.costTen : pool.costSingle;
    const cost = Math.round(baseCost * (1 - (eff.gachaDiscountPct || 0) / 100));
    if ((playerState.resources.ingot || 0) < cost) return { ok: false, reason: '元寶不足' };
    playerState.resources.ingot -= cost;

    const perDrawCost = cost / n;
    const results = [];
    for (let i = 0; i < n; i++) {
      const picked = drawOne(pool);
      if (picked.kind === 'hero') {
        if (playerState.heroes[picked.id]) {
          const refund = Math.round(perDrawCost * 0.3);
          playerState.resources.ingot += refund;
          results.push({ kind: 'hero', id: picked.id, duplicate: true, refund });
        } else {
          window.Game.Systems.Hero.unlockHeroFromMission(playerState, picked.id);
          results.push({ kind: 'hero', id: picked.id, duplicate: false });
        }
      } else {
        window.Game.Systems.Hero.grantItem(playerState, picked.id, 1);
        results.push({ kind: 'item', id: picked.id, duplicate: false });
      }
    }
    return { ok: true, draws: results, poolId };
  }

  window.Game.Systems.Gacha = { draw, poolEntries, tickDailyReward, tavernLevel };
})();
