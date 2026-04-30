# 樣式系統技術文件

`variables.ts` 定義全域樣式變數，`mixins.ts` 基於設計變數封裝可重複使用的 CSS。

---

## variables.ts

### font.fontFamily

| Key | 值 | 用途 |
|-----|----|------|
| `zh` | `"Noto Sans TC", sans-serif` | 中文內容 |
| `en` | `"Roboto Mono", monospace` | 英文、數字、UI 標籤 |

---

### font.size

| Key | 值 |
|-----|----|
| `xs` | 12px |
| `sm` | 14px |
| `md` | 16px |
| `lg` | 18px |
| `xl` | 20px |
| `2xl` | 22px |
| `3xl` | 24px |
| `4xl` | 28px |

---

### font.weight

| Key | 值 |
|-----|----|
| `light` | 300 |
| `regular` | 400 |
| `medium` | 500 |
| `semibold` | 600 |
| `bold` | 700 |

---

### font.color

#### 背景色

| Key | 值 | 預覽 |
|-----|----|------|
| `bg_gray` | `#f5f5f5` | 淺灰背景 |
| `bg_white_1` | `#ffffff` | 純白 |
| `bg_white_2` | `#fafafa` | 極淺白 |
| `bg_blue` | `#40a9ff` | 淺藍背景 |

#### 邊框色

| Key | 值 | 預覽 |
|-----|----|------|
| `border_gray_1` | `#8c8c8c` | 中灰邊框 |
| `border_gray_2` | `#e8e8e8` | 淺灰邊框 |

#### 文字 / 語意色

| Key | 值 | 用途 |
|-----|----|------|
| `gray` | `#595959` | 次要文字 |
| `black` | `#262626` | 主要文字 |
| `blue` | `#1890ff` | 主色、互動、focus |
| `red` | `#ff4d4f` | 錯誤、警告 |
| `green` | `#52c41a` | 成功、在線狀態 |
| `white_1` | `#fff` | 按鈕文字、純白 |
| `white_2` | `#d9d9d9` | 預設邊框、停用色 |

---

## mixins.ts

### buttonBase

所有按鈕共用的基底樣式，透過 `css` helper 輸出。

```ts
export const buttonBase = css`
  display: flex;
  justify-content: center;
  align-items: center;
  letter-spacing: 2px;
  border: 1px solid #d9d9d9;
  cursor: pointer;
`;
```

---

### buttonSizes

按鈕尺寸對照表。

| Key | padding | font-size | height | border-radius |
|-----|---------|-----------|--------|---------------|
| `small` | 4px 10px | 12px | 28px | 4px |
| `medium` | 6px 16px | 14px | 36px | 6px |
| `large` | 8px 20px | 16px | 44px | 8px |

---

### StyledButton

基於 Ant Design `Button` 封裝，接受 `size` prop 自動套用對應尺寸。

```tsx
<StyledButton size="large" htmlType="submit">
  LOGIN
</StyledButton>
```

| Prop | 型別 | 必填 |
|------|------|------|
| `size` | `"small" \| "medium" \| "large"` | ✓ |

> 其餘 props 繼承自 Ant Design `Button`（`htmlType`、`loading`、`onClick` 等）。

---

### titleSizes

標題文字樣式，基於 `baseTitle`（`font-family: en`、`text-transform: uppercase`、`font-weight: bold`）。

| Key | font-size | letter-spacing | 建議用途 |
|-----|-----------|----------------|---------|
| `xxs` | 14px (sm) | 0.5px | 輔助說明、狀態文字 |
| `xs` | 16px (md) | 1px | 小標籤 |
| `small` | 18px (lg) | 1px | 表單 label、副標題 |
| `medium` | 22px (2xl) | 2px | 區塊標題 |
| `large` | 24px (3xl) | 3px | 頁面主標題 |

**使用方式：**

```tsx
const LoginTitle = styled.h1`
  ${titleSizes.large};
  color: ${font.color.blue};
`;
```

---

### bodySizes

內文文字樣式，基於 `baseBody`（`font-family: en`、`font-weight: medium`、`letter-spacing: 1px`）。

| Key | font-size | 建議用途 |
|-----|-----------|---------|
| `xs` | 12px | 備註、tooltip |
| `small` | 14px | 表格內文、次要資訊 |
| `medium` | 16px | 一般內文、placeholder |
| `large` | 18px | 輸入框文字 |

**使用方式：**

```tsx
const StyledForm = styled(Form)`
  .ant-input {
    ${bodySizes.large};
  }

  ::placeholder {
    ${bodySizes.medium};
  }
`;
```

---

## 設計變數引用對照

| 使用情境 | 建議設計變數 |
|---------|-----------|
| 主要互動色（hover、focus、border） | `font.color.blue` |
| 成功 / 在線狀態 | `font.color.green` |
| 錯誤 / 警告 | `font.color.red` |
| 主要文字 | `font.color.black` |
| 次要文字、標籤 | `font.color.gray` |
| 停用邊框、placeholder | `font.color.white_2` |
| 分隔線、卡片邊框 | `font.color.border_gray_2` |
| 圖示、輔助文字 | `font.color.border_gray_1` |