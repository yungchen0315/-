/* ============================================================================
 * tacticDefs.js — 戰法靜態資料（率土之濱式的「戰法」系統）。
 *
 * 除了武將自帶的招牌技能之外，玩家還能把「已擁有武將的招牌戰法」傳授（裝配）到
 * 其他武將身上，讓技能效果能跨武將重新分配、疊加，配隊 build 的深度大幅提升
 * （例如把諸葛亮的「奇謀」戰法裝到另一名主將身上，讓兩人的掠奪加成疊起來）。
 *
 * 這裡的戰法直接取材自各武將的招牌技能（heroDefs 的 skill），因此戰法的實際
 * 戰鬥效果（effects）與武將名錄上看到的效果完全是同一份資料，不會出現「戰法說明
 * 寫的效果」跟「實際套用的效果」對不起來的情況。每位武將對應一個戰法，來源武將
 * 記在 sourceHeroId；一名武將的招牌戰法只有「一份」，同時只能裝配在一名其他武將身上。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} TacticDef
   * @property {string} id 格式為 'tactic_' + 來源武將 id。
   * @property {string} name 戰法名稱（同來源武將的招牌技能名）。
   * @property {string} desc 風味描述。
   * @property {import('./heroDefs').HeroSkillEffect[]} effects 實際套用到戰鬥公式的數值效果。
   * @property {string} sourceHeroId 此戰法源自哪位武將（HeroData.id）。
   * @property {number} rarity 沿用來源武將稀有度，供 UI 排序／顯示。
   */

  /** @type {TacticDef[]} */
  const TACTIC_DEFS = window.Game.Data.HERO_DEFS.map(function (h) {
    return {
      id: 'tactic_' + h.id,
      name: h.skill.name,
      desc: h.skill.desc,
      effects: h.skill.effects,
      sourceHeroId: h.id,
      rarity: h.rarity
    };
  });

  const TACTIC_BY_ID = {};
  TACTIC_DEFS.forEach(function (t) { TACTIC_BY_ID[t.id] = t; });

  function tacticDefById(id) { return TACTIC_BY_ID[id]; }
  function tacticIdForHero(heroId) { return 'tactic_' + heroId; }

  window.Game.Data.TACTIC_DEFS = TACTIC_DEFS;
  window.Game.Data.tacticDefById = tacticDefById;
  window.Game.Data.tacticIdForHero = tacticIdForHero;
})();
