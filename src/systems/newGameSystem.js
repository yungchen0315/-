/* ============================================================================
 * newGameSystem.js — 開新遊戲的初始化：生成地圖、放置各勢力主城，
 * 並給玩家一位起始武將與一支起始部隊，避免開局無將可用、無兵可派。
 * 沒有對應到舊版單一檔案，相當於舊版 js/state.js createNewGame() 的職責。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const M = window.Game.Models;

  /** @returns {SaveGame} */
  function createNewGame() {
    const now = window.Game.Utils.now();
    const saveGame = M.createEmptySaveGame(now);

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

    window.Game.Systems.Mission.refreshMissionStatuses(saveGame.players.shu);

    const humanPlayer = saveGame.players.shu;
    humanPlayer.heroes.zhaoyun = M.createHeroState('zhaoyun');
    const starterArmy = M.createArmyState('shu', '主力部隊', { infantry: 10 });
    starterArmy.heroStateId = 'zhaoyun';
    humanPlayer.armies[starterArmy.id] = starterArmy;
    humanPlayer.heroes.zhaoyun.assignedArmyId = starterArmy.id;

    return saveGame;
  }

  window.Game.Systems.NewGame = { createNewGame };
})();
