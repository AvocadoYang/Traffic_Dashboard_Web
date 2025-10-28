import React, { useState } from "react";
import { Button, Popover, Space, Tag, Tooltip } from "antd";
import { useElevatorSignal } from "@/sockets/useElevatorSignal";
import styled from "styled-components";

const MissionBtnWrap = styled.div`
  position: absolute;
  z-index: 4;
  top: 100px; /* Align with the header */
  left: 16px; /* Align with the right edge of the mission panel */
  background-color: rgba(
    255,
    255,
    255,
    0.01
  ); /* White background to match panels */
  border-radius: 8px; /* Consistent rounded corners */
  padding: 8px; /* More padding for a spacious feel */
  opacity: 1; /* Always fully opaque for clarity */
  transition: all 0.3s ease-in-out;
  background-color: "#b41313";
  width: "50px";
  height: "50px";
  overflow: hidden;
  display: flex;
  align-items: center;
`;

const ElevatorIO: React.FC = () => {
  const elevator = useElevatorSignal();

  if (!elevator) return <MissionBtnWrap>no elevator signal...</MissionBtnWrap>;

  return (
    <>
      <MissionBtnWrap>
        <Tooltip placement="right" title="show elevator io">
          <Popover
            content={
              <div style={{ minWidth: 250 }}>
                {Object.entries(elevator).map(([key, value]) => (
                  <Space
                    key={key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>
                      {key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase())}
                    </span>
                    <Button
                      shape="circle"
                      size="small"
                      style={{
                        backgroundColor: value ? "#52c41a" : "#d9d9d9",
                        borderColor: value ? "#52c41a" : "#d9d9d9",
                      }}
                    />
                  </Space>
                ))}
              </div>
            }
            title="Title"
            trigger="click"
          >
            <Button>Elevator IO</Button>
          </Popover>
        </Tooltip>
      </MissionBtnWrap>
    </>
  );
};

export default ElevatorIO;
