import styled from "styled-components";
import { TimeClass } from "@/api/useOperationReport";
import {
  CATEGORICAL_PALETTE,
  CHART_TEXT_SECONDARY,
  OTHER_SLICE_COLOR,
} from "@/pages/MissionDispatchBoard/chartPalette";
import { mq } from "@/styles/responsive";

/** 營運報表各分頁共用的面板、數字圖塊、圖表外框 */

// 時間分配的顏色: 有事做的五類用分類色盤, 閒置灰、離線紅、沒有紀錄最淡
export const TIME_COLOR: Record<TimeClass, string> = {
  transport: CATEGORICAL_PALETTE[0],
  charge: CATEGORICAL_PALETTE[3],
  giveWay: CATEGORICAL_PALETTE[1],
  standby: CATEGORICAL_PALETTE[2],
  manual: CATEGORICAL_PALETTE[6],
  idle: OTHER_SLICE_COLOR,
  offline: CATEGORICAL_PALETTE[7],
  unrecorded: "#ecebe6",
};

// 外框跟告警紀錄的面板同一套: 1px 邊框 + 左側色條 + 淡陰影
export const Panel = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--c-bg);
  border: 1px solid var(--c-header-border);
  border-left: 4px solid var(--c-header-accent);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

export const PanelHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--c-bg-subtle);
  border-bottom: 1px solid var(--c-border);
`;

export const PanelTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin: 0;
  font-size: var(--font-md);
  font-weight: 600;
  color: var(--c-text);

  .anticon {
    color: var(--c-header-accent);
  }
`;

export const PanelHint = styled.span`
  font-size: var(--font-sm);
  color: var(--c-text-muted);
`;

export const PanelBody = styled.div`
  padding: var(--space-md);
  min-width: 0;
`;

export const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);

  ${mq.pad} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  ${mq.web} {
    grid-template-columns: repeat(9, minmax(0, 1fr));
  }
`;

export const Tile = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-sm) var(--space-md);
  background: var(--c-bg);
  border: 1px solid var(--c-header-border);
  border-radius: 4px;
`;

export const TileLabel = styled.span`
  font-size: var(--font-sm);
  color: var(--c-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const TileValue = styled.span`
  font-family: "Roboto Mono", monospace;
  font-size: 22px;
  font-weight: 600;
  color: var(--c-text);
`;

export const TwoColumns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-md);

  ${mq.web} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const ChartBox = styled.div<{ $height: number }>`
  width: 100%;
  height: ${({ $height }) => $height}px;
`;

// 圖例的字一律用次要文字色 (預設跟線條同色, 淺色的「沒有紀錄」會看不到),
// 順序照資料的順序 (recharts 預設會照名稱排序)
export const legendText = (value: string) => (
  <span style={{ color: CHART_TEXT_SECONDARY }}>{value}</span>
);
export const legendOrder = (keys: string[]) => (item: { dataKey?: unknown }) =>
  keys.indexOf(String(item.dataKey));

