import useAMRsample from "@/api/useAMRsample";
import useMap from "@/api/useMap";
import { translate } from "@/i18n";
import { robotControl } from "@/pages/Setting/formComponent/forms/missionComponents/editMission/humanRobotEditMissionSlice/params";
import { useAmrPose, useIsCarry, useIsPause } from "@/sockets/useAMRInfo";
import { AmrFilterCarCard, showZoneForbidden } from "@/utils/gloable";
import { Tooltip } from "antd";
import { useAtom, useAtomValue } from "jotai";
import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const IconWrapper = styled.div.attrs<{
  left: number;
  top: number;
  amrId: string;
}>(({ left, top, amrId }) => ({
  style: {
    left,
    top,
    transform: amrId.includes("mi")
      ? "translate(-50%, -50%)"
      : "translate(-50%, -100%)",
    transition: "x 1s, y 1s",
  },
}))<{
  left: number;
  top: number;
}>`
  position: absolute;
  z-index: 200000;
`;

const SquareBody = styled.div.attrs<{
  rotate: number;
  color: string;
  $width: number;
  $length: number;
}>(({ rotate, $width, $length }) => ({
  style: {
    transform: `rotate(${rotate}deg)`,
    transition: "x 1s, y 1s",
    width: $width,
    height: $length,
  },
}))<{
  rotate: number;
  color: string;
  $width: number;
  $length: number;
}>`
  background-color: ${(p) => p.color};
  border-radius: 3px;
  position: relative;
  /* 旋轉中心放在叉臂根部 */
  transform-origin: center;
  opacity: 80%;
  border: "1px solid gray";
  border: ${(p) => `1px solid ${p.color}`};
  cursor: pointer;

  /* 車子的代表色有深有淺,底圖跟著深色主題變深時,深色的車會跟底圖糊在一起,
     所以補一圈淺色的外框 */
  [data-map-canvas="dark"] & {
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.7);
  }
`;

/*
 * 堆高機本體 (俯視): 倒角的車身 + 桅桿橫條 + 兩根尖頭叉臂 + 指向前進方向 (車身那一端) 的箭頭。
 * 外層這顆 div 只負責旋轉 (旋轉中心放在叉臂根部)、點擊、跟車身一樣大的定位框,
 * 讓載貨方塊與暫停圖示照舊貼在車身上; 形狀都在 SVG 裡。純向量, 沒有濾鏡。
 */
const ForkliftBody = styled.div.attrs<{
  rotate: number;
  color: string;
}>(({ rotate }) => ({
  style: {
    transform: `rotate(${rotate}deg)`,
    transition: "x 1s, y 1s",
  },
}))<{
  rotate: number;
  color: string;
}>`
  width: 15px;
  height: 20px;
  position: relative;
  transform-origin: center bottom;
  cursor: pointer;

  svg {
    position: absolute;
    left: 0;
    top: 0;
    overflow: visible;
    pointer-events: none;
  }

  .shape {
    stroke: rgba(0, 0, 0, 0.4);
    stroke-width: 0.8;
    stroke-linejoin: miter;
  }
  .fork {
    fill: #2b2b2b;
  }

  /* 車子的代表色有深有淺,底圖跟著深色主題變深時,深色的車會跟底圖糊在一起,
     所以改用淺色外框, 叉臂也換成淺色 */
  [data-map-canvas="dark"] & .shape {
    stroke: rgba(255, 255, 255, 0.8);
  }
  [data-map-canvas="dark"] & .fork {
    fill: #dcdcdc;
  }
`;

/** 堆高機形狀 (viewBox 跟車身一樣 15×20, 叉臂往下超出到 31, 靠 overflow: visible 顯示) */
const ForkliftShape: FC<{ color: string }> = ({ color }) => (
  <svg width="15" height="20" viewBox="0 0 15 20" aria-hidden>
    <polygon className="fork shape" points="2.4,19 5.4,19 4.9,31 2.9,31" />
    <polygon className="fork shape" points="9.6,19 12.6,19 12.1,31 10.1,31" />
    <polygon
      className="shape"
      fill={color}
      fillOpacity={0.92}
      points="0,4 4,0 11,0 15,4 15,18 0,18"
    />
    <rect x="0" y="16" width="15" height="3.2" fill="#262626" fillOpacity={0.85} />
    <polygon
      fill="#fff"
      fillOpacity={0.85}
      points="7.5,9.5 4.3,13.5 6,13.5 7.5,11.4 9,13.5 10.7,13.5"
    />
  </svg>
);

