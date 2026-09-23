import { FC, memo, useState } from "react";
import { Flex, Popover, Tooltip } from "antd";
import { useAtomValue } from "jotai";
import { darkMode } from "@/utils/gloable";
import { MoreOutlined, QuestionCircleFilled } from "@ant-design/icons";
import styled from "styled-components";
import MissionRejectReasonInfo from "./components/MissionRejectReasonInfo";
import MissionSwitch from "./components/MissionSwitch";
import { Mission_Switch } from "./MissionWrap";

const TitleBar = styled.div<{ $isDark: boolean }>`
  background: var(--c-bg);
  border: 1px solid var(--c-header-border);
  border-left: 4px solid var(--c-header-accent);
  padding: 16px 20px;
  margin-bottom: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  @media (max-width: 1500px) {
    display: none;
  }
`;

const Title = styled.span<{ $isDark: boolean }>`
  font-family: "Roboto Mono", monospace;
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--c-text);

  @media (max-width: 1200px) {
    font-size: 12px;
  }
`;

const InfoIcon = styled(QuestionCircleFilled)<{ $isDark: boolean }>`
  font-size: 18px;
  color: var(--c-header-accent);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: var(--c-header-accent);
    transform: scale(1.1);
  }

  @media (max-width: 1200px) {
    font-size: 12px;
  }
`;

const SwitchIcon = styled(MoreOutlined)<{ $isDark: boolean }>`
  font-size: 18px;
  color: var(--c-header-accent);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: var(--c-header-accent);
    transform: scale(1.1);
  }

  @media (max-width: 1200px) {
    font-size: 12px;
  }
`;

const TitleTools: FC<{
  viewSwitch: Mission_Switch;
  setViewSwitch: React.Dispatch<React.SetStateAction<Mission_Switch>>;
}> = ({ setViewSwitch, viewSwitch }) => {
  const isDark = useAtomValue(darkMode);

  return (
    <TitleBar $isDark={isDark}>
      <Flex gap="middle" align="center" justify="space-between">
        <Flex gap="middle">
          <Title $isDark={isDark}>{viewSwitch.toLocaleUpperCase()}</Title>
          {viewSwitch === "mission" && (
            <Popover content={<MissionRejectReasonInfo />} trigger="click">
              <Tooltip title="Why Rejected?">
                <InfoIcon $isDark={isDark} />
              </Tooltip>
            </Popover>
          )}
        </Flex>

        <Popover
          content={
            <MissionSwitch
              setViewSwitch={setViewSwitch}
              currentView={viewSwitch}
            />
          }
          placement="leftBottom"
          trigger="click"
        >
          <Tooltip
            title={`Switch To ${viewSwitch === "mission" ? "Schedule" : "Mission"}`}
          >
            <SwitchIcon $isDark={isDark} />
          </Tooltip>
        </Popover>
      </Flex>
    </TitleBar>
  );
};

export default memo(TitleTools);
