/* ============================================================================
 * HeroState.js — 單一武將「這個玩家擁有的那份」動態狀態。
 * 對應的靜態設定（基礎數值、技能、取得方式）是 HeroData（src/data/heroDefs.js），
 * 不重複存在這裡。
 * ==========================================================================*/

(function () {
  /**
   * @typedef {Object} HeroEquipmentSlots
   * @property {string|null} weapon ItemDef id 或 null。
   * @property {string|null} armor
   * @property {string|null} mount
   * @property {string|null} accessory
   */

  /**
   * @typedef {Object} HeroState
   * @property {string} heroDataId 對應的 HeroData.id。
   * @property {number} level
   * @property {number} exp 目前等級累積的經驗值。
   * @property {HeroEquipmentSlots} equipment
   * @property {string|null} assignedArmyId 目前領軍的 ArmyState id，沒有則為 null。
   */

  /**
   * @param {string} heroDataId
   * @returns {HeroState}
   */
  function createHeroState(heroDataId) {
    return {
      heroDataId,
      level: 1,
      exp: 0,
      equipment: { weapon: null, armor: null, mount: null, accessory: null },
      assignedArmyId: null
    };
  }

  window.Game.Models.createHeroState = createHeroState;
})();
