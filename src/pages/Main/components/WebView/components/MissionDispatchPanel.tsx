import { memo, useState } from "react";
import { Button } from "antd";
import {
  CalendarOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useAtomValue, useSetAtom } from "jotai";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { OpenAssignMission } from "@/pages/Main/global/jotai";
import { darkMode } from "@/utils/gloable";
import { DialogMission } from "../../missionModal";
import QuickMissionWebView from "../../missionModal/QuickMissionWebView";
import CycleMissionV2 from "../../missionModal/CycleMissionV2";
import CycleMissionViewer from "../../missionModal/CycleMissionViewer";
import UploadMission from "../../missionModal/UploadMission";
import { Cycle } from "@/sockets/useCycleMission";
import { missionAccentStyles } from "./missionButtonStyles";

const DispatchContainer = styled.div<{ $isDark: boolean }>`
  font-family: "Roboto Mono", monospace;
  background: ${({ $isDark }) => ($isDark ? "#1a1a1a" : "#f5f5f5")};
  border-radius: 4px;
`;

const DispatchGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
`;

const DispatchButton = styled(Button)`
  && {
    flex: 1 1 10rem;
    min-width: 8rem;
    height: 5rem;
    font-family: "Roboto Mono", monospace;
    font-weight: 600;
    letter-spacing: 0.5px;

    ${missionAccentStyles}

    .anticon {
      font-size: 1.25rem;
    }
  }
`;

const MissionDispatchPanel = () => {
  const { t } = useTranslation();
  const isDark = useAtomValue(darkMode);
  const setOpenAssignMission = useSetAtom(OpenAssignMission);
  const [showQuickMission, setShowQuickMission] = useState(false);
  const [showUploadMission, setShowUploadMission] = useState(false);
  const [showCycleMission, setShowCycleMission] = useState(false);
  const [showEditCycleMission, setShowEditCycleMission] = useState(false);
  const [editCyc, setEditCyc] = useState<null | Cycle>(null);

  return (
    <DispatchContainer $isDark={isDark}>
      <DispatchGrid>
        <DispatchButton
          className="quick-mission"
          type="default"
          variant="filled"
          icon={<ThunderboltOutlined />}
          onClick={() => setShowQuickMission(true)}
        >
          {t("main.card_name.quick_mission")}
        </DispatchButton>
        <DispatchButton
          className="cycle-mission"
          type="default"
          variant="filled"
          icon={<SyncOutlined />}
          onClick={() => setShowCycleMission(true)}
        >
          {t("main.card_name.auto_mission")}
        </DispatchButton>
        <DispatchButton
          className="new-mission"
          type="default"
          variant="filled"
          icon={<CalendarOutlined />}
          onClick={() => setOpenAssignMission(true)}
        >
          {t("main.card_name.new_mission")}
        </DispatchButton>
        <DispatchButton
          className="upload-mission"
          type="default"
          variant="filled"
          icon={<UploadOutlined />}
          onClick={() => setShowUploadMission(true)}
        >
          {t("main.card_name.upload_mission")}
        </DispatchButton>
      </DispatchGrid>

      <QuickMissionWebView
        showQuickMission={showQuickMission}
        setShowQuickMission={setShowQuickMission}
      />
      <UploadMission
        open={showUploadMission}
        setShowUploadMission={setShowUploadMission}
      />
      <CycleMissionViewer
        open={showCycleMission}
        setShowCycleMission={setShowCycleMission}
        setShowEditCycleMission={setShowEditCycleMission}
        setEditCyc={setEditCyc}
      />
      <CycleMissionV2
        open={showEditCycleMission}
        setShowCycleMission={setShowEditCycleMission}
        editCyc={editCyc}
        setEditCyc={setEditCyc}
      />
      <DialogMission></DialogMission>
    </DispatchContainer>
  );
};

export default memo(MissionDispatchPanel);
