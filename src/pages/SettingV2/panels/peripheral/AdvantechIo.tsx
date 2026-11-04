import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { c, font, space } from "../../ui/tokens";

/** 一台 ADAM-4000 固定畫 4 個輸出、4 個輸入; 群組裡每台模組都還是自己的 0–3 */
export const IO_COUNT = 4;

const IoGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.xs};
`;

const IoLabel = styled.span`
  font-size: ${font.md};
  color: ${c.textSecondary};
`;

/** 一台模組一段, 段和段之間空大一點, 看得出哪幾個是同一台 */
const IoSegments = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${space.xs} ${space.md};
`;

const IoSegment = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const SegmentName = styled.span`
  max-width: ${IO_COUNT * 44}px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: ${font.xs};
  color: ${c.textMuted};
`;

const IoRow = styled.div`
  display: flex;
  gap: ${space.xs};
`;

const IoCell = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 38px;
  border-radius: 4px;
  background: ${c.bgSubtle};
  font-family: ${font.mono};
  font-size: ${font.md};
  color: ${c.textMuted};
`;

/** 輸出可以點: 按一下變藍 (開), 再按一下取消 */
const OutputCell = styled.button<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 38px;
  padding: 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: ${({ $on }) => ($on ? c.accent : c.bgSubtle)};
  font-family: ${font.mono};
  font-size: ${font.md};
  font-weight: 700;
  color: ${({ $on }) => ($on ? c.onAccent : c.text)};
  transition:
    background 0.15s,
    color 0.15s;

  &:hover {
    background: ${({ $on }) => ($on ? c.accentHover : c.bgMuted)};
  }

  &:focus-visible {
    outline: 2px solid ${c.accent};
    outline-offset: 2px;
  }
`;

type Props = {
  /** 照 IO 編號順序的模組; 獨立模組就傳一台 */
  modules: { id: string; name: string }[];
  /** 群組要在每一段上面標是哪台模組 */
  showModuleNames?: boolean;
};

/** MiR internal IOs 風格的 IO 圖示 */
const AdvantechIo: FC<Props> = ({ modules, showModuleNames }) => {
  const { t } = useTranslation();
  const [outputs, setOutputs] = useState<Set<number>>(() => new Set());
  const toggle = (n: number) =>
    setOutputs((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const renderRow = (kind: "out" | "in") => (
    <IoSegments>
      {modules.map((m, index) => (
        <IoSegment key={m.id}>
          {showModuleNames && (
            <SegmentName title={m.name}>{m.name}</SegmentName>
          )}
          <IoRow>
            {Array.from({ length: IO_COUNT }, (_, i) => {
              // n 只拿來分辨是哪一顆 (點了哪個輸出), 畫面上的編號是模組自己的 i
              const n = index * IO_COUNT + i;
              return kind === "out" ? (
                <OutputCell
                  key={n}
                  type="button"
                  $on={outputs.has(n)}
                  aria-pressed={outputs.has(n)}
                  onClick={() => toggle(n)}
                >
                  {i}
                </OutputCell>
              ) : (
                <IoCell key={n}>{i}</IoCell>
              );
            })}
          </IoRow>
        </IoSegment>
      ))}
    </IoSegments>
  );

  return (
    <>
      <IoGroup>
        <IoLabel>{t("advantech.outputs")}</IoLabel>
        {renderRow("out")}
      </IoGroup>
      <IoGroup>
        <IoLabel>{t("advantech.inputs")}</IoLabel>
        {renderRow("in")}
      </IoGroup>
    </>
  );
};

export default AdvantechIo;

export const DeviceGrid = styled.div<{ $min?: number }>`
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(min(${({ $min }) => $min ?? 240}px, 100%), 1fr)
  );
  gap: ${space.md};
`;

export const DeviceCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${space.sm};
  padding: ${space.lg};
  background: ${c.bg};
  border: 1px solid ${c.border};
  border-radius: 8px;
  min-width: 0;
`;

export const DeviceName = styled.div`
  font-size: ${font.lg};
  font-weight: 700;
  color: ${c.text};
  text-align: center;
  word-break: break-all;
`;

export const DeviceSub = styled.div`
  font-family: ${font.mono};
  font-size: ${font.sm};
  color: ${c.textSecondary};
  text-align: center;
`;
