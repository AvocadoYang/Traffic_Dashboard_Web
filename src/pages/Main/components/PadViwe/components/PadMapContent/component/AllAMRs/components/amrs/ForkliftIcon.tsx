import useAMRsample from "@/api/useAMRsample";
import useMap from "@/api/useMap";
import { translate } from "@/i18n";
import { robotControl } from "@/pages/Setting/formComponent/forms/missionComponents/editMission/humanRobotEditMissionSlice/params";
import { useAmrPose, useIsCarry, useIsPause } from "@/sockets/useAMRInfo";
import { AmrFilterCarCard, showZoneForbidden } from "@/utils/gloable";
import { Tooltip } from "antd";
import { useAtom, useAtomValue } from "jotai";
import { FC, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const IconWrapper = styled.div.attrs<{
  left: number;
  top: number;
}>(({ left, top }) => ({
  style: {
    left,
    top,
    transform: `translate(-50%, -100%)`,
    transition: "x 1s, y 1s",
  },
}))<{
  left: number;
  top: number;
}>`
  position: absolute;
  z-index: 200000;
`;

const ForkliftBody = styled.div.attrs<{
  rotate: number;
  color: string;
}>(({ rotate, color }) => ({
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
  background-color: ${(p) => p.color};
  border-radius: 3px;
  position: relative;
  /* 旋轉中心放在叉臂根部 */
  transform-origin: center bottom;
  opacity: 80%;
  border: "1px solid gray";
  border: ${(p) => `1px solid ${p.color}`};
  cursor: pointer;
`;

const Cargo = styled.div`
  width: 15px;
  height: 10px;
  background: #ff7875;
  border: 1px solid white;
  position: absolute;
  bottom: -15px;
  opacity: 80%;
  left: -1px;
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

const ForkArm = styled.div`
  width: 3px;
  height: 12px;
  background: #333;
  opacity: 75%;
  position: absolute;
  bottom: -11px; // 與車身接點
  border-radius: 1px;
`;

const LeftFork = styled(ForkArm)`
  left: 9px;
`;

const RightFork = styled(ForkArm)`
  right: 9px;
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

const ForkLiftIcon: FC<{
  amrId: string;
  color: string;
  left: number;
  top: number;
  yaw: number;
}> = ({ amrId, color, left, top, yaw }) => {
  const size = useRef<{ width: number; length: number }>({
    width: 1,
    length: 1,
  });
  const { data: map } = useMap();
  const { pose } = useAmrPose(amrId);
  const { isCarry } = useIsCarry(amrId);
  const { data: robotTypes } = useAMRsample();
  const { isPause } = useIsPause(amrId);
  const { t } = useTranslation();

  useEffect(() => {
    if (!robotTypes) return;
    const type = amrId.split("-").slice(0, -1).join("-");
    const amrSize = robotTypes.filter((amr) => type.includes(amr.value));
    if (!amrSize.length) {
      size.current = { width: 1, length: 1 };
    } else {
      const m = amrSize[0];
      size.current = { width: m.width, length: m.length };
    }
  }, [robotTypes]);

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
      className={`${needOpacity ? "opacity-icon" : ""}`}
    >
      <ForkliftBody
        rotate={amrId.includes("SW15") ? 90 - yaw + 180 : 90 - yaw}
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
        <LeftFork />
        <RightFork />
        {isCarry && <Cargo />}
        {isPause && (
          <Tooltip color="volcano" title={t("mode.isPause")}>
            <StopSignOverlay />
          </Tooltip>
        )}
      </ForkliftBody>
    </IconWrapper>
  );
};

export default ForkLiftIcon;
