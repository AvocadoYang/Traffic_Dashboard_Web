import { FC, memo, useState } from "react";
import { Flex, Popover, Tooltip } from "antd";
import { useAtomValue } from "jotai";
import { darkMode } from "@/utils/gloable";
import { MoreOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { PanelEyebrow, PanelIconColor, PanelTitle, PanelTitleBar } from "@/styles/panelTitle";
import styled from "styled-components";
import MissionRejectReasonInfo from "./components/MissionRejectReasonInfo";
import MissionSwitch from "./components/MissionSwitch";
import { Mission_Switch } from "./MissionWrap";
import { useTranslation } from "react-i18next";

// 標題 (任務 / 排程) 跟車輛側欄共用同一套樣式, 見 styles/panelTitle.ts
const TitleBar = styled(PanelTitleBar)<{ $isDark: boolean }>``;

const Title = styled(PanelTitle)<{ $isDark: boolean }>``;

const InfoIcon = styled(QuestionCircleOutlined)<{ $isDark: boolean }>`
  font-size: 15px;
  ${PanelIconColor}
`;

const SwitchIcon = styled(MoreOutlined)<{ $isDark: boolean }>`
  font-size: 18px;
  ${PanelIconColor}
`;

const TitleTools: FC<{
  viewSwitch: Mission_Switch;
  setViewSwitch: React.Dispatch<React.SetStateAction<Mission_Switch>>;
}> = ({ setViewSwitch, viewSwitch }) => {
  const { t } = useTranslation();
  const isDark = useAtomValue(darkMode);

  return (
    <TitleBar $isDark={isDark}>
      <PanelEyebrow>{viewSwitch === "mission" ? "Dispatch" : "Schedule"}</PanelEyebrow>
      <Flex gap="middle" align="center" justify="space-between">
        <Flex gap={10} align="center">
          <Title $isDark={isDark}>
            {t(viewSwitch === "mission" ? "utils.missions" : "main.schedule.tab")}
          </Title>
          {viewSwitch === "mission" && (
            <Popover content={<MissionRejectReasonInfo />} trigger="click">
              <Tooltip title={t("main.why_rejected")}>
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
            title={t("main.switch_to", {
              view: t(
                viewSwitch === "mission"
                  ? "main.schedule.tab"
                  : "utils.missions",
              ),
            })}
          >
            <SwitchIcon $isDark={isDark} />
          </Tooltip>
        </Popover>
      </Flex>
    </TitleBar>
  );
};

export default memo(TitleTools);
