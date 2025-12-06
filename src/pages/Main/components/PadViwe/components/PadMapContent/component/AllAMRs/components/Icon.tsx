import { FC, memo, useMemo } from "react";
import styled from "styled-components";
import {
  AGV_HEIGHT,
  AGV_WIDTH,
  AMR_FORK_HEIGHT,
  AMR_FORK_WIDTH,
} from "@/configs/config";
import useMap from "@/api/useMap";
import { useAtom, useAtomValue } from "jotai";
import { AmrFilterCarCard, showZoneForbidden } from "@/utils/gloable";
import { useAmrPose, useIsCarry } from "@/sockets/useAMRInfo";

const colors = {
  defaultBorder: "gray",
  carryingBorder: "#ff4d4f",
  carryingShadow: "rgba(255, 77, 79, 0.3)",
  cargoBox: "#ff7875",
};

const Dot = styled.div<{
  left: number;
  top: number;
}>`
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: #ff4d4f;
  position: absolute;
  left: ${(p) => p.left}px;
  top: ${(p) => p.top}px;
  z-index: 300000;
  box-shadow: 0 0 4px rgba(255, 77, 79, 0.6);
  transform: translate(-50%, -50%);
`;

const PointDot: FC<{ x: number; y: number }> = ({ x, y }) => {
  return <Dot left={x} top={y} />;
};


const ColorAmr = styled.div.attrs<{
  width: number;
  height: number;
  color: string;
  left: number;
  top: number;
  is_agv: string;
  rotate: number;
  $isCarry: boolean;
}>(({ left, top, is_agv, rotate, width, height }) => ({
  style: {
    width: `${is_agv === "true" ? width - 5 : width - 14}px`,
    height: `${is_agv === "true" ? height : height - 23}px`,
    left,
    top,
    transform: `${is_agv === "true" ? `rotate(${rotate}deg)` : `translate(-40%, -50%) rotate(${rotate}deg)`}`,
    transition: "x 1s, y 1s",
  },
}))<{
  width: number;
  height: number;
  color: string;
  is_agv: string;
  left: number;
  top: number;
  rotate: number;
  $isCarry: boolean;
}>`
  width: ${(prop) =>
    prop.is_agv === "true" ? prop.width - 5 : prop.width - 14}px;
  height: ${(prop) =>
    prop.is_agv === "true" ? prop.height : prop.height - 23}px;
  cursor: pointer;
  position: absolute;
  z-index: 200000;
  background-color: ${(prop) => prop.color};
  transform-origin: center center;
  border-radius: 2px;
  border: ${(props) =>
    props.is_agv === "true"
      ? `1px solid ${props.$isCarry ? colors.carryingBorder : colors.defaultBorder}`
      : "none"};
  box-shadow: ${(props) =>
    props.$isCarry ? `0 0 8px ${colors.carryingShadow}` : "none"};
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease;
`;

const Fork = styled.div<{
  direct: string;
}>`
  height: 55%;
  width: 15%;
  background-color: #424141;
  border-radius: 0px 0px 1px 1px;
  position: absolute;
  left: ${(prop) => (prop.direct === "left" ? "20%" : "65%")};
  bottom: -53%;
`;

const CargoBox = styled.div`
  position: absolute;
  bottom: -26%;
  left: 20%;
  width: 60%;
  height: 46%;
  background-color: ${colors.cargoBox};
  border: 1px solid #fff;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
  z-index: 200001;
`;

const Icon: FC<{
  amrId: string;
  color: string;
  left: number;
  top: number;
}> = ({ amrId, color, left, top }) => {
  const { data: map } = useMap();
  const { pose } = useAmrPose(amrId);
  const { isCarry } = useIsCarry(amrId);
  const [amrFilterCarCard, setAmrFilterCarCard] = useAtom(AmrFilterCarCard);
  const zoneForbidden = useAtomValue(showZoneForbidden);

  const needOpacity = useMemo(() => {
    if (!amrFilterCarCard.size && !zoneForbidden.size) {
      return false;
    }

    if (amrFilterCarCard.size) {
      return amrFilterCarCard.has(amrId) ? false : true;
    } else {
      return zoneForbidden.has(amrId) ? false : true;
    }
  }, [amrFilterCarCard, zoneForbidden]);

  if (!map || !pose) return null;

  return (
    // <ColorAmr
    //   className={`${needOpacity ? "opacity-icon" : ""}`}
    //   onClick={() => {
    //     setAmrFilterCarCard((pre) => {
    //       if (pre.has(amrId)) {
    //         pre.delete(amrId);
    //         return new Set([...pre]);
    //       } else {
    //         pre.add(amrId);
    //         return new Set([...pre]);
    //       }
    //     });
    //   }}
    //   width={
    //     amrId.includes("SW15")
    //       ? AGV_WIDTH / map.mapResolution
    //       : AMR_FORK_WIDTH / map.mapResolution
    //   }
    //   height={
    //     amrId.includes("SW15")
    //       ? AGV_HEIGHT / map.mapResolution
    //       : AMR_FORK_HEIGHT / map.mapResolution
    //   }
    //   left={left}
    //   top={top}
    //   color={color}
    //   rotate={amrId.includes("SW15") ? 90 - pose.yaw + 180 : 90 - pose.yaw}
    //   is_agv={amrId.includes("SW15").toString()}
    //   $isCarry={isCarry as boolean}
    // >
    //   {amrId.includes("anfa") ? <Fork direct="left" /> : null}
    //   {amrId.includes("anfa") ? <Fork direct="right" /> : null}
    //   {isCarry && amrId.includes("anfa") && <CargoBox />}{" "}
    // </ColorAmr>
    <Dot left={left} top={top}></Dot>
  );
};

export default memo(Icon);
