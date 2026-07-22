import { useCallback, useRef, useState } from "react";
import styled from "styled-components";

/** Joystick 回傳的座標，範圍皆為 -100 ~ 100，中心為 0。 */
export interface JoystickValue {
  /** 水平方向，右為正、左為負。 */
  x: number;
  /** 垂直方向，上為正、下為負。 */
  y: number;
}

interface JoystickProps {
  /** 外圈底盤的直徑（px）。 */
  size?: number;
  /** 中心搖桿的直徑（px）。 */
  stickSize?: number;
  /** 底盤顏色。 */
  baseColor?: string;
  /** 搖桿顏色。 */
  stickColor?: string;
  /** 拖曳過程中持續回傳座標。 */
  onMove?: (value: JoystickValue) => void;
  /** 放開搖桿、回到中心時觸發。 */
  onEnd?: () => void;
}

const DEFAULT_SIZE = 200;
const DEFAULT_STICK_SIZE = 80;

const Base = styled.div<{ $size: number; $color: string }>`
  position: relative;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  border-radius: 50%;
  background-color: ${(props) => props.$color};
  touch-action: none;
  user-select: none;
`;

const Stick = styled.div<{
  $size: number;
  $color: string;
  $x: number;
  $y: number;
  $dragging: boolean;
}>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  border-radius: 50%;
  background-color: ${(props) => props.$color};
  cursor: grab;
  transform: translate(-50%, -50%)
    translate(${(props) => props.$x}px, ${(props) => props.$y}px);
  transition: ${(props) =>
    props.$dragging ? "none" : "transform 0.2s ease-out"};

  &:active {
    cursor: grabbing;
  }
`;

const Joystick: React.FC<JoystickProps> = ({
  size = DEFAULT_SIZE,
  stickSize = DEFAULT_STICK_SIZE,
  baseColor = "#dedede",
  stickColor = "#1abc9c",
  onMove,
  onEnd,
}) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState<JoystickValue>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  /** 搖桿中心可移動的最大半徑。 */
  const maxRadius = (size - stickSize) / 2;

  const moveStick = useCallback(
    (clientX: number, clientY: number) => {
      const base = baseRef.current;
      if (!base) return;

      const rect = base.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;

      // 限制在最大半徑內，超出則沿邊界等比例縮放。
      const distance = Math.hypot(dx, dy);
      if (distance > maxRadius) {
        dx = (dx / distance) * maxRadius;
        dy = (dy / distance) * maxRadius;
      }

      setOffset({ x: dx, y: dy });
      onMove?.({
        x: Math.round((dx / maxRadius) * 100),
        y: Math.round((-dy / maxRadius) * 100), // 反轉 Y，讓上方為正。
      });
    },
    [maxRadius, onMove],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    moveStick(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    moveStick(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
    setOffset({ x: 0, y: 0 }); // 放開後回到中心。
    onMove?.({ x: 0, y: 0 });
    onEnd?.();
  };

  return (
    <Base ref={baseRef} $size={size} $color={baseColor}>
      <Stick
        $size={stickSize}
        $color={stickColor}
        $x={offset.x}
        $y={offset.y}
        $dragging={dragging}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </Base>
  );
};

export default Joystick;
