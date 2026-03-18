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
  MissionTag,
  PowerTag,
  StateTag,
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
    const { isOnline, networkDelay, isOverdue } = useIsLogIn(amrId);
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
              isOnline
                ? isOverdue
                  ? "overdue-text"
                  : "online-text"
                : "offline-text"
            }`}
          >
            {isOnline ? (
              isOverdue ? (
                <WramOverdue>{t("utils.overdue")}</WramOverdue>
              ) : (
                t("utils.online")
              )
            ) : (
              t("utils.offline")
            )}
          </span>

          {isOnline && !isOverdue && (
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
          {isOnline ? (
            <p className={`amr-is-registerd`}>
              {`-- ${t("utils.is_registered")} --`}
            </p>
          ) : (
            <p className={`amr-is-registerd`}>
              {`-- ${t("utils.not_registered")} --`}
            </p>
          )}
        </AmrTitle>
      </CarRow1>
    );
  },
);

// ======Second row in info card ============

const LocValue: React.FC<{ amrId: string; isDark: boolean }> = memo(
  ({ amrId, isDark }) => {
    const { closeLoc } = useCloseLoc(amrId);
    return (
      <p className={`value location-drawer ${isDark ? "dark-icon" : ""}`}>
        {/* {((x: number | undefined, y: number | undefined) => {
              if (x === undefined || y === undefined)
                return undefined;
              return `${x.toFixed(2)}/${y.toFixed(2)}`;
            })(fleetInfo.originPose?.x, fleetInfo.originPose?.y)} */}
        {`${closeLoc ? closeLoc : "--"}`}
      </p>
    );
  },
);
const CardSpeed: React.FC<{ amrId: string; isDark: boolean }> = memo(
  ({ isDark, amrId }) => {
    const { speed } = useSpeed(amrId);
    return (
      <p className="value">
        {Math.abs(Number(speed) * 100)
          .toFixed(2)
          .toString()}
        <span className={`${isDark ? "symbol-dark" : "symbol"}`}>{"cm/s"}</span>
      </p>
    );
  },
);
const Power: React.FC<{ amrId: string; isDark: boolean }> = memo(
  ({ amrId, isDark }) => {
    const { battery } = useBattery(amrId);
    return (
      <>
        <ThunderboltOutlined
          className={`icon power-icon ${isDark ? "dark-icon power-icon-dark" : ""} ${battery ? (battery < 20 ? "low-battery" : "") : ""}`}
        />
        <p className="value">
          {/* {fleetInfo.data.IO?.battery} */}
          {`${battery ? battery : "--"}`}
          <span
            className={`${isDark ? "symbol-dark" : "symbol"}`}
          >{`${battery ? "%" : ""}`}</span>
        </p>
      </>
    );
  },
);
const Yaw: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { yaw } = useYaw(amrId);
  return (
    <p className="value">
      {/* {((yaw: number | undefined) => {
                        if (yaw === undefined) return undefined;
                        return parseFloat(yaw.toFixed(2));
                      })(fleetInfo.originPose?.yaw)} */}
      {`${yaw !== undefined ? yaw.toFixed(2) : "--"}`}
    </p>
  );
});

export const RowSecond: React.FC<{
  setOpenHiddenRow: React.Dispatch<boolean>;
  openHiddenRow: boolean;
  isDark: boolean;
  amrId: string;
}> = memo(({ setOpenHiddenRow, openHiddenRow, isDark, amrId }) => {
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
        <LocValue amrId={amrId} isDark={isDark}></LocValue>
      </Space>
      <Space
        orientation="vertical"
        size={1}
        style={{ textAlign: "center", width: "18%" }}
      >
        <CarOutlined
          className={`icon speed-icon ${isDark ? "dark-icon" : ""}`}
        />
        <CardSpeed amrId={amrId} isDark={isDark}></CardSpeed>
      </Space>
      <Space
        orientation="vertical"
        size={1}
        style={{ textAlign: "center", width: "18%" }}
      >
        <Power amrId={amrId} isDark={isDark}></Power>
      </Space>
      <Space
        orientation="vertical"
        size={1}
        style={{ textAlign: "center", width: "18%" }}
      >
        <CompassOutlined
          className={`icon yaw-icon ${isDark ? "dark-icon yaw-icon-dark" : ""}`}
        />
        <Yaw amrId={amrId}></Yaw>
      </Space>
    </Flex>
  );
});

//=======Hidden row ===================
const LocXY: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { loc } = useXY(amrId);
  if (!loc)
    return (
      <p style={{ marginTop: "5px" }}>{`X:
      -- / Y: --`}</p>
    );
  return (
    <p style={{ marginTop: "5px" }}>{`X:
    ${loc.x !== undefined ? loc.x.toFixed(2) : "--"} / Y: ${loc.y !== undefined ? loc.y.toFixed(2) : "--"}`}</p>
  );
});
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
  return (
    <HiddenInfo
      open_hidden_row={openHiddenRow.toString()}
      is_dark={isDark.toString()}
    >
      <LocXY amrId={amrId}></LocXY>
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
const Statue: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { status } = useAmrStatus(amrId);

  return <CarStatus>{status ? status : "---------------"}</CarStatus>;
});

export const RowThread: React.FC<{ isDark: boolean; amrId: string }> = memo(
  ({ isDark, amrId }) => {
    const { t } = useTranslation();
    return (
      <CarRow3 is_dark={isDark.toString()}>
        <span
          className={`third-row-span ${isDark ? "third-row-span-dark" : ""}`}
        >{`${t("utils.status")}:`}</span>
        <Statue amrId={amrId}></Statue>
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

const RoadStatue: React.FC<{ amrId: string }> = ({ amrId }) => {
  const status = useRoadConditions(amrId);
  return (
    <RoadStyle
      style={{ color: `${status === "順暢" ? "#41cd16" : "#585757"}` }}
    >
      {status ? status : "---------------"}
    </RoadStyle>
  );
};

const MaintenanceStatue: React.FC<{ amrId: string }> = ({ amrId }) => {
  const status = useMaintenanceStatus(amrId);
  return <RoadStyle style={{ color: "#585757" }}>{status.status}</RoadStyle>;
};

export const RowFourth: React.FC<{ isDark: boolean; amrId: string }> = memo(
  ({ isDark, amrId }) => {
    const { t } = useTranslation();
    return (
      <CarRow3 is_dark={isDark.toString()}>
        <span
          className={`third-row-span ${isDark ? "third-row-span-dark" : ""}`}
        >{`${t("utils.road_conditions")}:`}</span>
        <RoadStatue amrId={amrId}></RoadStatue>
      </CarRow3>
    );
  },
);

export const RowFifth: React.FC<{ isDark: boolean; amrId: string }> = memo(
  ({ isDark, amrId }) => {
    const { t } = useTranslation();
    return (
      <CarRow3 is_dark={isDark.toString()}>
        <span
          className={`third-row-span ${isDark ? "third-row-span-dark" : ""}`}
        >{`${t("utils.maintenance_level")}:`}</span>
        <MaintenanceStatue amrId={amrId}></MaintenanceStatue>
      </CarRow3>
    );
  },
);

// ======= Tag Wrap ==============

export const CarTag: React.FC<{ openFullInfo: boolean; amrId: string }> = memo(
  ({ openFullInfo, amrId }) => {
    const { isOverdue } = useIsLogIn(amrId);
    return (
      <Flex
        justify="center"
        align="center"
        className={` ${openFullInfo ? "full-tag-wrap" : "hide-tag-wrap"}`}
        wrap
        gap={"small"}
      >
        {isOverdue ? <></> : <ManualTag amrId={amrId} />}
        <MissionTag amrId={amrId} />
        <CarryTag amrId={amrId} />
        <ChargingTag amrId={amrId} />
        <PowerTag amrId={amrId} />
        <IsPause amrId={amrId} />
        <StateTag amrId={amrId} />
        {isOverdue ? <></> : <IsPosAccurate amrId={amrId}></IsPosAccurate>}
      </Flex>
    );
  },
);
