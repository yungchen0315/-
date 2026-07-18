/* ============================================================================
 * researchDefs.js — 8 節研究（企劃書第 4d 節），花樣本（SP）購買，轉生時重置。
 * effect 是給 researchSystem/economySystem 讀的通用格式，跟 refitDefs.js 共用。
 * ==========================================================================*/
(function () {
  const RESEARCH_DEFS = [
    { id: 'r1', name: '螢光濃縮', cost: 3, desc: '全螢光產量 +25%', effect: { type: 'allProdMult', value: 1.25 } },
    { id: 'r2', name: '水母共生', cost: 5, desc: '燈籠水母產量 x2', effect: { type: 'moduleMult', module: 'jelly', value: 2 } },
    { id: 'r3', name: '聲納誘餌', cost: 8, desc: '路過生物出現間隔 -25%', effect: { type: 'spawnIntervalMult', value: 0.75 } },
    { id: 'r4', name: '樣本離心機', cost: 10, desc: '點擊生物獎勵 x2', effect: { type: 'clickRewardMult', value: 2 } },
    { id: 'r5', name: '壓載優化', cost: 14, desc: '下潛速度 x1.5', effect: { type: 'descentMult', value: 1.5 } },
    { id: 'r6', name: '休眠模式', cost: 18, desc: '離線全速時窗 8h → 12h', effect: { type: 'offlineFullHours', value: 12 } },
    { id: 'r7', name: '苔壁增生', cost: 24, desc: '光苔板與珊瑚架產量 x2', effect: { type: 'moduleMultMany', modules: ['moss', 'coral'], value: 2 } },
    { id: 'r8', name: '深壓透鏡', cost: 30, desc: '全螢光產量 +50%', effect: { type: 'allProdMult', value: 1.5 } }
  ];

  function researchById(id) { return RESEARCH_DEFS.find((r) => r.id === id); }

  window.App.Data.RESEARCH_DEFS = RESEARCH_DEFS;
  window.App.Data.researchById = researchById;
})();