const Cargo = styled.div`
  /* 載在叉臂上的貨: 22x16, 比車身 (15) 寬一點, 蓋住叉臂並超出一點 */
  width: 22px;
  height: 16px;
  box-sizing: border-box;
  background: #ff7875;
  border: 1px solid white;
  position: absolute;
  bottom: -18px;
  opacity: 80%;
  left: -3.5px;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.2);

  /* &::before,
  &::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    width: 90%;
    border-radius: 50%;
    height: 2px;
    background: black;
  }

  /* 第一條對角線 */
  &::before {
    transform: translate(-50%, -50%) rotate(45deg);
  }

  /* 第二條對角線 */
  &::after {
    transform: translate(-50%, -50%) rotate(-45deg);
  }
`;

const MiRDirection = styled.div`
  position: absolute;
  top: 1px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.8));
`;

const NoseChevron = styled.div`
  width: 9px;
  height: 3px;
  background: #ffffff;
  clip-path: polygon(50% 0%, 100% 60%, 100% 100%, 50% 40%, 0% 100%, 0% 60%);
`;

const MiRCargo = styled.div`
  position: absolute;
  inset: -3px;
  background: #ff7875;
  opacity: 60%;
  border-radius: 2px;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.2);
`;

const StopSignOverlay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 30px;
  background: #ff4d50cc;
  /* border: 2px solid #ffffff; */
  clip-path: polygon(
    30% 0%,
    70% 0%,
    100% 30%,
    100% 70%,
    70% 100%,
    30% 100%,
    0% 70%,
    0% 30%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(255, 77, 79, 0.6);
  z-index: 10;
  animation: pulses 1.5s ease-in-out infinite;

  @keyframes pulses {
    0%,
    100% {
      background: #ff4d50;
      transform: translate(-50%, -50%);
    }
    50% {
      background: #ff4d50cc;
      transform: translate(-40%, -50%);
    }
  }

  &::before {
    content: "";
    position: absolute;
    width: 10px;
    height: 10px;
    background: #ffffff;
    border-radius: 50%;
  }

  &::after {
    content: "";
    position: absolute;
    width: 2px;
    height: 10px;
    background: #ff4d4f;
    border-radius: 1px;
  }
`;

/** MiR 圖示寬度固定 (px), 只有長度跟著車型等比例 */
const MIR_WIDTH = 15;
/** 查不到車型長度時的 MiR 圖示長度 (px) */
const MIR_FALLBACK_LENGTH = 20;

/** 跟後端 checkAMRSize 一樣: 車號 (有 # 取 # 後面) 的前三段就是車型的 value */
const robotTypeValueOf = (amrId: string) =>
  (amrId.includes("#") ? amrId.split("#")[1] : amrId)
    .split("-")
    .slice(0, 3)
    .join("-");

const ForkLiftIcon: FC<{
  amrId: string;
  color: string;
  left: number;
  top: number;
  yaw: number;
}> = ({ amrId, color, left, top, yaw }) => {
  const { data: map } = useMap();
  const { pose } = useAmrPose(amrId);
  const { isCarry } = useIsCarry(amrId);
  const { data: robotTypes } = useAMRsample();
  const { isPause } = useIsPause(amrId);
  const { t } = useTranslation();

  // MiR 圖示的長度照車型的實際長度 (公尺) 換成地圖像素, 跟底圖等比例
  const mirLength = useMemo(() => {
    if (!map?.mapResolution) return MIR_FALLBACK_LENGTH;
    const value = robotTypeValueOf(amrId);
    const type = robotTypes?.find((r) => r.value === value);
    if (!type || type.length <= 0) return MIR_FALLBACK_LENGTH;
    return type.length / map.mapResolution;
  }, [robotTypes, amrId, map?.mapResolution]);

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
  }, [amrFilterCarCard, zoneForbidden, robotTypes]);

  if (!robotTypes || !map || !pose) return <></>;

  return (
    <IconWrapper
      left={left}
      top={top}
      amrId={amrId}
      className={`${needOpacity ? "opacity-icon" : ""}`}
    >
      {amrId.includes("mi") ? (
        <SquareBody
          rotate={90 - yaw}
          color={color}
          $width={MIR_WIDTH}
          $length={mirLength}
        >
          <MiRDirection>
            <NoseChevron />
          </MiRDirection>
          {isCarry && <MiRCargo />}
        </SquareBody>
      ) : (
        <ForkliftBody
          rotate={90 - yaw}
          color={color}
          onClick={() => {
            setAmrFilterCarCard((pre) => {
              if (pre.has(amrId)) {
                pre.delete(amrId);
                return new Set([...pre]);
              } else {
                pre.add(amrId);
                return new Set([...pre]);
              }
            });
          }}
        >
          <ForkliftShape color={color} />
          {isCarry && <Cargo />}
          {isPause && (
            <Tooltip color="volcano" title={t("mode.isPause")}>
              <StopSignOverlay />
            </Tooltip>
          )}
        </ForkliftBody>
      )}
    </IconWrapper>
  );
};

export default ForkLiftIcon;
