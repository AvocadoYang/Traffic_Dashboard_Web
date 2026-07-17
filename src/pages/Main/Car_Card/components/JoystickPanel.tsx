import { useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { Button } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { JoystickAmrId } from "@/pages/Main/global/jotai";
import { darkMode } from "@/utils/gloable";
import { useJoystickControl } from "@/sockets/useJoystickControl";
import Joystick from "@/pages/Main/Car_Card/components/Joystick";

/**
 * 懸浮在右下角，不阻擋底下的地圖操作。
 * 刻意不用 antd Modal：Modal 即使 mask={false} 仍會鋪一層滿版的 .ant-modal-wrap
 * 接走點擊事件，地圖就按不到了。
 */
const FloatingPanel = styled.div<{ $isDark: boolean }>`
  position: fixed;
  z-index: 900; /* 蓋過地圖，但低於 antd Modal 的 1000。 */
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid ${({ $isDark }) => ($isDark ? "#434343" : "rgba(0, 0, 0, 0.12)")};
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

/** 預設停靠位置：距離視窗右下角的間距（px）。 */
const DOCK_MARGIN = 24;

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
  // null 代表還沒被拖過，維持右下角停靠；拖曳後改用絕對座標定位。
  const [position, setPosition] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);
  // 指標與面板左上角的距離，拖曳過程中固定不變。
  const grabOffset = useRef<Position>({ x: 0, y: 0 });

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    grabOffset.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    // 從 right/bottom 停靠切換成 left/top 定位，接手時先固定在目前位置避免跳動。
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
          // 關閉鈕在拖曳 handle 內，擋掉冒泡才不會按一下就開始拖。
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setAmrId(null)}
        />
      </PanelHeader>
      {/* key 讓切換車輛時重建，確保上一台的 socket 訂閱先收乾淨。 */}
      <JoystickBody key={amrId} amrId={amrId} isDark={isDark} />
    </FloatingPanel>,
    document.body,
  );
};

const JoystickBody = ({ amrId, isDark }: { amrId: string; isDark: boolean }) => {
  const joystick = useJoystickControl(amrId);

  return (
    <Joystick
      size={160}
      stickSize={64}
      baseColor={isDark ? "#3a3a3a" : "#ccc"}
      stickColor={isDark ? "#ff8800" : "#888"}
      onMove={joystick.onMove}
      onEnd={joystick.onEnd}
    />
  );
};

export default JoystickPanel;
