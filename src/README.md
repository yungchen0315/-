# src/ — 資料模型與分層架構（骨架階段）

這個目錄是《皇者天下》單機版的新基礎架構，目前只完成**資料夾結構、型別定義（JSDoc）與存檔主結構**，尚未接上系統邏輯與畫面渲染。

現有可正常遊玩的版本仍在專案根目錄的 `index.html` / `css/` / `js/`，**完全沒有被這次改動觸碰**。等 `src/systems` 與 `src/ui` 的實作補齊、且確認功能對等後，才會讓 `index.html` 改讀 `src/`，正式取代 `js/`。在那之前兩邊會暫時並存。

## 分層

```
src/
├── data/     靜態資料表（FactionDef、BuildingDef、UnitDef、HeroData、TechnologyDef、
│             MissionDef、ItemDef、EventTypeDef、AchievementDef、地圖設定）。
│             同一份表所有存檔共用，不會因為玩了多久而改變。
│
├── models/   動態狀態的型別定義（JSDoc @typedef）與「建立預設值」的工廠函式：
│             ResourceState、BuildingState、CityState、HeroState、ArmyState、
│             MapState、BattleState、MissionState、TechnologyState、
│             PlayerState、SaveGame。HeroData 的型別文件也放一份在這裡方便查閱，
│             但實際資料仍在 src/data/heroDefs.js（HeroData 本身是靜態資料）。
│
├── systems/  遊戲規則與邏輯：升級判定、戰鬥公式、AI 決策、離線時間追趕等。
│             【目前全部是骨架】——每個檔案只掛了一個空的命名空間物件，
│             實際函式尚未實作，下一階段再依此骨架動工。
│
├── ui/       畫面渲染與觸控事件綁定，只呼叫 systems，不內含任何遊戲規則。
│             【目前全部是骨架】，理由同上。
│
└── utils/    與遊戲規則無關的通用工具（id 產生、時間格式化、數學、DOM 小工具）。
              這一層是唯一已經有真正邏輯的一層，因為工具函式本身就是最終形態，
              不需要等系統實作。
```

## 為什麼不用 ES module 或 TypeScript

延續本專案一貫的限制：**手機瀏覽器直接打開 `index.html` 就要能玩，不需要建置流程、不需要伺服器**。

- 不用 `import`/`export`：`file://` 通訊協定下瀏覽器會擋掉 ES module 的載入（CORS 限制），改用傳統 `<script>` 標籤依相依順序載入。
- 不用 TypeScript：型別檢查改用 JSDoc 註解（`@typedef`），純文件用途，執行期完全是原生 JavaScript，不需要編譯步驟。
- 為了不讓「一堆散落的全域變數」在檔案數變多後互相衝突，所有輸出都掛在同一個全域命名空間 `window.Game` 底下，依分層對應到 `Game.Data` / `Game.Models` / `Game.Systems` / `Game.UI` / `Game.Utils`（定義在 `src/utils/namespace.js`，必須最先載入）。

## 存檔格式

整份存檔就是一個 `SaveGame` 物件（`src/models/SaveGame.js`），可以直接 `JSON.stringify()`／`JSON.parse()`：

```
SaveGame
├── version / createdAt / lastActiveAt / nextAiTickAt / activeScreenId
├── map: MapState                     — 三個勢力共用的世界地圖
└── players: { shu, wei, wu }         — 每個都是一份 PlayerState
    ├── resources: ResourceState
    ├── cities:   { [cityId]: CityState → { buildings: { [type]: BuildingState } } }
    ├── heroes:   { [heroDataId]: HeroState }
    ├── armies:   { [armyId]: ArmyState }
    ├── inventory: { [itemDefId]: number }
    ├── technologies: { [techId]: TechnologyState }
    ├── missions:     { [missionId]: MissionState }
    ├── battleLog: BattleState[]
    ├── pendingEvents: PendingEventState[]
    └── unlockedAchievementIds: string[]
```

所有長時間機制（建造／練兵／研究／行軍／事件）延續舊版的絕對時間戳設計：只存
`startAt`/`completeAt`/`arriveAt` 等 epoch 毫秒數，離線進度追趕只需要比較
「現在」與這些時間戳，不需要另外模擬經過的每一步。

## 設計上刻意做的取捨（供下一階段實作參考）

- **BuildingState 各自帶自己的 `upgrade` 欄位**，而不是像舊版一樣整個城池共用一個全域升級鎖——「同時只能升一棟」是遊戲規則，規則會變，資料形狀不該預先幫規則卡死。
- **成就（AchievementDef）與事件（EventTypeDef）的判斷/結算條件改成宣告式資料**（例如 `condition: { type: 'buildingLevel', building: 'capital', atLeast: 5 }`），而不是像舊版把 `check`/`resolve` 函式直接寫在資料表裡——資料層只放資料，邏輯留給 `src/systems`。
- **CityState 是字典而非單一物件**，即使 MVP 階段每個勢力永遠只有一座城，未來要開放多城池也不需要更動存檔結構。
- **PlayerState.technologies / .missions 在新遊戲時就把所有項目鋪好、狀態預設為 `locked`**，而不是只存「已完成」清單——由 `technologySystem` / `missionSystem` 的 `refreshXxxStatuses()` 依條件即時翻成 `available`，畫面不需要另外查表推導哪些「可能快解鎖了」。

## 下一階段

依 `src/systems/*.js` 檔案開頭的規劃註解逐一實作邏輯（對照舊版 `js/` 對應的檔案），
再實作 `src/ui/*.js` 畫面渲染，最後才讓 `index.html` 切換過來、退役 `js/`。
