/* ============================================================================
 * economySystem.js — 螢光產出、模組成本／升級、壓載成本、研究＋重構效果彙總。
 * 對應企劃書第 3、4b、4c 節公式，所有數值常數來自 data/balance.js。
 * ==========================================================================*/
(function () {
  const D = window.App.Data;
  const B = D.BALANCE;

  /** 彙總所有已完成研究＋已購重構的效果，供 glowPerSec／descentRate 等共用。 */
  function computeEffects(save) {
    const eff = {
      allProdMult: 1,
      moduleMult: {},
      spawnIntervalMult: 1,
      clickRewardMult: 1,
      descentMult: 1,
      offlineFullHours: B.OFFLINE_FULL_HOURS,
      offlineHalfHours: B.OFFLINE_HALF_HOURS,
      offlineMult: 1,
      rareChanceMult: 1,
      startDescentBonus: 0,
      startModules: {}
    };
    function apply(e) {
      if (!e) return;
      switch (e.type) {
        case 'allProdMult': eff.allProdMult *= e.value; break;
        case 'moduleMult': eff.moduleMult[e.module] = (eff.moduleMult[e.module] || 1) * e.value; break;
        case 'moduleMultMany': e.modules.forEach((m) => { eff.moduleMult[m] = (eff.moduleMult[m] || 1) * e.value; }); break;
        case 'spawnIntervalMult': eff.spawnIntervalMult *= e.value; break;
        case 'clickRewardMult': eff.clickRewardMult *= e.value; break;
        case 'descentMult': eff.descentMult *= e.value; break;
        case 'offlineFullHours': eff.offlineFullHours = Math.max(eff.offlineFullHours, e.value); break;
        case 'offlineBoost': eff.offlineMult *= e.mult; eff.offlineHalfHours = Math.max(eff.offlineHalfHours, e.halfHours); break;
        case 'rareChanceMult': eff.rareChanceMult *= e.value; break;
        case 'startDescentBonus': eff.startDescentBonus += e.value; break;
        case 'startModule': eff.startModules[e.module] = (eff.startModules[e.module] || 0) + e.value; break;
        default: break;
      }
    }
    (save.research || []).forEach((id) => { const r = D.researchById(id); if (r) apply(r.effect); });
    (save.refits || []).forEach((id) => { const f = D.refitById(id); if (f) apply(f.effect); });
    eff.allProdMult *= 1 + (save.cores || 0) * B.CORE_PRODUCTION_BONUS_PCT / 100;
    // 深淵圖鑑每記錄一種生物 +2% 全螢光產量，永久保留、跨轉生不重置（企劃書第 6 節）。
    const bestiaryCount = Object.keys(save.bestiary || {}).length;
    eff.allProdMult *= 1 + bestiaryCount * B.BESTIARY_PROD_BONUS_PCT / 100;
    return eff;
  }

  /** 單一模組目前每單位的產量（含升級倍率與研究倍率），不含海域倍率／全域倍率。 */
  function moduleUnitProd(save, eff, moduleId) {
    const def = D.moduleById(moduleId);
    if (!def) return 0;
    const state = save.modules[moduleId];
    const tier = (state && state.upgradeTier) || 0;
    const tierMult = Math.pow(B.MODULE_UPGRADE_PROD_MULT, tier);
    const researchMult = eff.moduleMult[moduleId] || 1;
    return def.baseProd * tierMult * researchMult;
  }

  /** 全勢力（其實只有玩家一份）每秒螢光產出：Σ(模組單位產量×持有數) × 海域倍率 × 全域倍率。 */
  function glowPerSec(save) {
    const eff = computeEffects(save);
    const zone = D.zoneById(save.currentZone) || D.ZONE_DEFS[0];
    let total = 0;
    D.MODULE_DEFS.forEach((def) => {
      const state = save.modules[def.id];
      if (!state || state.count <= 0) return;
      total += moduleUnitProd(save, eff, def.id) * state.count;
    });
    return total * zone.mult * eff.allProdMult;
  }

  function moduleCost(save, moduleId) {
    const def = D.moduleById(moduleId);
    const count = (save.modules[moduleId] || { count: 0 }).count;
    return Math.round(def.baseCost * Math.pow(B.MODULE_COST_GROWTH, count));
  }

  /** 該模組下一個尚未購買的升級節點資訊；還沒解鎖門檻或已買滿三階時回傳 null。 */
  function moduleUpgradeInfo(save, moduleId) {
    const def = D.moduleById(moduleId);
    const state = save.modules[moduleId] || { count: 0, upgradeTier: 0 };
    const tier = state.upgradeTier || 0;
    if (tier >= B.MODULE_UPGRADE_THRESHOLDS.length) return null;
    const threshold = B.MODULE_UPGRADE_THRESHOLDS[tier];
    const cost = Math.round(def.baseCost * B.MODULE_UPGRADE_COST_MULTIPLIERS[tier]);
    return { tier, threshold, cost, unlocked: state.count >= threshold };
  }

  function buyModule(save, moduleId) {
    const cost = moduleCost(save, moduleId);
    if (save.glow < cost) return { ok: false, reason: '螢光不足' };
    save.glow -= cost;
    if (!save.modules[moduleId]) save.modules[moduleId] = { count: 0, upgradeTier: 0 };
    save.modules[moduleId].count += 1;
    return { ok: true };
  }

  function buyModuleUpgrade(save, moduleId) {
    const info = moduleUpgradeInfo(save, moduleId);
    if (!info || !info.unlocked) return { ok: false, reason: '尚未解鎖此升級' };
    if (save.glow < info.cost) return { ok: false, reason: '螢光不足' };
    save.glow -= info.cost;
    save.modules[moduleId].upgradeTier = info.tier + 1;
    return { ok: true };
  }

  function ballastCost(save) {
    if (save.ballastLevel >= B.BALLAST_MAX_LEVEL) return null;
    return Math.round(B.BALLAST_BASE_COST * Math.pow(B.BALLAST_COST_GROWTH, save.ballastLevel));
  }

  function buyBallast(save) {
    const cost = ballastCost(save);
    if (cost === null) return { ok: false, reason: '已達最高等級' };
    if (save.glow < cost) return { ok: false, reason: '螢光不足' };
    save.glow -= cost;
    save.ballastLevel += 1;
    return { ok: true };
  }

  function descentRate(save) {
    const eff = computeEffects(save);
    const base = B.BALLAST_BASE_RATE + B.BALLAST_RATE_PER_LEVEL * save.ballastLevel + eff.startDescentBonus;
    return base * eff.descentMult;
  }

  window.App.Systems.Economy = {
    computeEffects, moduleUnitProd, glowPerSec, moduleCost, moduleUpgradeInfo,
    buyModule, buyModuleUpgrade, ballastCost, buyBallast, descentRate
  };
})();
