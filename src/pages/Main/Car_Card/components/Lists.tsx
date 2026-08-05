import { memo, useMemo } from "react";
import styled, { keyframes, css } from "styled-components";
import "../car_info.css";

import {
  EnvironmentOutlined,
  ThunderboltOutlined,
  CompassOutlined,
  CarOutlined,
  CaretUpOutlined,
  CaretDownOutlined,
} from "@ant-design/icons";
import { Space, Flex, Tag } from "antd";
import {
  useAmrStatus,
  useBattery,
  useCloseLoc,
  useIsLogIn,
  useYaw,
  useXY,
  useMaintenanceStatus,
  useSpeed,
} from "@/sockets/useAMRInfo";
import { useTranslation } from "react-i18next";
import {
  CarryTag,
  ChargingTag,
  IsPause,
  IsPosAccurate,
  ManualTag,
  MiR_Error,
  MissionTag,
  PowerTag,
} from "./Tags";
import useRoadConditions from "@/sockets/useAmrRoadConditions";

const shak = keyframes`
  0%,
  65% {
    -webkit-transform: rotate(0deg);
    transform: rotate(0deg);
  }

  70% {
    -webkit-transform: rotate(6deg);
    transform: rotate(6deg);
  }

  75% {
    -webkit-transform: rotate(-6deg);
    transform: rotate(-6deg);
  }

  80% {
    -webkit-transform: rotate(6deg);
    transform: rotate(6deg);
  }

  85% {
    -webkit-transform: rotate(-6deg);
    transform: rotate(-6deg);
  }

  90% {
    -webkit-transform: rotate(6deg);
    transform: rotate(6deg);
  }

  95% {
    -webkit-transform: rotate(-6deg);
    transform: rotate(-6deg);
  }

  100% {
    -webkit-transform: rotate(0deg);
    transform: rotate(0deg);
  }
`;

export const EmergencyIcon = styled.div`
  width: 1rem;
  height: 1rem;

  position: absolute;

  font-size: 1.5em;
  /* top: 7%;
  right: 50%; */
  top: -0.9rem;
  left: 5%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  ${() => css`
    animation: ${shak} 1s infinite ease-in-out;
  `}
`;

// ======= DropArrow =================
const Arrow = styled.div<{ random_color: string }>`
  width: 1rem;
  height: 1rem;
  border: 2px solid gray;
  border: 2px solid ${({ random_color }) => random_color}; /* Use template literal for dynamic border color */
  border-radius: 50%;
  position: absolute;
  background-color: ${({ random_color }) =>
    random_color}; /* Use template literal for dynamic background color */

  /* top: 7%;
  right: -5%; */
  top: -0.3rem;
  right: -0.12rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

export const DropDown: React.FC<{
  color: string;
  openFullInfo: boolean;
  setOpenFullInfo: React.Dispatch<boolean>;
}> = memo(({ color, openFullInfo, setOpenFullInfo }) => {
  return (
    <Arrow
      random_color={color}
      onClick={(e) => {
        e.stopPropagation();
        setOpenFullInfo(!openFullInfo);
      }}
    >
      {openFullInfo ? (
        <CaretUpOutlined style={{ color: "white" }} />
      ) : (
        <CaretDownOutlined style={{ color: "white" }} />
      )}
    </Arrow>
  );
});
// ======= Login status icon ==========
export const LogInStatus = styled.p.attrs<{ login: string }>((props) => {
  return { login: props.login };
})<{ login: string }>`
  background-color: ${(props) => (props.login === "true" ? "	#2eb800" : "red")};
  width: 0.6em;
  height: 0.6em;
  margin-left: 3%;
  border-radius: 50%;
`;

// ======= First row in info card =======
export const CarRow1 = styled.div.attrs<{ is_dark: string }>((props) => {
  return { is_dark: props.is_dark };
})<{ is_dark: string }>`
  width: 100%;
  display: flex;
  overflow: hidden;
  border-bottom: ${(props) => {
    return props.is_dark === "true" ? "1px solid #c0c0c0" : "1px solid black";
  }};
  align-items: center;
  padding: 8px;
  color: ${(props) => {
    return props.is_dark === "true" ? "#ffffff" : "#242222";
  }};
  justify-content: space-around;
