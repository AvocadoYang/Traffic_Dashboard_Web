import { FC, useMemo } from "react";
import type { MapType } from "@/api/useMap";
import { buildScene } from "@/components/CanvasMap/scene";
import { ZoneLabel } from "@/components/CanvasMap/MapOverlay";
import { Anchored, ScreenAnchors } from "./ScreenAnchors";

/**
 * 3D 檢視的區域名稱: 跟 2D 同一個元件 (眼睛圖示藏起來、資訊卡停用 / 啟用),
 * 放在區域的左上角 (北邊、西邊那個角)
 */
const ZoneLabels3D: FC<{ map: MapType; anchors: ScreenAnchors }> = ({ map, anchors }) => {
  const sceneZones = useMemo(() => new Map(buildScene(map).zones.map((z) => [z.id, z])), [map]);
  return (
    <>
      {map.zones.map((info) => {
        const zone = sceneZones.get(info.id);
        if (!zone) return null;
        const x = Math.min(info.startPoint.startX, info.endPoint.endX);
        const y = Math.max(info.startPoint.startY, info.endPoint.endY);
        return (
          <Anchored key={info.id} anchorRef={anchors.ref(info.id, x, 0.02, -y)} offset="translate(0, -100%)">
            <div style={{ padding: "0 2px 2px", fontSize: 12, color: "var(--c-text)", textShadow: "0 0 3px var(--c-bg)" }}>
              <ZoneLabel zone={zone} info={info} inline />
            </div>
          </Anchored>
        );
      })}
    </>
  );
};

export default ZoneLabels3D;
