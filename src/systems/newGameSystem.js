/* ============================================================================
 * newGameSystem.js — 開新遊戲的初始化：生成地圖、放置各勢力主城，
 * 並給玩家一位起始武將與一支起始部隊，避免開局無將可用、無兵可派。
 * 沒有對應到舊版單一檔案，相當於舊版 js/state.js createNewGame() 的職責。
 * ==========================================================================*/

(function () {
  const D = window.Game.Data;
  const M = window.Game.Models;

  /** 各勢力的起始武將，皆為該勢力的開國之主：蜀＝劉備、魏＝曹操、吳＝孫權。
   * 趙雲改為酒館招募（抽獎）取得，不再是開局即送的固定武將。 */
  const STARTER_HERO_BY_FACTION = { shu: 'liubei', wei: 'caocao', wu: 'sunquan' };

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
      const capitalTile = window.Game.Systems.Map.tileAt(saveGame.map, spot.x, spot.y);
      const city = M.createCityState('city_' + f.id, f.id, capitalTile.name, spot.x, spot.y, now);
      city.buildings.capital.level = 1;
      city.buildings.warehouse.level = 1;
      city.buildings.barracks.level = 1;
      playerState.cities[city.id] = city;
    });

    // 每個勢力（不只人類玩家）都要有自己的起始主將領軍的起始部隊——部隊出征需要
    // 主將帶隊（統率決定帶兵上限），AI 勢力沒有主將的話就永遠出不了兵、形同停擺。
    D.FACTION_DEFS.forEach((f) => {
      const playerState = saveGame.players[f.id];
      const starterHeroId = STARTER_HERO_BY_FACTION[f.id];
      if (!starterHeroId) return;
      playerState.heroes[starterHeroId] = M.createHeroState(starterHeroId);
      const starterArmy = M.createArmyState(f.id, '主力部隊', { infantry: 10 });
      starterArmy.heroStateId = starterHeroId;
      playerState.armies[starterArmy.id] = starterArmy;
      playerState.heroes[starterHeroId].assignedArmyId = starterArmy.id;
    });

    const humanPlayer = saveGame.players[humanId];
    window.Game.Systems.Mission.refreshMissionStatuses(humanPlayer);

    // 開局贈送幾個基礎獨立戰法，讓玩家一開始就能體驗戰法搭配（其餘靠擊破據點掉落習得）。
    humanPlayer.learnedTactics = ['st_fenzhan', 'st_tiebi', 'st_taolue', 'st_lueduo'];

    return saveGame;
  }

  /**
   * 存檔相容用：補救「舊存檔建立時 AI 勢力沒有起始主將」的狀況——部隊出征現在
   * 需要主將帶隊，沒有主將的勢力會永遠出不了兵。只在該勢力完全沒有任何武將時
   * 補發起始主將並指派到其駐守部隊（沒有駐守部隊就順手建立一支）。
   * @param {PlayerState} playerState
   */
  function grantStarterHeroIfMissing(playerState) {
    const starterHeroId = STARTER_HERO_BY_FACTION[playerState.factionId];
    if (!starterHeroId || Object.keys(playerState.heroes).length > 0) return;
    playerState.heroes[starterHeroId] = M.createHeroState(starterHeroId);
    const home = window.Game.Systems.Army.getOrCreateHomeArmy(playerState);
    if (!home.heroStateId) home.heroStateId = starterHeroId;
    playerState.heroes[starterHeroId].assignedArmyId = home.id;
  }

  window.Game.Systems.NewGame = { createNewGame, grantStarterHeroIfMissing };
})();
