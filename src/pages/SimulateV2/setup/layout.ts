/** 車輛、搬運需求分頁共用的版面 */
import styled from "styled-components";

export const Page = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--c-bg-muted);
  font-size: 13px;

  @media (max-width: 600px) {
    padding: 8px;
  }
`;

export const Card = styled.section`
  padding: 16px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  color: var(--c-text);
`;

export const CardTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
`;

export const Hint = styled.div`
  color: var(--c-text-secondary);
  font-size: 12px;
  line-height: 1.6;
`;

export const SummaryLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-top: 12px;
  color: var(--c-text-secondary);

  .warn {
    color: var(--c-danger);
  }
`;
