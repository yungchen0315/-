/* ============================================================================
 * HeroData.js — 型別參照文件。
 *
 * HeroData 是「武將」的靜態設定（姓名、勢力、基礎數值、技能、取得方式），
 * 對所有存檔都一樣，因此實際的資料表放在 src/data/heroDefs.js
 * （window.Game.Data.HERO_DEFS / heroDefById）而不是這裡。
 *
 * 這個檔案單純把型別定義留在 src/models 底下，方便日後開發時查閱
 * 「動態的 HeroState 引用的 HeroData 長什麼樣子」，本身不建立任何執行期物件。
 *
 * @typedef {Object} HeroData
 * @property {string} id
 * @property {string} name
 * @property {string} factionId
 * @property {number} rarity
 * @property {{force:number, cmd:number, intel:number}} baseStats
 * @property {number} growth
 * @property {{name:string, desc:string}} skill
 * @property {{type:'story'|'explore', missionId?:string, tileTag?:string}} source
 * @property {string} portraitColor
 *
 * @see src/data/heroDefs.js
 * ==========================================================================*/
