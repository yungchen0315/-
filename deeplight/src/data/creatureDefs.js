/* ============================================================================
 * creatureDefs.js — 12 種深淵圖鑑生物（企劃書第 8 節 sprite 清單 13~24）。
 * 每海域 4 種，各含 1 稀有種。首次遇見必掉樣本，之後依 balance 機率掉落。
 * ==========================================================================*/
(function () {
  const CREATURE_DEFS = [
    // 透光帶
    { id: 'moonjelly', name: '月水母', icon: 'c_moonjelly', zone: 0, rare: false },
    { id: 'sardine', name: '沙丁魚群', icon: 'c_sardine', zone: 0, rare: false },
    { id: 'turtle', name: '海龜', icon: 'c_turtle', zone: 0, rare: false },
    { id: 'sunfish', name: '翻車魚', icon: 'c_sunfish', zone: 0, rare: true },
    // 暮光帶
    { id: 'hatchet', name: '斧頭魚', icon: 'c_hatchet', zone: 1, rare: false },
    { id: 'krill', name: '磷蝦雲', icon: 'c_krill', zone: 1, rare: false },
    { id: 'siphon', name: '管水母', icon: 'c_siphon', zone: 1, rare: false },
    { id: 'vampsquid', name: '吸血鬼烏賊', icon: 'c_vampsquid', zone: 1, rare: true },
    // 午夜帶
    { id: 'angler', name: '鮟鱇魚', icon: 'c_angler', zone: 2, rare: false },
    { id: 'gulper', name: '吞噬鰻', icon: 'c_gulper', zone: 2, rare: false },
    { id: 'isopod', name: '大王具足蟲', icon: 'c_isopod', zone: 2, rare: false },
    { id: 'barreleye', name: '桶眼魚', icon: 'c_barreleye', zone: 2, rare: true }
  ];

  function creatureById(id) { return CREATURE_DEFS.find((c) => c.id === id); }
  function creaturesForZone(zoneId) { return CREATURE_DEFS.filter((c) => c.zone === zoneId); }

  window.App.Data.CREATURE_DEFS = CREATURE_DEFS;
  window.App.Data.creatureById = creatureById;
  window.App.Data.creaturesForZone = creaturesForZone;
})();
