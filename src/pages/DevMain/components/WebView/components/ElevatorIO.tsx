import React from "react";
import { Button, Popover, Space, Tooltip } from "antd";
import styled from "styled-components";
import {
  useLeftElevatorSignal,
  useRightElevatorSignal,
} from "@/sockets/useElevatorSignal";
import { io } from "@/sockets/socketConnect";

const MissionBtnWrap = styled.div`
  position: absolute;
  z-index: 4;
  top: 100px;
  left: 16px;
  border-radius: 8px;
  padding: 8px;
  opacity: 1;
  transition: all 0.3s ease-in-out;
  display: flex;
  align-items: center;
`;

const IOGrid = styled.div`
  min-width: 280px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const IORow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Label = styled.span`
  flex: 1;
  font-weight: 500;
`;

const ElevatorIO: React.FC = () => {
  const right = useRightElevatorSignal();
  const left = useLeftElevatorSignal();

  const handleEmit = (side: "right" | "left", key: string, value: boolean) => {
    io.emit("set-elevator-io", { side, key, value });
  };

  const renderIOList = (
    title: string,
    ioObj: Record<string, boolean>,
    side: "right" | "left"
  ) => {
    if (!ioObj) return <div>Waiting for {side} elevator signal...</div>;

    return (
      <div>
        <h4 style={{ marginBottom: 8 }}>{title}</h4>
        <IOGrid>
          {Object.entries(ioObj).map(([key, value]) => {
            const label = key
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (str) => str.toUpperCase());
            return (
              <IORow key={key}>
                <Label>{label}</Label>
                <Space>
                  <Button
                    size="small"
                    type={value ? "primary" : "default"}
                    onClick={() => handleEmit(side, key, true)}
                  >
                    ON
                  </Button>
                  <Button
                    size="small"
                    danger
                    type={!value ? "primary" : "default"}
                    onClick={() => handleEmit(side, key, false)}
                  >
                    OFF
                  </Button>
                </Space>
              </IORow>
            );
          })}
        </IOGrid>
      </div>
    );
  };

  return (
    <MissionBtnWrap>
      <Tooltip placement="right" title="Show elevator IO">
        <Popover
          content={
            <>
              {renderIOList("Right Elevator IO", right, "right")}
              <div style={{ marginTop: 16 }} />
              {renderIOList("Left Elevator IO", left, "left")}
            </>
          }
          title="Elevator IO"
          trigger="click"
        >
          <Button>Elevator IO</Button>
        </Popover>
      </Tooltip>
    </MissionBtnWrap>
  );
};

export default ElevatorIO;
