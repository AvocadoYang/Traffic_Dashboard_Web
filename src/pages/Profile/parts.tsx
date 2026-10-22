import { FC, ReactNode } from "react";
import styled from "styled-components";
import { mq } from "@/styles/responsive";

/** 個人設定各分頁共用的區塊、設定列 */

const SectionWrap = styled.section`
  & + & {
    margin-top: var(--space-lg);
    padding-top: var(--space-lg);
    border-top: 1px solid var(--c-border);
  }
`;

const SectionHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);

  h2 {
    margin: 0;
    font-size: var(--font-md);
    font-weight: 600;
    color: var(--c-text);
  }
`;

export const Hint = styled.p`
  margin: 0 0 var(--space-sm);
  font-size: var(--font-sm);
  color: var(--c-text-secondary);
`;

export const Section: FC<{ title: ReactNode; hint?: ReactNode; extra?: ReactNode; children: ReactNode }> = ({
  title,
  hint,
  extra,
  children,
}) => (
  <SectionWrap>
    <SectionHead>
      <h2>{title}</h2>
      {extra}
    </SectionHead>
    {hint && <Hint>{hint}</Hint>}
    {children}
  </SectionWrap>
);

const RowWrap = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-xs);
  padding: var(--space-sm) 0;

  & + & {
    border-top: 1px dashed var(--c-border);
  }

  ${mq.pad} {
    grid-template-columns: minmax(180px, 260px) 1fr;
    align-items: center;
    gap: var(--space-md);
  }
`;

const RowLabel = styled.div`
  font-size: var(--font-md);
  color: var(--c-text);

  small {
    display: block;
    margin-top: 2px;
    font-size: var(--font-sm);
    color: var(--c-text-secondary);
  }
`;

/** 一列設定: 左邊名稱 (+ 說明), 右邊控制項; 窄螢幕上下排 */
export const SettingRow: FC<{ label: ReactNode; help?: ReactNode; children: ReactNode }> = ({
  label,
  help,
  children,
}) => (
  <RowWrap>
    <RowLabel>
      {label}
      {help && <small>{help}</small>}
    </RowLabel>
    <div style={{ minWidth: 0 }}>{children}</div>
  </RowWrap>
);
