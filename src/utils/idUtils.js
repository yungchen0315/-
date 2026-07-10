/* ============================================================================
 * idUtils.js — 識別碼產生。與遊戲規則無關的通用工具。
 * ==========================================================================*/

(function () {
  let counter = 0;

  /**
   * 產生一個在單次執行期間唯一的識別碼。存檔還原後計數器會重置，
   * 但因為每個 id 都帶有隨機片段，實務上不會與存檔內已存在的 id 相撞。
   * @param {string} [prefix] 識別碼前綴，方便除錯時辨識來源（例如 'army'、'battle'）。
   * @returns {string}
   */
  function generateId(prefix) {
    counter += 1;
    const random = Math.floor(Math.random() * 1e6);
    return (prefix || 'id') + '_' + counter + '_' + random;
  }

  window.Game.Utils.generateId = generateId;
})();
