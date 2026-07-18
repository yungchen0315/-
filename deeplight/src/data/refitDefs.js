/* ============================================================================
 * refitDefs.js — 6 項重構升級（企劃書第 6 節），花壓力核心（PC）購買，永久保留。
 * ==========================================================================*/
(function () {
  const REFIT_DEFS = [
    { id: 'f1', name: '快速壓載', cost: 3, desc: '初始下潛速度 2 → 4 m/min', effect: { type: 'startDescentBonus', value: 2 } },
    { id: 'f2', name: '種苗庫', cost: 4, desc: '開局附贈 10 隻燈籠水母', effect: { type: 'startModule', module: 'jelly', value: 10 } },
    { id: 'f3', name: '深眠迴路', cost: 5, desc: '離線收益 x1.25、半速時窗 16h → 40h', effect: { type: 'offlineBoost', mult: 1.25, halfHours: 40 } },
    { id: 'f4', name: '誘光塗層', cost: 6, desc: '點擊生物獎勵 x2', effect: { type: 'clickRewardMult', value: 2 } },
    { id: 'f5', name: '深淵圖譜', cost: 8, desc: '稀有生物出現率 x2', effect: { type: 'rareChanceMult', value: 2 } },
    { id: 'f6', name: '壓力渦輪', cost: 10, desc: '全螢光產量 +50%', effect: { type: 'allProdMult', value: 1.5 } }
  ];

  function refitById(id) { return REFIT_DEFS.find((f) => f.id === id); }

  window.App.Data.REFIT_DEFS = REFIT_DEFS;
  window.App.Data.refitById = refitById;
})();
