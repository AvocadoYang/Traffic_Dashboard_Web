import { memo, useEffect, useMemo, useState } from "react";
import styled, { keyframes, css } from "styled-components";
import "../car_info.css";

import {
  EnvironmentOutlined,
  ThunderboltOutlined,
  CompassOutlined,
  CarOutlined,
  CaretUpOutlined,
  CaretDownOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import Icon from "@ant-design/icons";
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
  MaintenanceLevel,
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
  StateTag,
} from "./Tags";
import useRoadConditions from "@/sockets/useAmrRoadConditions";
import useMapGroup from "@/api/useMapGroup";
import useMapList from "@/api/useMapList";
import { useMiRStatus } from "@/sockets/useMirStatus";
import { useSetAtom } from "jotai";
import { JoystickAmrId } from "../../global/jotai";
import MapSwitchModal from "./MapSwitchModal";

const GamepadSvg = () => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 12h4" />
    <path d="M8 10v4" />
    <circle cx="16.3" cy="9.6" r="0.65" />
    <circle cx="18.7" cy="12" r="0.65" />
    <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
  </svg>
);

const GamepadOutlined = (props: { amrId:string, className?: string }) => {
    const setJoystickAmrId = useSetAtom(JoystickAmrId);
  return <Icon onClick={(e) => {
                  e.stopPropagation();
                  setJoystickAmrId(props.amrId);
            }} component={GamepadSvg} {...props} />
  };

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
  white-space: nowrap;
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
        {amrId.includes("mi") ? (
          <GamepadOutlined
            amrId={amrId}
            className={`icon joystick-icon location-drawer location-icon ${isDark ? "dark-icon location-icon-dark" : ""}`}
          />
        ) : (
          <EnvironmentOutlined
            className={`icon location-drawer location-icon ${isDark ? "dark-icon location-icon-dark" : ""}`}
          />
        )}
        {
          amrId.includes("mi") ? <></> :
            <LocValue
                    amrId={amrId}
                    isDark={isDark}
                    isOffline={isOverdue}
            ></LocValue>        
        }
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

const CarRow4 = styled.div.attrs<{ is_dark: string }>((props) => {
  return { is_dark: props.is_dark };
})<{ is_dark: string; $disabled?: boolean }>`
  width: 100%;
  display: flex;
  color: ${(props) => (props.is_dark === "true" ? "white" : "black")};
  border-top: ${(props) =>
    props.is_dark === "true" ? "1px dashed white" : "1px dashed gray"};
  justify-content: center;
  align-items: center;
  padding: 5px 5px 5px 8px;
  overflow: hidden;
  cursor: ${(props) => (props.$disabled ? "default" : "pointer")};
  position: relative;
  border-radius: 4px;
  transition: background-color 0.15s ease;

  ${(props) =>
    !props.$disabled &&
    css`
      &:hover {
        background-color: ${props.is_dark === "true"
          ? "rgba(255, 255, 255, 0.08)"
          : "rgba(0, 0, 0, 0.05)"};
      }

      &:active {
        background-color: ${props.is_dark === "true"
          ? "rgba(255, 255, 255, 0.14)"
          : "rgba(0, 0, 0, 0.09)"};
      }

      &:hover .map-switch-icon {
        opacity: 1;
        transform: translateX(0);
      }
    `}
`;

const MapSwitchIcon = styled(SwapOutlined)`
  font-size: 0.75em;
  margin-left: 4px;
  flex-shrink: 0;
  opacity: 0;
  transform: translateX(-2px);
  transition: opacity 0.15s ease, transform 0.15s ease;
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

const MapValue = styled(RoadStyle)`
  width: 75%;
  margin-left: 5%;
  text-align: left;
