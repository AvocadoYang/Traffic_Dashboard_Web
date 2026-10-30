import { FC } from "react";
import styled from "styled-components";
import { Tooltip } from "antd";
import { useAtomValue, useSetAtom } from "jotai";
import useMap from "@/api/useMap";
import useScriptRobot from "@/api/useScriptRobot";
import { useMockInfo } from "@/sockets/useMockInfo";
import { amrId2Color } from "@/utils/utils";
import { EditingSimCar, OpenSimCarPanel } from "@/components/SimCars/simCarAtoms";
import { SIM_CAR_DRAG_TYPE } from "@/components/SimCars/useSimCarPlacement";
import { Anchored, ScreenAnchors } from "./ScreenAnchors";

const Marker = styled.div<{ $color: string }>`
  width: 14px;
  height: 18px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
  outline: 2px dashed var(--c-bg);
  opacity: 0.85;
  cursor: grab;
`;

/**
 * 已經放到地圖上、還沒開始模擬的模擬車 (起始位置), 3D 版 (同 2D 的 SimCarMarkers):
 * 畫在畫布外面跟著投影的那層 DOM, 一樣可以拖到別的點位 (地圖區塊接住, 見 useSimCarPlacement)、點了編輯。
 * 只在「模擬車輛」面板打開、還沒開始模擬時畫
 */
const SimCarMarkers3D: FC<{ anchors: ScreenAnchors }> = ({ anchors }) => {
  const open = useAtomValue(OpenSimCarPanel);
  const setEditing = useSetAtom(EditingSimCar);
  const { data: map } = useMap();
  const { data: robots } = useScriptRobot();
  const script = useMockInfo();
  if (!open || !map || !robots || script?.isSimulate) return null;
  return (
    <>
      {robots.map((r) => {
        if (!r || !r.script_placement_location || r.script_placement_location === "unset") return null;
        const loc = map.locations.find((l) => String(l.locationId) === r.script_placement_location);
        if (!loc) return null;
        return (
          <Anchored key={r.id} anchorRef={anchors.ref(`sim-car:${r.id}`, loc.x, 0.2, -loc.y)} offset="translate(-50%, -50%)">
            <Tooltip title={`${r.full_name} @ ${r.script_placement_location}`}>
              <Marker
                $color={amrId2Color(r.id)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(SIM_CAR_DRAG_TYPE, r.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => setEditing(r.id)}
                data-testid="fleet3d-sim-car-marker"
              />
            </Tooltip>
          </Anchored>
        );
      })}
    </>
  );
};

export default SimCarMarkers3D;
