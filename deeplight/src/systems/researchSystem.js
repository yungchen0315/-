/* ============================================================================
 * researchSystem.js — 研究樹購買（線性 8 節點，需按順序解鎖，轉生時重置）。
 * ==========================================================================*/
(function () {
  const D = window.App.Data;

  function canBuy(save, id) {
    const idx = D.RESEARCH_DEFS.findIndex((r) => r.id === id);
    if (idx < 0) return { ok: false, reason: '找不到此研究' };
    if (save.research.includes(id)) return { ok: false, reason: '已完成此研究' };
    if (idx > 0 && !save.research.includes(D.RESEARCH_DEFS[idx - 1].id)) return { ok: false, reason: '尚未解鎖，需先完成前一項研究' };
    const def = D.RESEARCH_DEFS[idx];
    if (save.samples < def.cost) return { ok: false, reason: '樣本不足' };
    return { ok: true, def };
  }

  function buy(save, id) {
    const check = canBuy(save, id);
    if (!check.ok) return check;
    save.samples -= check.def.cost;
    save.research.push(id);
    return { ok: true };
  }

  window.App.Systems.Research = { canBuy, buy };
})();
