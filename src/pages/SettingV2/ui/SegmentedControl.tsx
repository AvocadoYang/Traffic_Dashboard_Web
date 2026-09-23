import { ReactNode } from "react";
import styled from "styled-components";
import { c, font, mqNarrow } from "./tokens";

const Bar = styled.div`
  display: flex;
  width: 100%;
  border: 1px solid ${c.border};
  background: ${c.bgSubtle};
  overflow: hidden;

  ${mqNarrow} {
    /* 選項多的時候在窄螢幕改成直向堆疊,不要壓成一條看不清的細線 */
    flex-wrap: wrap;
  }
`;

const Option = styled.button<{ $active: boolean }>`
  flex: 1 1 auto;
  min-width: 84px;
  padding: 8px 12px;
  border: none;
  border-right: 1px solid ${c.border};
  font-family: ${font.mono};
  font-size: ${font.xs};
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.15s ease;
  background: ${({ $active }) => ($active ? c.accent : "transparent")};
  color: ${({ $active }) => ($active ? c.onAccent : c.textSecondary)};

  &:last-child {
    border-right: none;
  }

  &:hover:not(:disabled) {
    background: ${({ $active }) => ($active ? c.accent : c.bgMuted)};
    color: ${({ $active }) => ($active ? c.onAccent : c.text)};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

type Props<T extends string | number> = {
  options: { label: ReactNode; value: T }[];
  /** antd 的 Form.Item 會注入 value / onChange,所以兩個都是選配 */
  value?: T;
  onChange?: (value: T) => void;
  disabled?: boolean;
};

/**
 * 灰黑白版的分段選擇器。選中的是實心黑底,沒選的是透明底,
 * 不靠顏色區分,列印或高對比模式下也看得出來。
 */
const SegmentedControl = <T extends string | number>({
  options,
  value,
  onChange,
  disabled,
}: Props<T>) => (
  <Bar>
    {options.map((o) => (
      <Option
        key={String(o.value)}
        type="button"
        $active={value === o.value}
        disabled={disabled}
        onClick={() => onChange?.(o.value)}
      >
        {o.label}
      </Option>
    ))}
  </Bar>
);

export default SegmentedControl;
