# Main 頁面架構分析

## 目錄結構總覽

```
src/pages/Main/
├── Main.tsx                          # 頁面入口（RWD 判斷）
├── global/
│   └── jotai.ts                      # PadView 專用 Atom 定義
├── 3D/
│   ├── Scene.tsx                     # Three.js 3D 場景（開發中）
│   └── index.ts
├── Car_Card/                         # AMR 卡片模組
│   ├── CardWrap.tsx
│   ├── Cards.tsx
│   ├── Card.tsx
│   ├── TittleTools.tsx
│   ├── car_info.css
│   └── components/
│       ├── InfoWrap.tsx
│       ├── Lists.tsx
│       ├── Tags.tsx
│       ├── BtnGroup.tsx
│       ├── EditCargoCarrier.tsx
│       └── Battery.tsx
├── Mission_Card/                     # 任務卡片模組
│   ├── MissionWrap.tsx
│   ├── TitleTools.tsx
│   ├── Card.tsx                      # 未使用的舊版卡片
│   ├── mission_info.css
│   └── components/
│       ├── MissionTable.tsx
│       ├── MissionHistory.tsx
│       ├── WrapAndLists.tsx
│       └── addonStyle.css
└── components/
    ├── PadViwe/                      # 行動版介面
    │   ├── PadView.tsx
    │   ├── style.css
    │   └── components/
    │       ├── PadSider.tsx
    │       ├── PadContent.tsx
    │       ├── AlarmView/
    │       │   ├── AlarmView.tsx
    │       │   └── WraningTable.tsx
    │       ├── CarAndMissionView/
    │       │   ├── CarList.tsx
    │       │   └── MissionList.tsx
    │       └── PadMapContent/
    │           ├── PadMapContent.tsx
    │           ├── PadMapView.tsx (component/)
    │           ├── component/
    │           │   ├── AllAMRs/
    │           │   │   ├── AllAMRs.tsx
    │           │   │   ├── components/AMR.tsx
    │           │   │   ├── components/Icon.tsx
    │           │   │   └── style.css
    │           │   ├── AllLocation.tsx
    │           │   ├── PadMapView.tsx
    │           │   └── ZomPadAndCloseBtn.tsx
    │           ├── AllCargo/
    │           │   ├── AllCargo.tsx
    │           │   ├── Cargo.tsx
    │           │   ├── CargoDisplay.tsx
    │           │   ├── LoadingStation.tsx
    │           │   ├── index.ts
    │           │   └── types.d.ts
    │           └── AllConveyor/
    │               ├── AllConveyor.tsx
    │               └── ConveyorIcon.tsx
    ├── WebView/                      # 桌面版介面
    │   ├── WebView.tsx
    │   ├── webview.css
    │   └── components/
    │       ├── WebMapView.tsx
    │       ├── ZoomPad.tsx
    │       ├── ScalePad.tsx
    │       ├── MissionBtn.tsx
    │       └── AllChargeStation/
    │           ├── AllChargeStation.tsx
    │           ├── ChargeStationModel.tsx
    │           ├── Station.tsx
    │           └── index.ts
    ├── missionModal/                 # 任務派發 Modal 群
    │   ├── AutoMission.tsx
    │   ├── DialogMission.tsx
    │   ├── InputMission.tsx          # 空殼（未實作）
    │   ├── QuickMissionWebView.tsx
    │   ├── style.css
    │   ├── index.ts
    │   └── CycleMission/
    │       ├── CycleMissionTable.tsx
    │       └── QuickMissiom.tsx
    └── simulateModal/
        ├── SimulationResultsModal.tsx
        └── StartSimModal.tsx
```

---

## 頁面頂層：Main.tsx

```
Main
├── Header
└── isMobile ?
    ├── true  → PadView（行動版）
    └── false → WebView（桌面版）
```

RWD 切換由 `useIsMobile()` hook 決定，完全分離桌面與行動版渲染路徑。

---

## 桌面版：WebView

```
WebView (Ant Design Splitter 三欄)
├── 左欄 (13%)   → CarCardWrap（AMR 卡片列表）
├── 中欄 (67%)   → WebMapView + ZoomPad + ScalePad + MissionBtn
│   └── WebMapView
│       ├── MapImage
│       ├── AllAMRs
│       ├── AllCargo
│       ├── AllConveyor
│       ├── AllLocation（依 isShowLocation 開關）
│       ├── AllRoads（依 isShowRoad 開關）
│       ├── ToolTip（依 isShowLocationTooltip 開關）
│       ├── AllZones
│       ├── AllChargeStation
│       └── ChargeStationModel（可拖曳的充電站狀態面板）
└── 右欄 (20%)   → MissionWrap（任務列表）
```

---

## 行動版：PadView

