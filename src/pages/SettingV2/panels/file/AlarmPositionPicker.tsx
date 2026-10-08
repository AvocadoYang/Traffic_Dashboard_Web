import { FC } from "react";
import styled from "styled-components";
import { useAtom, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { io } from "@/sockets/socketConnect";
import {
  ALARM_POSITIONS,
  AlarmPosition,
  systemAlarmPosition,
  systemAlarmPreviewTick,
} from "@/utils/systemAlarmFilter";
import { c, font, space } from "../../ui/tokens";

// 畫成一個小螢幕,六格對應畫面上的六個位置,選哪格告警就出現在哪。
const Screen = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: ${space.xl} ${space.sm};
  width: min(360px, 100%);
  padding: ${space.sm};
  border: 1px solid ${c.borderStrong};
  background: ${c.bgSubtle};
`;

const Cell = styled.button<{ $active: boolean }>`
  padding: ${space.sm} ${space.xs};
  border: 1px solid ${(props) => (props.$active ? c.accent : c.border)};
  background: ${(props) => (props.$active ? c.accent : c.bg)};
  color: ${(props) => (props.$active ? c.onAccent : c.textSecondary)};
  font-size: ${font.xs};
  cursor: pointer;

  &:hover {
    border-color: ${c.accent};
  }
`;

const AlarmPositionPicker: FC = () => {
  const { t } = useTranslation();
  const [position, setPosition] = useAtom(systemAlarmPosition);
  const bumpPreview = useSetAtom(systemAlarmPreviewTick);

  const choose = (next: AlarmPosition) => {
    io.emit("set-system-alarm-display", { position: next });
    setPosition(next);
    bumpPreview((n) => n + 1);
  };

  return (
    <Screen>
      {ALARM_POSITIONS.map((p) => (
        <Cell
          key={p}
          type="button"
          $active={p === position}
          aria-pressed={p === position}
          onClick={() => choose(p)}
        >
          {t(`system_alarm.position_option.${p}`)}
        </Cell>
      ))}
    </Screen>
  );
};

export default AlarmPositionPicker;
