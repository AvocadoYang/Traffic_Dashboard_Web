import { Tooltip } from "antd";
import { memo } from "react";
import styled from "styled-components";
import {
  CompassOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import { PointInfo, MapInfo } from "../locationInfo";

const Container = styled.div.attrs<{
  left: number;
  top: number;
  canrotate: string;
}>(({ left, top }) => ({
  style: { left, top },
}))<{ left: number; top: number; canrotate: string }>`
  position: absolute;
  width: 6.5px;
  background: #1225ce;
  background: ${(prop) => (prop.canrotate === "false" ? "#1225ce" : "#f88f05")};
  height: 6.5px;
  z-index: 20px;
  border-radius: 50%;
`;

// MiR 風格打點的三個新地點類型,用「顏色圓點 + antd icon」近似 MiR 原生的
// 圖示(robot/shelf/charging),沒有 MiR 原廠 SVG 素材時的替代方案。其餘既有
// 類型完全不受影響,還是走上面純色圓點的 Container。
const AREA_TYPE_ICON: Record<string, { icon: JSX.Element; color: string }> = {
  MIR_ROBOT_POSITION: { icon: <CompassOutlined />, color: "#1890ff" },
  MIR_SHELF_POSITION: { icon: <DatabaseOutlined />, color: "#722ed1" },
  MIR_CHARGING_STATION: { icon: <ThunderboltOutlined />, color: "#262626" },
};

const IconBadge = styled.div.attrs<{ left: number; top: number }>(
  ({ left, top }) => ({
    style: { left, top },
  }),
)<{ left: number; top: number; $color: string }>`
  position: absolute;
  width: 16px;
  height: 16px;
  margin-left: -8px;
  margin-top: -8px;
  background: ${(prop) => prop.$color};
  border: 1px solid #ffffff;
  border-radius: 50%;
  z-index: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 10px;
`;

const Location: React.FC<{ pointInfo: PointInfo; mapInfo: MapInfo }> = ({
  pointInfo,
  mapInfo,
}) => {
  const [left, top] = rosCoord2DisplayCoord({
    x: pointInfo.x,
    y: pointInfo.y,
    mapHeight: mapInfo.mapHeight,
    mapOriginX: mapInfo.mapOriginX,
    mapOriginY: mapInfo.mapOriginY,
    mapResolution: mapInfo.mapResolution,
  });

  const areaTypeIcon = AREA_TYPE_ICON[pointInfo.areaType];

  return (
    <Tooltip
      placement="bottom"
      title={pointInfo.locationId}
      style={{ width: "4.5px", height: "4.5px", borderRadius: "50%" }}
    >
      {areaTypeIcon ? (
        <IconBadge
          left={left}
          top={top}
          $color={areaTypeIcon.color}
          key={pointInfo.locationId}
          className="location-wrap"
          draggable={false}
          onDragStart={(event) => {
            event.preventDefault();
          }}
        >
          {areaTypeIcon.icon}
        </IconBadge>
      ) : (
        <Container
          left={left}
          draggable={false}
          top={top}
          canrotate={pointInfo.canRotate.toString()}
          key={pointInfo.locationId}
          className="location-wrap"
          onDragStart={(event) => {
            event.preventDefault();
          }}
        />
      )}
    </Tooltip>
  );
};

export default memo(Location);
