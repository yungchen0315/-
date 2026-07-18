/* ============================================================================
 * moduleDefs.js — 6 種發光模組（企劃書第 4b 節）。cost(n) 與升級節點的計算
 * 交給 armySystem 等價的 economySystem，這裡只放靜態資料。
 * ==========================================================================*/
(function () {
  const MODULE_DEFS = [
    { id: 'jelly', name: '燈籠水母', icon: 'mod_jelly', baseCost: 15, baseProd: 0.1, unlockDepth: 0 },
    { id: 'moss', name: '光苔板', icon: 'mod_moss', baseCost: 100, baseProd: 1, unlockDepth: 0 },
    { id: 'buoy', name: '迴聲浮標', icon: 'mod_buoy', baseCost: 1100, baseProd: 8, unlockDepth: 100 },
    { id: 'coral', name: '螢光珊瑚架', icon: 'mod_coral', baseCost: 12000, baseProd: 47, unlockDepth: 250 },
    { id: 'vent', name: '熱泉導管', icon: 'mod_vent', baseCost: 130000, baseProd: 260, unlockDepth: 700 },
    { id: 'whalefall', name: '鯨落生態圈', icon: 'mod_whalefall', baseCost: 1400000, baseProd: 1400, unlockDepth: 1200 }
  ];

  function moduleById(id) { return MODULE_DEFS.find((m) => m.id === id); }

  window.App.Data.MODULE_DEFS = MODULE_DEFS;
  window.App.Data.moduleById = moduleById;
})();
