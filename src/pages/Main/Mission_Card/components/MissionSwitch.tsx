import React, { Dispatch, FC, SetStateAction } from "react";
import { Button, Flex } from "antd";
import { Mission_Switch } from "../MissionWrap";
import styled from "styled-components";
import { useAtomValue } from "jotai";
import { darkMode } from "@/utils/gloable";

const StyledButton = styled(Button)<{ $isActive: boolean; $isDark: boolean }>`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
  height: 36px;
  padding: 0 20px;
  font-weight: 600;
  border-radius: 4px;
  transition: all 0.2s ease;

  ${({ $isActive, $isDark }) =>
    $isActive
      ? `
    background: #1890ff;
    border-color: #1890ff;
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
    
    &:hover {
      background: #40a9ff;
      border-color: #40a9ff;
      color: #ffffff;
    }
  `
      : `
    background: ${$isDark ? "#0a0a0a" : "#ffffff"};
    border: 1px solid ${$isDark ? "#2a2a2a" : "#d9d9d9"};
    color: ${$isDark ? "#00ff41" : "#595959"};
    
    &:hover {
      background: ${$isDark ? "#1a1a1a" : "#e6f7ff"};
      border-color: #1890ff;
      color: #1890ff;
    }
  `}
`;

const MissionSwitch: FC<{
  setViewSwitch: Dispatch<SetStateAction<Mission_Switch>>;
  currentView: Mission_Switch;
}> = ({ setViewSwitch, currentView }) => {
  const isDark = useAtomValue(darkMode);

  const hSelect = (s: Mission_Switch) => {
    setViewSwitch(s);
  };

  return (
    <Flex gap="small" vertical>
      <StyledButton
        $isActive={currentView === "mission"}
        $isDark={isDark}
        onClick={() => hSelect("mission")}
      >
        Missions
      </StyledButton>
      <StyledButton
        $isActive={currentView === "schedule"}
        $isDark={isDark}
        onClick={() => hSelect("schedule")}
      >
        Schedule
      </StyledButton>
    </Flex>
  );
};

export default MissionSwitch;