`;

const NetworkDelay = styled.p<{ delay: number | undefined }>`
  font-weight: bold;
  font-size: 0.8em;
  color: ${({ delay }) => {
    if (delay === undefined) return "gray";
    if (delay <= 100) return "green";
    if (delay <= 300) return "orange";
    return "red";
  }};
`;

const WramOverdue = styled.span`
  color: red;
`;

export const AmrTitle = styled.h2`
  font-size: 90%;
  line-height: 100%;
  text-align: center;
  /* font-weight: bold; */
  width: 80%;

  white-space: nowrap;
`;

export const RowOne: React.FC<{ isDark: boolean; amrId: string }> = memo(
  ({ isDark, amrId }) => {
    const { networkDelay, isOverdue } = useIsLogIn(amrId);
    const { t } = useTranslation();

    const AmrID = useMemo(() => {
      return {
        num: amrId.split("-")[amrId.split("-").length - 1],
        category: amrId.split("-").slice(0, 3).join("-"),
      };
    }, [amrId]);
    return (
      <CarRow1 is_dark={isDark.toString()}>
        <div>
          <LogInStatus login={isOverdue ? "false" : "true"} />

          <span
            className={`login-text ${
              isOverdue ? "offline-text" : "online-text"
            }`}
          >
            {isOverdue ? t("utils.offline") : t("utils.online")}
          </span>

          {!isOverdue && (
            <NetworkDelay delay={networkDelay}>
              {networkDelay !== undefined ? `${networkDelay} ms` : "--"}
            </NetworkDelay>
          )}
        </div>

        <AmrTitle>
          <div
            style={{ marginBottom: "5px" }}
          >{`${t("utils.num")} ${AmrID.num}`}</div>
          <span
            className={`${isDark ? "amr-title-category-dark-mode" : "amr-title-category"}`}
          >
            {`${t("utils.category")}: ${AmrID.category}`}
          </span>
        </AmrTitle>
      </CarRow1>
    );
  },
);

// ======Second row in info card ============

const LocValue: React.FC<{
  amrId: string;
  isDark: boolean;
  isOffline?: boolean;
}> = memo(({ amrId, isDark, isOffline }) => {
  const { closeLoc } = useCloseLoc(amrId);
  return (
    <p className={`value location-drawer ${isDark ? "dark-icon" : ""}`}>
      {`${!isOffline && closeLoc ? closeLoc : "--"}`}
    </p>
  );
});
const CardSpeed: React.FC<{
  amrId: string;
  isDark: boolean;
  isOffline?: boolean;
}> = memo(({ isDark, amrId, isOffline }) => {
  const { speed } = useSpeed(amrId);
  const displaySpeed = isOffline ? undefined : speed;
  return (
    <p className="value">
      {displaySpeed != null ? Math.abs(Number(displaySpeed)).toFixed(2) : "--"}
      <span className={`${isDark ? "symbol-dark" : "symbol"}`}>{"m/s"}</span>
    </p>
  );
});
const Power: React.FC<{ amrId: string; isDark: boolean; isOffline?: boolean }> =
  memo(({ amrId, isDark, isOffline }) => {
    const { battery } = useBattery(amrId);
    const displayBattery = isOffline ? undefined : battery;
    return (
      <>
        <ThunderboltOutlined
          className={`icon power-icon ${isDark ? "dark-icon power-icon-dark" : ""} ${displayBattery ? (displayBattery < 20 ? "low-battery" : "") : ""}`}
        />
        <p className="value">
          {`${displayBattery ? displayBattery.toFixed(1) : "--"}`}
          <span
            className={`${isDark ? "symbol-dark" : "symbol"}`}
          >{`${displayBattery ? "%" : ""}`}</span>
        </p>
      </>
    );
  });
const Yaw: React.FC<{ amrId: string; isOffline?: boolean }> = memo(
  ({ amrId, isOffline }) => {
    const { yaw } = useYaw(amrId);
    const displayYaw = isOffline ? undefined : yaw;
    return (
      <p className="value">
        {`${displayYaw !== undefined ? displayYaw.toFixed(2) : "--"}`}
      </p>
    );
  },
);

export const RowSecond: React.FC<{
  setOpenHiddenRow: React.Dispatch<boolean>;
  openHiddenRow: boolean;
  isDark: boolean;
  amrId: string;
}> = memo(({ setOpenHiddenRow, openHiddenRow, isDark, amrId }) => {
  const { isOverdue } = useIsLogIn(amrId);
  return (
    <Flex
      className={`${isDark ? "second-row-wrap" : ""}`}
      align="center"
      justify="space-around"
      style={{ margin: "1.5px 0 1px 0" }}
    >
      <Space
        orientation="vertical"
        size={1}
        style={{ textAlign: "center", width: "18%", cursor: "pointer" }}
        onClick={(e) => {
          e.stopPropagation();
          setOpenHiddenRow(!openHiddenRow);
        }}
        className="location-drawer"
      >
        <EnvironmentOutlined
          className={`icon location-drawer location-icon ${isDark ? "dark-icon location-icon-dark" : ""}`}
        />
        <LocValue
          amrId={amrId}
          isDark={isDark}
          isOffline={isOverdue}
        ></LocValue>
      </Space>
      <Space
        orientation="vertical"
        size={1}
        style={{ textAlign: "center", width: "18%" }}
      >
        <CarOutlined
          className={`icon speed-icon ${isDark ? "dark-icon" : ""}`}
        />
        <CardSpeed
          amrId={amrId}
          isDark={isDark}
          isOffline={isOverdue}
        ></CardSpeed>
      </Space>
      <Space
        orientation="vertical"
        size={1}
        style={{ textAlign: "center", width: "18%" }}
      >
        <Power amrId={amrId} isDark={isDark} isOffline={isOverdue}></Power>
      </Space>
      <Space
        orientation="vertical"
        size={1}
        style={{ textAlign: "center", width: "18%" }}
      >
        <CompassOutlined
          className={`icon yaw-icon ${isDark ? "dark-icon yaw-icon-dark" : ""}`}
        />
        <Yaw amrId={amrId} isOffline={isOverdue}></Yaw>
      </Space>
    </Flex>
  );
});

//=======Hidden row ===================
const LocXY: React.FC<{ amrId: string; isOffline?: boolean }> = memo(
  ({ amrId, isOffline }) => {
    const { loc } = useXY(amrId);
    if (isOffline || !loc)
      return (
        <p style={{ marginTop: "5px" }}>{`X:
      -- / Y: --`}</p>
      );
    return (
      <p style={{ marginTop: "5px" }}>{`X:
    ${loc.x !== undefined ? loc.x.toFixed(2) : "--"} / Y: ${loc.y !== undefined ? loc.y.toFixed(2) : "--"}`}</p>
    );
  },
);
const HiddenInfo = styled.div.attrs<{
  open_hidden_row: string;
  is_dark: string;
}>((props) => {
  return { open_hidden_row: props.open_hidden_row, is_dark: props.is_dark };
})<{ open_hidden_row: string; is_dark: string }>`
  height: ${(props) => (props.open_hidden_row === "true" ? "25px" : "0px")};
  color: ${(props) => (props.is_dark === "true" ? "white" : "black")};
  overflow: hidden;
  text-align: center;
  font-size: 90%;
  transition: 0.5s;
