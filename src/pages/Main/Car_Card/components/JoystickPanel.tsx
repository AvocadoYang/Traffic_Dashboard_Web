import { useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { Button } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { JoystickAmrId } from "@/pages/Main/global/jotai";
import { darkMode } from "@/utils/gloable";
import { useJoystickControl } from "@/sockets/useJoystickControl";
import {
  useReadyToJoystick,
  type ReadyToJoystick,
} from "@/sockets/useReadyToJoystick";
import Joystick from "@/pages/Main/Car_Card/components/Joystick";

const FloatingPanel = styled.div<{ $isDark: boolean }>`
  position: fixed;
  z-index: 900; /* 蓋過地圖，但低於 antd Modal 的 1000。 */
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid
    ${({ $isDark }) => ($isDark ? "#434343" : "rgba(0, 0, 0, 0.12)")};
  background: ${({ $isDark }) => ($isDark ? "#1a1a1a" : "#ffffff")};
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.24);
  font-family: "Roboto Mono", monospace;
`;

const PanelHeader = styled.div<{ $isDark: boolean; $dragging: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.85em;
  font-weight: bold;
  color: ${({ $isDark }) => ($isDark ? "#e6e6e6" : "#1a1a1a")};
  cursor: ${({ $dragging }) => ($dragging ? "grabbing" : "grab")};
  touch-action: none;
  user-select: none;
`;

const DOCK_MARGIN = 24;

const JOYSTICK_STATE = {
  ready: { base: "#52c41a", stick: "#237804", hint: null },
  stopped: { base: "#ff4d4f", stick: "#a8071a", hint: null },
  resume: {
    base: "#faad14",
    stick: "#ad6800",
    hint: "Waiting",
  },
  unknown: {
    dark: { base: "#3a3a3a", stick: "#ff8800", hint: null },
    light: { base: "#ccc", stick: "#888", hint: null },
  },
} as const;

const RESUME_REASON = "press the resume button";

const isResumeReason = (reason: string | null | undefined) =>
  !!reason && reason.toLowerCase().includes(RESUME_REASON);

const getJoystickState = (
  status: ReadyToJoystick | undefined,
  isDark: boolean,
) => {
  const state = (() => {
    if (status?.joystick_available) return JOYSTICK_STATE.ready;

    if (status?.status_text === "EmergencyStop")
      return isResumeReason(status.unavailable_reason)
        ? JOYSTICK_STATE.resume
        : JOYSTICK_STATE.stopped;

    return JOYSTICK_STATE.unknown[isDark ? "dark" : "light"];
  })();

  if (!status?.status_text) return state;

  const hint = status.unavailable_reason
    ? `[${status.status_text}] ${status.unavailable_reason}`
    : `[${status.status_text}]`;
  return { ...state, hint };
};

const StatusHint = styled.div<{ $color: string }>`
  max-width: 160px;
  text-align: center;
  font-size: 0.75em;
  font-weight: bold;
  color: ${({ $color }) => $color};
`;

interface Position {
  x: number;
  y: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const JoystickPanel: React.FC = () => {
  const [amrId, setAmrId] = useAtom(JoystickAmrId);
  const isDark = useAtomValue(darkMode);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);

  const grabOffset = useRef<Position>({ x: 0, y: 0 });

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    grabOffset.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    setPosition({ x: rect.left, y: rect.top });
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!dragging || !panel) return;

    // 限制在視窗內，避免面板被拖出畫面後拉不回來。
    setPosition({
      x: clamp(
        event.clientX - grabOffset.current.x,
        0,
        window.innerWidth - panel.offsetWidth,
      ),
      y: clamp(
        event.clientY - grabOffset.current.y,
        0,
        window.innerHeight - panel.offsetHeight,
      ),
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  };

  if (!amrId) return null;

  return createPortal(
    <FloatingPanel
      ref={panelRef}
      $isDark={isDark}
      style={
        position
          ? { left: position.x, top: position.y }
          : { right: DOCK_MARGIN, bottom: DOCK_MARGIN }
      }
    >
      <PanelHeader
        $isDark={isDark}
        $dragging={dragging}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <span>{amrId}</span>
        <Button
          size="small"
          type="text"
          icon={<CloseOutlined />}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setAmrId(null)}
        />
      </PanelHeader>
      <JoystickBody key={amrId} amrId={amrId} isDark={isDark} />
    </FloatingPanel>,
    document.body,
  );
};

const JoystickBody = ({
  amrId,
  isDark,
}: {
  amrId: string;
  isDark: boolean;
}) => {
  const joystick = useJoystickControl(amrId);
  const status = useReadyToJoystick(amrId);
  const state = getJoystickState(status, isDark);

  return (
    <>
      <Joystick
        size={160}
        stickSize={64}
        baseColor={state.base}
        stickColor={state.stick}
        onMove={joystick.onMove}
        onEnd={joystick.onEnd}
      />
      {state.hint && <StatusHint $color={state.stick}>{state.hint}</StatusHint>}
    </>
  );
};

export default JoystickPanel;
