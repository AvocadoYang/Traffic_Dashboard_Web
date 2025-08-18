import { MessageInstance } from "antd/es/message/interface";
import { ErrorResponse } from "./globalType";
import { MD5 } from "crypto-js";
import convert from "color-convert";

export const rosCoord2DisplayCoord = ({
  x,
  y,
  mapResolution,
  mapOriginX,
  mapOriginY,
  mapHeight,
}: {
  x: number;
  y: number;
  mapResolution: number;
  mapOriginX: number;
  mapOriginY: number;
  mapHeight: number;
}) => [
  (x - mapOriginX) / mapResolution,
  mapHeight - (y - mapOriginY) / mapResolution,
];

export const rvizCoord = ({
  displayX,
  displayY,
  mapResolution,
  mapOriginX,
  mapOriginY,
  mapHeight,
  scaleSize,
}: {
  displayX: number;
  displayY: number;
  mapResolution: number;
  mapOriginX: number;
  mapOriginY: number;
  mapHeight: number;
  scaleSize: number;
}) => [
  (displayX / scaleSize) * mapResolution + mapOriginX,
  (mapHeight - displayY / scaleSize) * mapResolution + mapOriginY,
];

export const rvizCoord2 = ({
  displayX,
  displayY,
  mapResolution,
  mapOriginX,
  mapOriginY,
  mapHeight,
  scaleSize,
}: {
  displayX: number;
  displayY: number;
  mapResolution: number;
  mapOriginX: number;
  mapOriginY: number;
  mapHeight: number;
  scaleSize: number;
}) => [
  displayX * scaleSize * mapResolution + mapOriginX,
  (mapHeight - displayY * scaleSize) * mapResolution + mapOriginY,
];

export const sanitizeDeg = (deg: number) => ((deg % 360) + 360) % 360;

export const rad2Deg = (rad: number) => sanitizeDeg((rad / Math.PI) * 180);

export const deg2Rad = (deg: number) => (sanitizeDeg(deg) / 180) * Math.PI;

export const errorHandler = (e: ErrorResponse, messageApi: MessageInstance) => {
  console.log(e.response?.data);

  const errorMessage =
    e?.response?.data?.message ||
    e?.response?.data?.error.message ||
    "An unknown error occurred";

  void messageApi.error(errorMessage, 5);
};

export const amrId2Color = (amrId: string) => {
  const seed = parseInt(`0x${MD5(amrId).toString()}`, 16);
  const h = (seed % 60) + 200;
  const s = (seed % 20) + 40;
  const l = (seed % 20) + 30;
  const color = `#${convert.hsl.hex([h, s, l])}`;
  return color;
};

export const amrId2ColorRainbow = (amrId: string) => {
  const seed = parseInt(`0x${MD5(amrId).toString()}`, 16);
  const h = seed % 360;
  const s = (seed % 70) + 80;
  const l = (seed % 60) + 10;
  const color = `#${convert.hsl.hex([h, s, l])}`;
  return color;
};