`;
export const HiddenRow: React.FC<{
  openHiddenRow: boolean;
  isDark: boolean;
  amrId: string;
}> = memo(({ openHiddenRow, isDark, amrId }) => {
  const { isOverdue } = useIsLogIn(amrId);
  return (
    <HiddenInfo
      open_hidden_row={openHiddenRow.toString()}
      is_dark={isDark.toString()}
    >
      <LocXY amrId={amrId} isOffline={isOverdue}></LocXY>
    </HiddenInfo>
  );
});

// ======= Third row in info ===============

const CarRow3 = styled.div.attrs<{ is_dark: string }>((props) => {
  return { is_dark: props.is_dark };
})<{ is_dark: string }>`
  width: 100%;
  display: flex;
  color: ${(props) => (props.is_dark === "true" ? "white" : "black")};
  border-top: ${(props) =>
    props.is_dark === "true" ? "1px dashed white" : "1px dashed gray"};
  justify-content: center;
  align-items: center;
  padding: 5px 5px 5px 8px;
  overflow: hidden;
`;

const CarStatus = styled.span`
  font-weight: bold;
  font-size: 75%;
  text-align: center;
  word-wrap: break-word;
  width: 80%;
  color: red;
  margin-right: 3px;
`;
const Statue: React.FC<{ amrId: string; isOffline?: boolean }> = memo(
  ({ amrId, isOffline }) => {
    const { status } = useAmrStatus(amrId);

    return (
      <CarStatus>
        {isOffline ? "--" : status ? status : "---------------"}
      </CarStatus>
    );
  },
);

export const RowThread: React.FC<{ isDark: boolean; amrId: string }> = memo(
  ({ isDark, amrId }) => {
    const { t } = useTranslation();
    const { isOverdue } = useIsLogIn(amrId);
    return (
      <CarRow3 is_dark={isDark.toString()}>
        <span
          className={`third-row-span ${isDark ? "third-row-span-dark" : ""}`}
        >{`${t("utils.status")}:`}</span>
        <Statue amrId={amrId} isOffline={isOverdue}></Statue>
      </CarRow3>
    );
  },
);

// ======= Fourth row in info ===============

const RoadStyle = styled.span`
  font-weight: bold;
  font-size: 75%;
  text-align: center;
  word-wrap: break-word;
  white-space: normal;
  /* text-align: left; */
  width: 80%;
  /* color: #d10f0f; */
  margin-right: 3px;
