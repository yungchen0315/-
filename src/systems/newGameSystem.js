/* ============================================================================
 * newGameSystem.js — 開新遊戲的初始化：生成地圖、放置各勢力主城，
 * 並給玩家一位起始武將與一支起始部隊，避免開局無將可用、無兵可派。
 * 沒有對應到舊版單一檔案，相當於舊版 js/state.js createNewGame() 的職責。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const M = window.Game.Models;

  /** 各勢力的起始武將：蜀漢無合適的「開國者」武將可用（劉備本身未作為可操作武將），
   * 改以其最著名的大將趙雲代替；魏、吳則直接以各自的開國之主曹操、孫權起始。 */
  const STARTER_HERO_BY_FACTION = { shu: 'zhaoyun', wei: 'caocao', wu: 'sunquan' };

  /**
   * @param {string} [humanFactionId] 玩家選擇操控的勢力 id，預設 'shu'（相容舊行為）。
   * @returns {SaveGame}
   */
  function createNewGame(humanFactionId) {
    const now = window.Game.Utils.now();
    const saveGame = M.createEmptySaveGame(now);

    const humanId = D.factionDefById(humanFactionId) ? humanFactionId : 'shu';
    D.FACTION_DEFS.forEach((f) => { saveGame.players[f.id].isHuman = (f.id === humanId); });

    const capitalByFaction = window.Game.Systems.Map.generateMap(saveGame.map, D.FACTION_DEFS);

    D.FACTION_DEFS.forEach((f) => {
      const playerState = saveGame.players[f.id];
      const spot = capitalByFaction[f.id];
      const city = M.createCityState('city_' + f.id, f.id, f.name + '主城', spot.x, spot.y, now);
      city.buildings.capital.level = 1;
      city.buildings.granary.level = 1;
      city.buildings.sawmill.level = 1;
      city.buildings.quarry.level = 1;
      city.buildings.barracks.level = 1;
      playerState.cities[city.id] = city;
    });

    const humanPlayer = saveGame.players[humanId];
    window.Game.Systems.Mission.refreshMissionStatuses(humanPlayer);

    const starterHeroId = STARTER_HERO_BY_FACTION[humanId];
    humanPlayer.heroes[starterHeroId] = M.createHeroState(starterHeroId);
    const starterArmy = M.createArmyState(humanId, '主力部隊', { infantry: 10 });
    starterArmy.heroStateId = starterHeroId;
    humanPlayer.armies[starterArmy.id] = starterArmy;
    humanPlayer.heroes[starterHeroId].assignedArmyId = starterArmy.id;

    return saveGame;
  }

  window.Game.Systems.NewGame = { createNewGame };
})();