```
PadView
├── open2DMap = true  → PadMapContent（全螢幕地圖）
│   ├── PadMapView（地圖 + AMR + 貨架 + 路線）
│   ├── CloseBtn
│   └── ZoomPad
└── open2DMap = false → PadSider + PadContent
    ├── PadSider（左側導航 Menu）
    │   ├── 地圖視圖 (ViewBtn.mapView)
    │   ├── 任務視圖 (ViewBtn.missionView)
    │   ├── 資訊視圖 (ViewBtn.infoView)
    │   └── 警報視圖 (ViewBtn.alertView)
    └── PadContent（右側內容區，依 viewBtn 切換）
        ├── showAlertView   → AlarmView
        ├── openCycleMissionList → CycleMissionTable
        ├── openCarCardInfo → CarList → CarCardWrap
        ├── openMissionCardInfo → MissionList → MissionWrap
        └── default         → CardWrap × N（功能卡片）
            ├── map_2D_view  → open2DMap(true)
            ├── map_3D_view  → 開發中（disabled）
            ├── quick_mission → QuickMission Modal
            ├── auto_mission → AutoMission Modal
            ├── new_mission  → DialogMission Modal
            ├── mission_info → openMissionCardInfo(true)
            └── car_info     → openCarCardInfo(true)
```

---

## 地圖層（Map Layers）

地圖由多層疊加組成，渲染順序如下：

| 層次 | 元件 | z-index | 說明 |
|------|------|---------|------|
| 底圖 | `MapImage` | 最低 | 靜態地圖圖片 |
| 地點 | `AllLocation` | 10 | Extra / Dispatch 節點 |
| 貨架 | `AllCargo` | 10 | Storage 節點 + 貨物顯示 |
| 輸送機 | `AllConveyor` | 10 | Conveyor 節點 |
| 充電站 | `AllChargeStation` | 10 | Charging 節點 |
| 道路 | `AllRoads` | - | 路徑線段 |
| 區域 | `AllZones` | - | 禁止區、功能區 |
| AMR | `AllAMRs` | 200000 | 機器人圖示（最高層） |
| 充電站 Modal | `ChargeStationModel` | 1000 | 可拖曳詳細面板 |

---

## 任務派發模組（missionModal）

| 元件 | 功能 | 狀態 |
|------|------|------|
| `DialogMission` | 標準任務（選 AMR + 任務模板 + 優先級） | ✅ 完整 |
| `QuickMission` | 快速任務（PadView，下拉選貨架） | ✅ 完整 |
| `QuickMissionWebView` | 快速任務（WebView，點地圖貨架格子選取） | ✅ 完整 |
| `AutoMission` | 循環任務（加入循環任務清單） | ✅ 完整 |
| `CycleMissionTable` | 循環任務管理（啟動/暫停/刪除） | ⚠️ 資料硬編碼 |
| `InputMission` | 輸入任務 | ❌ 空殼未實作 |

### QuickMissionWebView 選點流程

```
點擊「取貨」/「卸貨」按鈕
    → setStartQuickSetting(true)
    → setQuickSettingMode('load' | 'offload')
    → 地圖上的 CargoDisplay 進入選取模式
    → 點擊貨架格子
    → setLoad / setOffload (Jotai atom)
    → 提交 POST /api/missions/fast-mission
```

---

## Jotai 全域狀態總表

### `src/utils/gloable.ts`（跨模組共用）

| Atom | 型別 | 用途 |
|------|------|------|
| `darkMode` | `boolean` | 深色模式切換 |
| `AmrCarSelectFilter` | `{value,label}[]` | AMR 系列下拉篩選 |
| `AmrFilterCarCard` | `Set<string>` | 地圖點擊 AMR → 高亮卡片 |
| `hintAmr` | `string` | hover 卡片 → 地圖 AMR 提示 |
| `Scale` | `number` | 地圖縮放比例 |
| `showZoneForbidden` | `Set<string>` | 禁止區 AMR 高亮 |
| `tooltipProp` | `object \| null` | 節點 tooltip 座標與 ID |
| `chargeStationModelProp` | `object \| null` | 充電站 Modal 開啟狀態 |

### `src/pages/Main/global/jotai.ts`（PadView 專用）

| Atom | 型別 | 用途 |
|------|------|------|
| `viewBtn` | `ViewBtn` | PadSider 當前選中視圖 |
| `Open2DMap` | `boolean` | 開啟全螢幕 2D 地圖 |
| `Open3DMap` | `boolean` | 開啟 3D 地圖（未實作） |
| `OpenQuickMission` | `boolean` | 快速任務 Modal |
| `OpenAssignMission` | `boolean` | 新建任務 Modal |
| `OpenAutoMission` | `boolean` | 循環任務 Modal |
| `OpenInputMission` | `boolean` | 輸入任務 Modal（未實作） |
| `OpenCarCardInfo` | `boolean` | PadView 顯示 AMR 卡片列表 |
| `OpenMissionCardInfo` | `boolean` | PadView 顯示任務列表 |
| `QuickMissionLoad` | `Quick_Mission \| null` | 快速任務取貨點 |
| `QuickMissionOffload` | `Quick_Mission \| null` | 快速任務卸貨點 |
| `StartQuickMissionSetting` | `boolean` | 是否進入地圖選點模式 |
| `QuickMissionSettingMode` | `'load' \| 'offload' \| null` | 當前選點模式 |

---

## AMR 圖示渲染（Icon.tsx）

### 機型判斷邏輯（硬編碼 amrId 字串）

