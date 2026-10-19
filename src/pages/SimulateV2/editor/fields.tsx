import { FC, useEffect, useState } from "react";
import { Input, InputNumber } from "antd";

/**
 * 輸入框改完 (離開或按 Enter) 才寫進 doc, 不是每打一個字就寫一次:
 * 不然復原要按好幾十下.
 */
export const BlurNumber: FC<{
  value: number | null;
  onCommit: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  allowEmpty?: boolean;
  placeholder?: string;
  suffix?: string;
  width?: number | string;
  testId?: string;
}> = ({ value, onCommit, min, max, step, precision, allowEmpty, placeholder, suffix, width = "100%", testId }) => {
  const [draft, setDraft] = useState<number | null>(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft === value) return;
    if (draft === null && !allowEmpty) {
      setDraft(value);
      return;
    }
    onCommit(draft);
  };
  return (
    <InputNumber<number>
      size="small"
      value={draft}
      min={min}
      max={max}
      step={step}
      precision={precision}
      placeholder={placeholder}
      suffix={suffix}
      style={{ width }}
      data-testid={testId}
      onChange={(v) => setDraft(typeof v === "number" ? v : null)}
      onBlur={commit}
      onPressEnter={commit}
    />
  );
};

export const BlurText: FC<{
  value: string;
  onCommit: (v: string) => boolean | void;
  maxLength?: number;
  testId?: string;
}> = ({ value, onCommit, maxLength = 50, testId }) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    const v = draft.trim();
    if (v === value) return;
    // onCommit 回 false 代表不接受 (例如名稱重複), 恢復原本的值
    if (!v || onCommit(v) === false) setDraft(value);
  };
  return (
    <Input
      size="small"
      value={draft}
      maxLength={maxLength}
      data-testid={testId}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onPressEnter={commit}
    />
  );
};
