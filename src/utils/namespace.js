/* ============================================================================
 * namespace.js — 全域命名空間骨架。
 *
 * 本專案不使用 ES module（避免 `file://` 通訊協定下的 CORS 限制，維持「手機瀏覽器
 * 直接打開 index.html 即可玩」的需求），也不引入打包工具。取而代之，所有檔案以
 * 傳統 <script> 標籤依相依順序載入，並把自己的輸出「掛」到同一個全域命名空間
 * window.Game 底下的對應分層物件，而不是散落成一堆裸露的全域變數。
 *
 * 分層對應：
 *   Game.Data    — src/data     （靜態資料，遊戲設計表，不隨存檔改變）
 *   Game.Models  — src/models   （動態狀態的型別定義／預設值建構函式／存檔主結構）
 *   Game.Systems — src/systems  （遊戲規則與邏輯，讀寫 Models，之後階段實作）
 *   Game.UI      — src/ui       （畫面渲染與觸控事件綁定，只呼叫 Systems，不內含規則）
 *   Game.Utils   — src/utils    （與遊戲規則無關的通用工具函式）
 *
 * 這個檔案必須在其他 src/* 檔案之前載入。
 * ==========================================================================*/

window.Game = window.Game || {};
window.Game.Data = window.Game.Data || {};
window.Game.Models = window.Game.Models || {};
window.Game.Systems = window.Game.Systems || {};
window.Game.UI = window.Game.UI || {};
window.Game.Utils = window.Game.Utils || {};
