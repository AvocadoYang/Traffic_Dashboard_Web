import client from "@/api/axiosClient";
import {
  QuickMissionLoad,
  QuickMissionOffload,
  QuickMissionSettingMode,
  StartQuickMissionSetting,
} from "@/pages/Main/global/jotai";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation } from "@tanstack/react-query";
import { Button, Flex, message, Popover, Tooltip } from "antd";
import { useAtom, useSetAtom } from "jotai";
import React, { FC } from "react";
import styled from "styled-components";

interface ElevatorProps {
  locationId: string;
  hasCargo: boolean;
  isDisable: boolean;
  customName: string;
  isHaveAction?: boolean; // optional: for pulse effect
}

const SvgStyle = styled.svg<{
  $hasCargo: boolean;
  $isDisable: boolean;
  $isSelecting: boolean;
  $canBeClick: boolean;
  $isHaveAction: boolean;
  $isManual: boolean;
  $isRunning: boolean; // 👈 add this
}>`
  width: 24px;
  height: 24px;
  padding: 2px;
  border-radius: 4px;
  transition: all 0.2s ease;
  cursor: ${({ $isDisable, $isSelecting, $canBeClick }) =>
    $isDisable
      ? "not-allowed"
      : $isSelecting && !$canBeClick
        ? "not-allowed"
        : "pointer"};
  opacity: ${({ $isDisable }) => ($isDisable ? 0.6 : 1)};
  fill: ${({ $hasCargo }) => ($hasCargo ? "#ffe73c" : "#999")};

  border: ${({ $isSelecting, $canBeClick, $isManual, $isRunning }) =>
    $isManual
      ? "2px solid red"
      : $isRunning
        ? "2px solid #1890ff"
        : $isSelecting && $canBeClick
          ? "2px solid #1890ff"
          : "1px dashed #727272"};

  box-shadow: ${({ $isManual, $isRunning }) =>
    $isManual
      ? "0 0 8px rgba(255, 0, 0, 0.5)"
      : $isRunning
        ? "0 0 12px rgba(24, 144, 255, 0.6)"
        : "none"};

  ${({ $isHaveAction, $isDisable }) =>
    $isHaveAction && !$isDisable
      ? `
        animation: pulseGreen 2s infinite;
        @keyframes pulseGreen {
          0% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(82, 196, 26, 0); }
          100% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0); }
        }
      `
      : ""}

  ${({ $isRunning }) =>
    $isRunning
      ? `
        animation: pulseBlue 1s infinite;
        @keyframes pulseBlue {
          0% { box-shadow: 0 0 0 0 rgba(24, 144, 255, 0.6); }
          70% { box-shadow: 0 0 0 10px rgba(24, 144, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(24, 144, 255, 0); }
        }
      `
      : ""}
`;

const PopoverContent = styled(Flex)`
  padding: 4px;
  min-width: 200px;
`;

const StatusItem = styled(Flex)`
  justify-content: space-between;
  width: 100%;
  padding: 4px 0;

  .label {
    color: #8c8c8c;
    margin-right: 12px;
  }

  .value {
    font-weight: 500;
    color: ${(props) => props.color || "#262626"};
  }
`;

const Elevator: FC<{
  locationId: string;
  hasCargo: boolean;
  isDisable: boolean;
  isBook: boolean;
  customName: string;
  isManual: boolean;
  isRunning: boolean;
  hasCargoSignal: boolean;
}> = ({
  locationId,
  hasCargo,
  hasCargoSignal,
  isDisable,
  isBook,
  customName,
  isManual,
  isRunning,
}) => {
  const [selectMode, setQuickSettingMode] = useAtom(QuickMissionSettingMode);
  const [isStartSelecting, setStartQuickSetting] = useAtom(
    StartQuickMissionSetting,
  );
  const setLoad = useSetAtom(QuickMissionLoad);
  const setOffload = useSetAtom(QuickMissionOffload);
  const [messageApi, contextHolder] = message.useMessage();

  const resetMutation = useMutation({
    mutationFn: () => client.post("/api/corning/force-reset-elevator"),
    onSuccess: () => {
      messageApi.success("ok");
    },
    onError: (e: ErrorResponse) => {
      messageApi.warning("操作過於頻繁，請於 5 秒後再試");
    },
  });

  const canBeClickInSelection =
    isStartSelecting &&
    !isDisable &&
    ((selectMode === "load" && hasCargo) ||
      (selectMode === "offload" && !hasCargo));

  const handleQuickMissionPayload = () => {
    if (!isStartSelecting || !canBeClickInSelection || selectMode === null)
      return;

    if (selectMode === "load") {
      setLoad({
        missionType: "load",
        columnName: customName,
        locationId: locationId,
        level: 0,
      });
    } else if (selectMode === "offload") {
      setOffload({
        missionType: "offload",
        columnName: customName,
        locationId: locationId,
        level: 0,
      });
    }

    setStartQuickSetting(false);
    setQuickSettingMode(null);
  };

  return (
    <>
      {contextHolder}
      <Popover
        content={
          <PopoverContent vertical gap={8}>
            {locationId === "12001" ? (
              <Button onClick={() => resetMutation.mutate()} danger>
                強制復歸
              </Button>
            ) : (
              ""
            )}
            <StatusItem>
              <span className="label">Manual Mode:</span>
              <span
                className="value"
                style={{ color: isManual ? "#f5222d" : "#52c41a" }}
              >
                {isManual ? "Yes" : "No"}
              </span>
            </StatusItem>
            <StatusItem>
              <span className="label">Running Status:</span>
              <span
                className="value"
                style={{ color: isRunning ? "#1890ff" : "#8c8c8c" }}
              >
                {isRunning ? "Active" : "Idle"}
              </span>
            </StatusItem>
            <StatusItem>
              <span className="label">Cargo Status:</span>
              <span
                className="value"
                style={{ color: hasCargoSignal ? "#faad14" : "#8c8c8c" }}
              >
                {hasCargoSignal ? "Loaded" : "Empty"}
              </span>
            </StatusItem>
          </PopoverContent>
        }
        title={<div style={{ fontWeight: 500 }}>{customName}</div>}
        trigger="click"
        placement="right"
      >
        <Tooltip title={customName}>
          <SvgStyle
            $hasCargo={hasCargo}
            $isDisable={isDisable}
            $isSelecting={isStartSelecting}
            $canBeClick={isStartSelecting ? canBeClickInSelection : true}
            $isManual={isManual}
            $isHaveAction={isBook}
            $isRunning={isRunning}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            onClick={() => handleQuickMissionPayload()}
          >
            <path d="M9 9V11H7V9H5V11H3V9H1V21H3V19H5V21H7V19H9V21H11V19H13V21H15V19H17V21H19V19H21V21H23V9H21V11H19V9H17V11H15V9H13V11H11V9H9M3 13H5V17H3V13M7 13H9V17H7V13M11 13H13V17H11V13M15 13H17V17H15V13M19 13H21V17H19V13M7 4H11V2L17 5H13V7L7 4Z" />
          </SvgStyle>
        </Tooltip>
      </Popover>
    </>
  );
};

export default Elevator;
