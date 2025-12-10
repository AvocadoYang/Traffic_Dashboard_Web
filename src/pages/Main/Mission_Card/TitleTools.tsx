import { memo } from "react";
import { Flex, Popover, Tooltip } from "antd";
import { useAtomValue } from "jotai";
import { darkMode } from "@/utils/gloable";
import { QuestionCircleFilled } from "@ant-design/icons";
import styled from "styled-components";
import MissionRejectReasonInfo from "./components/MissionRejectReasonInfo";

const TitleBar = styled.div<{ $isDark: boolean }>`
  background: ${({ $isDark }) => ($isDark ? "#0a0a0a" : "#ffffff")};
  border: 1px solid ${({ $isDark }) => ($isDark ? "#333" : "#d9d9d9")};
  border-left: 4px solid #1890ff;
  padding: 16px 20px;
  margin-bottom: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const Title = styled.span<{ $isDark: boolean }>`
  font-family: "Roboto Mono", monospace;
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${({ $isDark }) => ($isDark ? "#00ff41" : "#262626")};
`;

const InfoIcon = styled(QuestionCircleFilled)<{ $isDark: boolean }>`
  font-size: 18px;
  color: ${({ $isDark }) => ($isDark ? "#1890ff" : "#1890ff")};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${({ $isDark }) => ($isDark ? "#40a9ff" : "#40a9ff")};
    transform: scale(1.1);
  }
`;

const TitleTools = () => {
  const isDark = useAtomValue(darkMode);

  return (
    <TitleBar $isDark={isDark}>
      <Flex gap="middle" align="center">
        <Title $isDark={isDark}>Missions</Title>
        <Popover content={<MissionRejectReasonInfo />} trigger="click">
          <Tooltip title="Why Rejected?">
            <InfoIcon $isDark={isDark} />
          </Tooltip>
        </Popover>
      </Flex>
    </TitleBar>
  );
};

export default memo(TitleTools);
