/* ============================================================================
 * technologySystem.js — 科技研究規則。對應舊版 js/research.js。
 * 研究佇列不需要獨立資料結構：任何一筆 TechnologyState.status === 'researching'
 * 本身就代表「目前在研究的項目」，「同時只能研究一項」由這裡的 canQueueResearch 強制。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const U = window.Game.Utils;

  function isResearching(playerState) {
    return Object.values(playerState.technologies).some((t) => t.status === 'researching');
  }

  function techUnlocked(playerState, techDef) {
    return techDef.requires.every((r) => playerState.technologies[r].status === 'completed');
  }

  /** 依所有城池中最高的學院解鎖 tier。 */
  function maxAvailableTier(playerState) {
    return window.Game.Systems.Economy.computeEffects(playerState).maxAcademyTier;
  }

  /** @param {PlayerState} playerState @returns {TechnologyDef[]} */
  function availableTechnologies(playerState) {
    const tier = maxAvailableTier(playerState);
    return D.TECHNOLOGY_DEFS.filter((t) =>
      t.tier <= tier &&
      playerState.technologies[t.id].status !== 'completed' &&
      techUnlocked(playerState, t));
  }

  function canQueueResearch(playerState, technologyDefId) {
    const techDef = D.technologyDefById(technologyDefId);
    if (!techDef) return { ok: false, reason: '未知科技' };
    const state = playerState.technologies[technologyDefId];
    if (state.status === 'completed') return { ok: false, reason: '已研究完成' };
    if (isResearching(playerState)) return { ok: false, reason: '同時只能研究一項科技' };
    if (!techUnlocked(playerState, techDef)) return { ok: false, reason: '尚未滿足前置科技條件' };
    if (techDef.tier > maxAvailableTier(playerState)) return { ok: false, reason: '學院等級不足' };
    if (!U.canAfford(playerState.resources, techDef.cost)) return { ok: false, reason: '資源不足' };
    return { ok: true, techDef };
  }

  function queueResearch(playerState, technologyDefId, now) {
    const check = canQueueResearch(playerState, technologyDefId);
    if (!check.ok) return check;
    U.subtractResources(playerState.resources, check.techDef.cost);
    const eff = window.Game.Systems.Economy.computeEffects(playerState);
    const timeMs = Math.round(check.techDef.timeMs / (eff.researchSpeedMul || 1));
    const state = playerState.technologies[technologyDefId];
    state.status = 'researching';
    state.startedAt = now;
    state.completeAt = now + timeMs;
    return { ok: true };
  }

  function resolveResearch(playerState, now) {
    Object.values(playerState.technologies).forEach((state) => {
      if (state.status === 'researching' && now >= state.completeAt) {
        state.status = 'completed';
      }
    });
  }

  window.Game.Systems.Technology = {
    isResearching, techUnlocked, maxAvailableTier, availableTechnologies,
    canQueueResearch, queueResearch, resolveResearch
  };
})();
