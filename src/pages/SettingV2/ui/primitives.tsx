import styled from "styled-components";
import { c, font, space, mqNarrow } from "./tokens";

/** 每個面板最外層:滿高、可捲動、內距一致 */
export const PanelShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.lg};
  height: 100%;
  min-height: 0;
  font-family: ${font.mono};
  color: ${c.text};
`;

/** 面板內的一個區塊(例如「新增點位」、「清單」) */
export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${space.md};
  background: ${c.bg};
  border: 1px solid ${c.border};
  padding: ${space.lg};

  ${mqNarrow} {
    padding: ${space.md};
  }
`;

export const SectionTitle = styled.h3`
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${space.sm};
  font-family: ${font.mono};
  font-size: ${font.sm};
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${c.textSecondary};
  padding-bottom: ${space.sm};
  border-bottom: 1px solid ${c.border};

  .anticon {
    color: ${c.textMuted};
  }
`;

/** 表單欄位排成一列,窄螢幕自動換行 */
export const FieldGrid = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => $cols ?? 2}, minmax(0, 1fr));
  gap: ${space.md};

  ${mqNarrow} {
    grid-template-columns: 1fr;
  }
`;

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${space.xs};
  min-width: 0;
`;

export const FieldLabel = styled.span`
  font-size: ${font.xs};
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: ${c.textMuted};
`;

/** 工具列:按鈕橫排,窄螢幕可橫向捲動不擠壓 */
export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.sm};
  flex-wrap: wrap;

  ${mqNarrow} {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
    > * {
      flex-shrink: 0;
    }
  }
`;

const buttonBase = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  font-family: ${font.mono};
  font-size: ${font.xs};
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

/** 次要動作(重新整理、取消…) */
export const GhostButton = styled.button`
  ${buttonBase}
  background: ${c.bg};
  border: 1px solid ${c.border};
  color: ${c.textSecondary};

  &:hover:not(:disabled) {
    border-color: ${c.borderStrong};
    color: ${c.text};
    background: ${c.bgSubtle};
  }
`;

/** 主要動作(儲存、送出) */
export const SolidButton = styled.button`
  ${buttonBase}
  background: ${c.accent};
  border: 1px solid ${c.accent};
  color: #ffffff;

  &:hover:not(:disabled) {
    background: #333333;
    border-color: #333333;
  }
`;

/** 只給刪除 */
export const DangerButton = styled.button`
  ${buttonBase}
  background: ${c.bg};
  border: 1px solid ${c.danger};
  color: ${c.danger};

  &:hover:not(:disabled) {
    background: ${c.dangerSoft};
  }
`;

export const Hint = styled.p`
  margin: 0;
  font-size: ${font.xs};
  line-height: 1.6;
  color: ${c.textMuted};
`;

export const EmptyState = styled.div`
  padding: ${space.xl};
  text-align: center;
  font-size: ${font.sm};
  color: ${c.textMuted};
  background: ${c.bgSubtle};
  border: 1px dashed ${c.border};
`;

/** 寬表格的外框:窄螢幕時內部橫向捲動,不要把版面撐破 */
export const TableWrap = styled.div`
  min-width: 0;
  overflow-x: auto;

  .ant-table-wrapper,
  .ant-table {
    font-family: ${font.mono};
    font-size: ${font.sm};
  }

  .ant-table-thead > tr > th {
    font-size: ${font.xs};
    letter-spacing: 0.8px;
    text-transform: uppercase;
    font-weight: 700;

    &::before {
      display: none !important;
    }
  }
`;

/** 小螢幕用的卡片列表(取代寬表格) */
export const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.sm};
`;

export const ItemCard = styled.div<{ $selected?: boolean }>`
  border: 1px solid ${({ $selected }) => ($selected ? c.borderStrong : c.border)};
  background: ${({ $selected }) => ($selected ? c.bgSelected : c.bg)};
  padding: ${space.md};
  display: flex;
  flex-direction: column;
  gap: ${space.sm};
`;

export const CardTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.sm};
  font-size: ${font.md};
  font-weight: 700;
`;

/** 卡片裡的 key/value 對照 */
export const CardFacts = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: ${space.xs} ${space.md};
  font-size: ${font.sm};

  dt {
    color: ${c.textMuted};
    font-size: ${font.xs};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  dd {
    margin: 0;
    color: ${c.text};
    overflow-wrap: anywhere;
  }
`;

export const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border: 1px solid ${c.border};
  background: ${c.bgMuted};
  color: ${c.textSecondary};
  font-size: ${font.xs};
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

/**
 * 破壞性操作的警語(例如「編輯貨架種類可能會刪除既有資料」)。
 * 灰黑白之外唯一會出現紅色的地方,就是這種會造成資料遺失的提醒。
 */
export const WarnNote = styled.p`
  margin: 0;
  padding: ${space.sm} ${space.md};
  border: 1px solid ${c.border};
  border-left: 3px solid ${c.danger};
  background: ${c.dangerSoft};
  color: ${c.danger};
  font-size: ${font.xs};
  line-height: 1.6;
`;

/** 卡片 / 表格上方的計數說明,例如「已選 3 筆」 */
export const CountNote = styled.span`
  font-size: ${font.xs};
  letter-spacing: 0.5px;
  color: ${c.textMuted};
  white-space: nowrap;
`;
