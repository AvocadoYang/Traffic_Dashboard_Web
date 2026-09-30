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
    background: var(--c-header-accent);
    border-color: var(--c-header-accent);
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
    
    &:hover {
      background: var(--c-header-accent);
      border-color: var(--c-header-accent);
      color: #ffffff;
    }
  `
      : `
    background: var(--c-bg);
    border: 1px solid var(--c-header-border);
    color: var(--c-text-secondary);
    
    &:hover {
      background: var(--c-header-accent-soft);
      border-color: var(--c-header-accent);
      color: var(--c-header-accent);
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
