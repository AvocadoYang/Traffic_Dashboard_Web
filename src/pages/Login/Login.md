# Login 元件技術文件

## 概覽

`Login.tsx` 是倉庫管理系統（WMS）的登入頁面元件，使用 React + styled-components + Ant Design 實作。

---

## 技術棧

| 技術 | 用途 |
|------|------|
| React | UI 框架 |
| styled-components | CSS-in-JS 樣式管理 |
| Ant Design | UI 元件庫（Form、Input、Tooltip、Space） |
| @tanstack/react-query | 非同步狀態管理（useMutation） |
| react-router-dom | 登入成功後導頁 |
| react-i18next | 多語系（成功訊息） |

---

## 元件結構

```
Login
├── BackgroundContainer        // 全螢幕背景圖 + 遮罩
│   └── LoginCard              // 登入卡片容器
│       ├── LoginHeader        // 標題區塊
│       │   ├── LoginTitle         // "LOGIN"
│       │   └── SystemLabel        // "Warehouse Management System"
│       ├── StyledForm         // Ant Design Form（覆寫樣式）
│       │   ├── Form.Item USERNAME
│       │   │   └── Input prefix={<UserOutlined />}
│       │   ├── Form.Item PASSWORD
│       │   │   └── Input.Password prefix={<LockOutlined />}
│       │   ├── Tooltip
│       │   │   └── ForgotLink     // 忘記密碼
│       │   └── Form.Item
│       │       └── LoginButton    // 送出按鈕
│       └── StatusBar          // 底部狀態列
│           ├── StatusDot          // 系統狀態指示燈
│           └── StatusText         // "System Online" / 版本號
```

---

## Styled Components

### `BackgroundContainer`

全螢幕背景容器，採 Mobile-first RWD。

| 屬性 | 手機（預設） | ≥ 768px |
|------|------------|---------|
| `justify-content` | `center` | `flex-end` |
| `padding` | `20px` | `40px` |

`::before` 偽元素加上黑色漸層遮罩（`inset: 0`），提高背景圖對比度。

```css
/* 預設：手機 */
justify-content: center;
padding: 20px;

/* 768px 以上覆寫 */
@media (min-width: 768px) {
  justify-content: flex-end;
  padding: 40px;
}
```

---

### `LoginCard`

登入表單容器，具毛玻璃效果。

| 屬性 | 值 |
|------|----|
| `background` | `rgba(255, 255, 255, 0.95)` |
| `backdrop-filter` | `blur(10px)` |
| `border-left` | `4px solid blue`（品牌強調線） |
| `max-width` | `480px`（手機為 `100%`） |
| `box-shadow` | `0 8px 32px rgba(0, 0, 0, 0.2)` |

---

### `StyledForm`

覆寫 Ant Design 表單樣式。

**選擇器層級：**

```
StyledForm
├── .ant-form-item-label > label      // 欄位標籤（titleSizes.small）
├── .ant-input / .ant-input-password  // 一般輸入框（bodySizes.large）
│   ├── &:hover                        // border-color: blue
│   └── &:focus                        // border-color: blue + box-shadow
├── ::placeholder                      // placeholder 文字（bodySizes.medium）
├── .ant-input-affix-wrapper           // prefix/suffix 包覆層
│   ├── &:hover
│   ├── &.ant-input-affix-wrapper-focused
│   └── .ant-input                     // 內層 input（清除預設 border）
└── .ant-input-prefix                  // 圖示區域
```

> **注意：** 帶有 `prefix` 的 Input 會被 Ant Design 自動包在 `.ant-input-affix-wrapper` 內。需同時覆寫外層邊框與內層 `border: none`，避免雙重邊框出現。

---

### `StatusDot`

系統在線指示燈，透過 `$active` prop 控制顏色與動畫。

```tsx
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
`;

${({ $active }) =>
  $active &&
  css`
    animation: ${pulse} 2s infinite;
  `}
```

---

## API 串接

### Endpoint

```
POST /api/logInAndOut/login
```

### Request Payload

```typescript
{
  username: string;
  password: string;
}
```

### Response 處理

| 狀況 | 行為 |
|------|------|
| 成功 | `token` 存入 `localStorage`，`navigate("/", { replace: true })` |
| 失敗 | 顯示後端回傳的 `error.response.data.message` |

### 按鈕狀態

| `isPending` | 按鈕文字 |
|-------------|---------|
| `false` | `LOGIN` |
| `true` | `AUTHENTICATING...`（含 loading spinner） |

---

## 樣式依賴

來自 `@/styles/variables`：

| Token | 使用位置 |
|-------|---------|
| `font.color.blue` | 邊框、標題、focus、按鈕背景 |
| `font.color.gray` | 標籤、SystemLabel |
| `font.color.green` | StatusDot 啟用色 |
| `font.color.white_1` | 按鈕文字 |
| `font.color.white_2` | 卡片邊框、input 預設邊框、StatusDot 停用色 |
| `font.color.border_gray_1` | prefix 圖示、StatusText |
| `font.color.border_gray_2` | StatusBar 上邊框 |
| `font.fontFamily.en` | LoginCard 字型繼承來源 |
| `font.size.xl` | prefix 圖示大小 |

來自 `@/styles/mixins`：

| Mixin | 使用位置 |
|-------|---------|
| `titleSizes.large` | LoginTitle |
| `titleSizes.small` | SystemLabel、表單標籤、StatusText（已改為 xxs） |
| `titleSizes.xxs` | ForgotLink、StatusText |
| `bodySizes.large` | Input 內文 |
| `bodySizes.medium` | Placeholder |
| `StyledButton` | LoginButton 繼承基底 |

---

## TODO 事項

**ForgotLink 尚未實作導頁：** 目前以 `Tooltip` 提示「功能尚未開放」，點擊後顯示說明文字，不執行任何路由邏輯。

