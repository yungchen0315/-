/* ============================================================================
 * achievementDefs.js — 6 個成就（企劃書第 7 節），其中 2 個掉深海珍珠。
 * condition(state) 由 achievementSystem 呼叫；state 是完整 SaveGame。
 * ==========================================================================*/
(function () {
  const ACHIEVEMENT_DEFS = [
    { id: 'first_module', name: '第一盞燈', desc: '購買任一發光模組', pearl: 0,
      condition: (s) => Object.keys(s.modules).some((k) => s.modules[k].count > 0) },
    { id: 'first_creature', name: '初次相遇', desc: '記錄第一種深淵生物', pearl: 0,
      condition: (s) => Object.keys(s.bestiary).length >= 1 },
    { id: 'depth_200', name: '透光帶盡頭', desc: '下潛至 200 公尺', pearl: 0,
      condition: (s) => s.maxDepthEver >= 200 },
    { id: 'depth_1000', name: '永夜降臨', desc: '下潛至 1000 公尺', pearl: 1,
      condition: (s) => s.maxDepthEver >= 1000 },
    { id: 'first_prestige', name: '重返海面', desc: '完成第一次轉生', pearl: 1,
      condition: (s) => s.prestigeCount >= 1 },
    { id: 'bestiary_8', name: '博物學家', desc: '深淵圖鑑集滿 8 種', pearl: 0,
      condition: (s) => Object.keys(s.bestiary).length >= 8 }
  ];

  window.App.Data.ACHIEVEMENT_DEFS = ACHIEVEMENT_DEFS;
})();