```
amrId.includes('SW15') → AGV 類型
  - 使用 AGV_WIDTH / AGV_HEIGHT 尺寸
  - 旋轉角度：90 - yaw + 180
  - 無 Fork 腳架

amrId.includes('anfa') → AMR Fork 類型
  - 使用 AMR_FORK_WIDTH / AMR_FORK_HEIGHT 尺寸
  - 顯示 Fork 左右腳架
  - 攜帶貨物時顯示 CargoBox

其他 → AMR Fork 尺寸（預設）
```

### 座標轉換

```
ROS 座標 (pose.x, pose.y)
  → rosCoord2DisplayCoord（地圖原點 + 解析度換算）
  → CSS left / top（像素）

SW15 機型需額外套用旋轉矩陣（agvFormate）修正方向
```

---

## AMR 卡片 ↔ 地圖雙向連動

```
hover 卡片
  → setHintAmr(amrId)         [hintAmr atom]
  → AMR.tsx showTooltip = true → 地圖顯示 Tip 泡泡

點擊地圖 AMR Icon
  → setAmrFilterCarCard(add/remove amrId)  [AmrFilterCarCard atom]
  → Card.tsx hide = !hintAmrId.has(id)     → 其他卡片隱藏
  → AMR Icon needOpacity = true             → 其他 AMR 半透明

點擊 TittleTools 標題（有 filter 時）
  → hintAmrId.clear()                      → 清除所有篩選
```

---

## 貨架系統（AllCargo / CargoDisplay）

```
AllCargo（地圖上所有 Storage 節點）
└── Cargo（單一節點，含多層）
    └── MemoizedCargo（每一層格子）
        └── CargoDisplay
            ├── 顯示：hasCargo（背景色）/ isDisable（X 遮罩）/ isHaveAction（pulse 動畫）
            └── 互動：
                ├── 中鍵點擊 → editColumnMutation（POST /api/amr/update-cargo-info）
                └── 左鍵點擊（選點模式）
                    ├── selectMode === 'load'    且 hasCargo    → setLoad atom
                    └── selectMode === 'offload' 且 !hasCargo   → setOffload atom
```

---

## MissionTable 排序邏輯

任務依以下優先序排列：

```
MISSION_SORT = ['executing', 'assigned', 'pending', 'completed', 'aborting', 'canceled']

同狀態比較規則：
- completed：依 createdAt 降序（最新在前）
- 其他：依 order 升序（派發順序）
```

---

## 充電站 Model（ChargeStationModel）

- 由 `chargeStationModelProp` atom 控制開關
- 使用 `react-draggable` 實現可拖曳
- 從 `useLocation()` 取得充電站詳細資訊（current / error / other 狀態位元）
- 連線失敗時顯示 `NoConnectBlock`（紅色 pulse 動畫）

---

## 潛在改善點

### 🔴 高優先

1. **`CycleMissionTable` 資料硬編碼**
   - `dataSource={test}` 使用假資料，未接入 API，循環任務功能無法實際運作

2. **`InputMission.tsx` 空殼**
   - 元件只回傳 `<></>`，對應的 `OpenInputMission` atom 也永遠不會觸發有效 UI

3. **`MissionBtn.tsx` 循環任務按鈕無動作**
   - `<StyledButton onClick={() => { }}>` 點擊無任何效果，尚未串接 `AutoMission` 或 `CycleMissionTable`

4. **AMR 機型判斷硬編碼**
   - `amrId.includes('SW15')` 與 `amrId.includes('anfa')` 直接寫在渲染邏輯中，新增機型需修改多處程式碼，建議改為設定檔或後端 API 返回機型欄位

### 🟡 中優先

5. **`PadSider` 警報徽章硬編碼**
   - `<Badge count={12}>` 數字硬編碼，應接入 `useWarningId` 或警報數量 API

6. **`AlarmView / WarningTable` 未完整實作**
   - `AlarmView` 顯示硬編碼數字 `123 / 234`
   - `WarningTable` 的資料轉換邏輯被完整注釋掉，`dataSource={[]}` 永遠空白

7. **`ScalePad` 使用 localStorage**
   - `localStorage.getItem('scalePadMinimized')` 在 SSR 環境或隱私模式下可能失敗，建議加入 try-catch

8. **`Mission_Card/Card.tsx` 孤立元件**
   - 舊版 Mission Card 元件（`InfoWrap`, `CardRow1~4`）未被任何地方使用，應移除或補充使用

9. **`WebView` 地圖點擊事件重複清除**
   ```tsx
   setZoneForbidden(new Set()); // 第一次
   setZoneForbidden(new Set()); // 第二次（多餘）
   ```

### 🟢 低優先

10. **`ChargeStationModel` 硬編碼中文**
    - `充電站標號：` 字串未走 i18n，應替換為 `t('charge.station_number')` 等 key

11. **`WarningTable` 未清理的 console.log**
    - `console.log(data)` 遺留在生產程式碼中

12. **`3D/Scene.tsx` 的 `THREE.WebGL` 錯誤**
    - 正確 API 為 `THREE.WebGLRenderer`（詳見 3D Scene 架構分析）