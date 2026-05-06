import styled from "styled-components";
import { Table } from "antd";

// ── Layout ──────────────────────────────────────────────────────────────────

export const IndustrialContainer = styled.div`
  background: #f5f5f5;
  padding: 20px;
  font-family: "Roboto Mono", "Courier New", monospace;

  @media (max-width: 768px) {
    padding: 12px;
  }
`;

export const IndustrialCard = styled.div`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  margin-bottom: 20px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  overflow-x: auto;

  &:hover {
    border-color: #bfbfbf;
  }

  @media (max-width: 768px) {
    padding: 12px;
    margin-bottom: 12px;
  }
`;

// ── Status Bar ───────────────────────────────────────────────────────────────

export const StatusBar = styled.div<{ $accent: string }>`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-left: 4px solid ${({ $accent }) => $accent};
  padding: 12px 16px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  font-family: "Roboto Mono", monospace;
  color: ${({ $accent }) => $accent};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    padding: 10px 12px;
    margin-bottom: 12px;
    gap: 8px;
  }
`;

export const StatusBarTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: 12px;
  }
`;

export const MetricsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;

  @media (max-width: 768px) {
    gap: 6px;
  }
`;

// ── Section Header ───────────────────────────────────────────────────────────

export const SectionHeader = styled.div<{ $accent: string }>`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-left: 3px solid ${({ $accent }) => $accent};
  padding: 10px 16px;
  margin-bottom: 16px;
  font-family: "Roboto Mono", monospace;
  color: ${({ $accent }) => $accent};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);

  @media (max-width: 768px) {
    font-size: 11px;
    padding: 8px 12px;
    letter-spacing: 0.5px;
  }
`;

// ── Metric Display ───────────────────────────────────────────────────────────

export const MetricDisplay = styled.div<{ $accent: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #fafafa;
  border: 1px solid #d9d9d9;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  color: ${({ $accent }) => $accent};
  cursor: pointer;
  white-space: nowrap;

  .label {
    color: #8c8c8c;
    text-transform: uppercase;
    font-size: 10px;
  }

  .value {
    color: ${({ $accent }) => $accent};
    font-weight: 600;
  }

  @media (max-width: 768px) {
    padding: 3px 8px;
    font-size: 11px;

    .label {
      font-size: 9px;
    }
  }
`;

// ── Tag / Desc ───────────────────────────────────────────────────────────────

export const IdTag = styled.span<{ $accent: string; $bg: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $accent }) => $accent};
  color: ${({ $accent }) => $accent};
  font-size: 11px;
  font-weight: 700;
  font-family: "Roboto Mono", monospace;
  letter-spacing: 1px;
  box-shadow: 0 1px 4px ${({ $accent }) => $accent}26;
`;

export const IdDesc = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 0;
  color: #6e6e6e;
  font-size: 11px;
  font-weight: 700;
  font-family: "Roboto Mono", monospace;
  letter-spacing: 1px;
  word-break: break-word;
`;

// ── Time Display ─────────────────────────────────────────────────────────────

export const TimeDisplay = styled.div`
  font-family: "Roboto Mono", monospace;
  font-size: 11px;

  .date {
    color: #262626;
    font-weight: 600;
    margin-bottom: 2px;
  }

  .time {
    color: #8c8c8c;
    font-size: 10px;
  }
`;

// ── Table ────────────────────────────────────────────────────────────────────

export const StyledTable = styled(Table)<{ $accent: string }>`
  .ant-table {
    background: transparent;
    font-family: "Roboto Mono", monospace;
  }

  .ant-table-thead > tr > th {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    color: #262626;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 11px;
    padding: 12px 16px;
    font-family: "Roboto Mono", monospace;

    &::before {
      display: none;
    }

    @media (max-width: 768px) {
      padding: 8px 10px;
      font-size: 10px;
      letter-spacing: 0.5px;
    }
  }

  .ant-table-tbody > tr {
    transition: background 0.2s ease;

    &:hover > td {
      background: #f0f5ff !important;
    }

    > td {
      border-bottom: 1px solid #f0f0f0;
      padding: 12px 16px;
      font-family: "Roboto Mono", monospace;

      @media (max-width: 768px) {
        padding: 8px 10px;
        font-size: 11px;
      }
    }
  }

  .ant-table-tbody > tr:nth-child(odd) > td {
    background: #fafafa;
  }

  .ant-pagination {
    font-family: "Roboto Mono", monospace;
    flex-wrap: wrap;

    .ant-pagination-item {
      border: 1px solid #d9d9d9;
      font-family: "Roboto Mono", monospace;

      &:hover {
        border-color: ${({ $accent }) => $accent};
      }

      &.ant-pagination-item-active {
        background: ${({ $accent }) => $accent};
        border-color: ${({ $accent }) => $accent};

        a {
          color: #ffffff;
        }
      }
    }

    .ant-pagination-prev,
    .ant-pagination-next {
      .ant-pagination-item-link {
        border: 1px solid #d9d9d9;

        &:hover {
          border-color: ${({ $accent }) => $accent};
          color: ${({ $accent }) => $accent};
        }
      }
    }
  }
` as typeof Table;

// ── Empty State ──────────────────────────────────────────────────────────────

export const EmptyStateContainer = styled.div`
  padding: 40px 20px;
  text-align: center;

  .empty-icon {
    font-size: 48px;
    color: #d9d9d9;
    margin-bottom: 16px;
  }

  .empty-text {
    font-family: "Roboto Mono", monospace;
    color: #8c8c8c;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-size: 12px;
  }

  @media (max-width: 768px) {
    padding: 24px 12px;

    .empty-icon {
      font-size: 36px;
    }

    .empty-text {
      font-size: 10px;
      letter-spacing: 1px;
    }
  }
`;

// ── Pagination showTotal helper ──────────────────────────────────────────────

export const paginationTotalStyle: React.CSSProperties = {
  fontFamily: '"Roboto Mono", monospace',
  fontSize: 11,
  color: "#595959",
  textTransform: "uppercase",
  letterSpacing: 1,
};
