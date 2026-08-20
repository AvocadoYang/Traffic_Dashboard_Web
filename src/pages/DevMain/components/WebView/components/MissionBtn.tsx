import { ThunderboltOutlined, CalendarOutlined } from "@ant-design/icons";
import { Button, Flex } from "antd";
import { useTranslation } from "react-i18next";
import { DialogMission } from "../../missionModal";
import QuickMissionWebView from "../../missionModal/QuickMissionWebView";
import { memo, useState } from "react";
import { OpenAssignMission } from "../../../global/jotai";
import { useSetAtom } from "jotai";
import styled from "styled-components";

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 1px;
  height: 36px;
  font-weight: 600;
  padding: 0 16px;

  &.quick-mission {
    border-color: #faad14;
    color: #af7603;
    background: #fffbe6;

    &:hover {
      background: #fff1b8 !important;
      color: #fa8c16 !important;
      border-color: #faad14 !important;
    }
  }

  &.new-mission {
    border-color: #1890ff;
    color: #1890ff;
    background: #e6f7ff;

    &:hover {
      background: #bae7ff !important;
      color: #096dd9 !important;
      border-color: #1890ff !important;
    }
  }
`;

const MissionBtn = () => {
  const { t } = useTranslation();
  const openAssignMission = useSetAtom(OpenAssignMission);
  const [showQuickMission, setShowQuickMission] = useState(false);

  return (
    <>
      <Flex gap="small" justify="flex-end">
        <IndustrialButton
          className="quick-mission"
          onClick={() => setShowQuickMission(!showQuickMission)}
          icon={<ThunderboltOutlined />}
        >
          {t("main.card_name.quick_mission")}
        </IndustrialButton>

        <IndustrialButton
          className="new-mission"
          onClick={() => openAssignMission(true)}
          icon={<CalendarOutlined />}
        >
          {t("main.card_name.new_mission")}
        </IndustrialButton>
      </Flex>
      <DialogMission />
      <QuickMissionWebView
        showQuickMission={showQuickMission}
        setShowQuickMission={setShowQuickMission}
      />
    </>
  );
};

export default memo(MissionBtn);