`;

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


// 換圖是實際下指令給車體的動作, 車輛必須是 Ready(閒置)狀態才能換, 避免在執行任務中途換圖。
export const MIR_MAP_SWITCHABLE_STATUS = "Ready";

export const MiR_StatusColor = (status: string) => {
  switch (status) {
    case "Ready":
      return "#2f80ed";
    case "Executing":
      return "#27ae60";
    default:
      return "#eb5757";
  }
};

const MiRRunningStatue: React.FC<{ amrId: string; isOffline?: boolean }> = memo(
  ({ amrId, isOffline }) => {
    const [showText, setShowText] = useState<string>("")
    const { status, protectiveStop  } = useMiRStatus(amrId);
    useEffect(() => {
      setShowText(protectiveStop ? "ProtectiveStop": status)
    }, [protectiveStop, status])
    return (
      <CarStatus
        style={{ color: isOffline ? "#585757" : MiR_StatusColor(status) }}
      >
        {isOffline ? "--" : showText ? showText : "---------------"}
      </CarStatus>
    );
  },
);

export const MiR_Running_Status: React.FC<{ isDark: boolean; amrId: string }> = memo(
  ({ isDark, amrId }) => {
    const { t } = useTranslation();
    const { isOverdue } = useIsLogIn(amrId);
    return (
      <CarRow3 is_dark={isDark.toString()}>
        <span
          className={`third-row-span ${isDark ? "third-row-span-dark" : ""}`}
        >{`${t("utils.status")}:`}</span>
        <MiRRunningStatue amrId={amrId} isOffline={isOverdue}></MiRRunningStatue>
      </CarRow3>
    );
  },
);


export const MiR_Map_Status: React.FC<{ isDark: boolean;  amrId: string}> = memo(
  ({ isDark, amrId}) => {
    const [activateMap, setActivateMap] = useState<{ mapName: string; groupName: string } | null>(null)
    const [switchModalOpen, setSwitchModalOpen] = useState(false);
    const { t } = useTranslation();
    const { isOverdue } = useIsLogIn(amrId);
    const MiR_Status_IO = useMiRStatus(amrId);
    const { data: maps } = useMapList();
    const { data: groups, isSuccess: groupsLoaded } = useMapGroup();

    useEffect(() => {
      if(maps && maps.length){
        const active_map = maps.filter((map) => map.id == MiR_Status_IO.active_map_id).map((map) => {
          return { mapName: map.fileName, groupName: map.map_group_name}
        })
        
        if(active_map && active_map.length){
          setActivateMap(active_map[0])
        }
      }
    }, [MiR_Status_IO, maps]);
    if(!maps) return <></>
    // 離線車輛沒有可用資料, 點了也沒意義才擋; 非 Ready 狀態仍讓使用者點進 modal,
    // 由 modal 裡明顯的提示說明「為什麼不能換」, 而不是在這裡默默擋掉、使用者不知所以然。
    const canOpenModal = !isOverdue;
    const isReady = MiR_Status_IO.status === MIR_MAP_SWITCHABLE_STATUS;
    return (
      <>
      <CarRow4 onClick={(e) => {
         e.stopPropagation();
         if (!canOpenModal) return;
         setSwitchModalOpen(true);
      }} is_dark={isDark.toString()} $disabled={!canOpenModal} title={
        isReady
          ? (t("utils.activate_map") as string)
          : (t("utils.switch_map_requires_ready") as string)
      }>
        <span
          className={`third-row-span ${isDark ? "third-row-span-dark" : ""}`}
        >{`${t("utils.activate_map")}:`}</span>
        <MapValue>
            {isOverdue || !maps?.length || !activateMap ? (
              <span style={{ color: "#585757" }}>--</span>
            ) : (
              <>
                <span style={{ color: isDark ? "#ffffff" : "#000000" }}>{activateMap.mapName}</span>{" "}
                <span style={{ color: "#706f6f" }}>({activateMap.groupName})</span>
                <MapSwitchIcon className="map-switch-icon" />
              </>
            )}
        </MapValue>
    </CarRow4>
      {switchModalOpen && (
        <MapSwitchModal
          amrId={amrId}
          open={switchModalOpen}
          onClose={() => setSwitchModalOpen(false)}
        />
      )}
      </>
    );
  }
)

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
      <MissionTag amrId={amrId} />
      <CarryTag amrId={amrId} />
      <ChargingTag amrId={amrId} />
      <PowerTag amrId={amrId} />
      {isOverdue ? <></> : <ManualTag amrId={amrId} />}
      {isOverdue ? <></>: <IsPause amrId={amrId} />}
      {amrId.includes("mi") ? isOverdue ? <></>:<MiR_Error amrId={amrId}></MiR_Error> : <></>}
      {isOverdue || amrId.includes("mi") ? (
          <></>
        ) : (
          <IsPosAccurate amrId={amrId}></IsPosAccurate>
        )}
      </TagWrap>
    );
  },
);

