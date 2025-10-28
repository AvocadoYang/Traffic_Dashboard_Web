import React, { useState, useEffect } from "react";
import { Tooltip, Tag } from "antd"; // Import Tag and Tooltip
// import { useElevatorSignal } from "@/sockets/useElevatorSignal"; // Assuming this hook provides the status
import styled from "styled-components";

// --- Styled Component ---
// Modified to remove conflicting inline styles and focus on the container
const MissionBtnWrap = styled.div`
  position: absolute;
  z-index: 4;
  bottom: 10px;
  right: 16px;
  /* Adjust size based on content, or set fixed size */
  background-color: transparent;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center; /* Center the tag inside */
`;

// --- Component ---
const ECS_online: React.FC = () => {
  // 1. State for the third-party service status
  const [isOnline, setIsOnline] = useState<boolean>(false);

  useEffect(() => {
    const checkStatus = () => {
      setTimeout(() => {
        const statusFromSignal = Math.random() > 0.5;
        setIsOnline(statusFromSignal);
      }, 500);
    };

    checkStatus();
  }, []);

  // Determine the display properties
  const statusColor = isOnline ? "success" : "error";
  const statusText = isOnline ? "Online" : "Offline";
  const tooltipTitle = `Third-Party Status: ${statusText}`;

  return (
    <MissionBtnWrap>
      <Tooltip title={tooltipTitle} placement="left">
        <Tag
          color={statusColor}
          style={{ padding: "4px 8px", fontSize: "14px", cursor: "pointer" }}
        >
          {statusText}
        </Tag>
      </Tooltip>
    </MissionBtnWrap>
  );
};

export default ECS_online;
