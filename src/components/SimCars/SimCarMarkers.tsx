import { memo } from "react";
import styled from "styled-components";
import { Tooltip } from "antd";
import { useAtomValue, useSetAtom } from "jotai";
import useMap from "@/api/useMap";
import useScriptRobot from "@/api/useScriptRobot";
import { useMockInfo } from "@/sockets/useMockInfo";
import { amrId2Color, rosCoord2DisplayCoord } from "@/utils/utils";
import { Scale } from "@/utils/gloable";
import { EditingSimCar, OpenSimCarPanel } from "./simCarAtoms";
import { SIM_CAR_DRAG_TYPE } from "./useSimCarPlacement";

/** 畫面上固定大小 (反向抵銷地圖縮放), 地圖縮很小時也找得到、拖得到 */
const Marker = styled.div<{ $color: string }>`
  position: absolute;
  width: 14px;
  height: 18px;
  transform-origin: 0 0;
  border-radius: 2px;
  background: ${({ $color }) => $color};
  outline: 2px dashed var(--c-bg);
  opacity: 0.85;
  cursor: grab;
  z-index: 15;
`;

/**
 * 已經放到地圖上、還沒開始模擬的模擬車 (起始位置)。
 * 只在「模擬車輛」面板打開時畫; 模擬跑起來後地圖上畫的是真正在跑的車, 這裡就不畫。
 */
const SimCarMarkers = () => {
  const open = useAtomValue(OpenSimCarPanel);
  const setEditing = useSetAtom(EditingSimCar);
  const { data: map } = useMap();
  const { data: robots } = useScriptRobot();
  const script = useMockInfo();
  const scale = useAtomValue(Scale);

  if (!open || !map || !robots || script?.isSimulate) return null;

  return (
    <>
      {robots.map((r) => {
        if (!r || !r.script_placement_location || r.script_placement_location === "unset") return null;
        const loc = map.locations.find(
          (l) => String(l.locationId) === r.script_placement_location,
        );
        if (!loc) return null;
        const [left, top] = rosCoord2DisplayCoord({
          x: loc.x,
          y: loc.y,
          mapResolution: map.mapResolution,
          mapOriginX: map.mapOriginX,
          mapOriginY: map.mapOriginY,
          mapHeight: map.mapHeight,
        });
        return (
          <Tooltip key={r.id} title={`${r.full_name} @ ${r.script_placement_location}`}>
            <Marker
              $color={amrId2Color(r.id)}
              style={{
                left,
                top,
                transform: `scale(${1 / scale}) translate(-50%, -50%)`,
              }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(SIM_CAR_DRAG_TYPE, r.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onClick={() => setEditing(r.id)}
            />
          </Tooltip>
        );
      })}
    </>
  );
};

export default memo(SimCarMarkers);