`;

const RoadStatue: React.FC<{ amrId: string; isOffline?: boolean }> = ({
  amrId,
  isOffline,
}) => {
  const status = useRoadConditions(amrId);
  if (isOffline) {
    return <RoadStyle style={{ color: "#585757" }}>--</RoadStyle>;
  }
  return (
    <RoadStyle
      style={{ color: `${status === "順暢" ? "#41cd16" : "#585757"}` }}
    >
      {status ? status : "---------------"}
    </RoadStyle>
  );
};

const MaintenanceStatue: React.FC<{ amrId: string; isOffline?: boolean }> = ({
  amrId,
  isOffline,
}) => {
  const status = useMaintenanceStatus(amrId);
  return (
    <RoadStyle style={{ color: "#585757" }}>
      {isOffline ? "--" : status.status}
    </RoadStyle>
  );
};

export const RowFourth: React.FC<{ isDark: boolean; amrId: string }> = memo(
  ({ isDark, amrId }) => {
    const { t } = useTranslation();
    const { isOverdue } = useIsLogIn(amrId);
    return (
      <CarRow3 is_dark={isDark.toString()}>
        <span
          className={`third-row-span ${isDark ? "third-row-span-dark" : ""}`}
        >{`${t("utils.road_conditions")}:`}</span>
        <RoadStatue amrId={amrId} isOffline={isOverdue}></RoadStatue>
      </CarRow3>
    );
  },
);

export const RowFifth: React.FC<{ isDark: boolean; amrId: string }> = memo(
  ({ isDark, amrId }) => {
    const { t } = useTranslation();
    const { isOverdue } = useIsLogIn(amrId);
    return (
      <CarRow3 is_dark={isDark.toString()}>
        <span
          className={`third-row-span ${isDark ? "third-row-span-dark" : ""}`}
        >{`${t("utils.maintenance_level")}:`}</span>
        <MaintenanceStatue
          amrId={amrId}
          isOffline={isOverdue}
        ></MaintenanceStatue>
      </CarRow3>
    );
  },
);

// ======= Tag Wrap ==============

const TagWrap = styled(Flex)<{ $offline: boolean }>`
  &&& {
    flex-wrap: wrap;
  }

  ${({ $offline }) =>
    $offline &&
    css`
      opacity: 0.45;
      filter: grayscale(1);
      pointer-events: none;
    `}
`;

export const CarTag: React.FC<{ openFullInfo: boolean; amrId: string }> = memo(
  ({ openFullInfo, amrId }) => {
    const { isOverdue } = useIsLogIn(amrId);
    return (
      <TagWrap
        justify="center"
        align="center"
        className={` ${openFullInfo ? "full-tag-wrap" : "hide-tag-wrap"}`}
        wrap
        gap={"small"}
        $offline={isOverdue}
      >
        {isOverdue ? <></> : <ManualTag amrId={amrId} />}
        <MissionTag amrId={amrId} />
        <CarryTag amrId={amrId} />
        <ChargingTag amrId={amrId} />
        <PowerTag amrId={amrId} />
        <IsPause amrId={amrId} />
        {amrId.includes("mi") ? <MiR_Error amrId={amrId}></MiR_Error> : <></>}
        {isOverdue || amrId.includes("mi") ? (
          <></>
        ) : (
          <IsPosAccurate amrId={amrId}></IsPosAccurate>
        )}
      </TagWrap>
    );
  },
);
