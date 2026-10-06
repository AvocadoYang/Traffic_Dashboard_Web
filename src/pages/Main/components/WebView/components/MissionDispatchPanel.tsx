import { memo, ReactNode, useState } from "react";
import {
  CalendarOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useSetAtom } from "jotai";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { OpenAssignMission } from "@/pages/Main/global/jotai";
import { DialogMission } from "../../missionModal";
import QuickMissionWebView from "../../missionModal/QuickMissionWebView";
import CycleMissionV2 from "../../missionModal/CycleMissionV2";
import CycleMissionViewer from "../../missionModal/CycleMissionViewer";
import UploadMission from "../../missionModal/UploadMission";
import { Cycle } from "@/sockets/useCycleMission";

// 小螢幕(平板 / 手機)底部「任務派發」分頁的內容。
//
// 外觀跟首頁其他面板(車輛卡片、任務清單的標題列)同一套:主題的底色、1px 邊框、
// 左邊一條強調色。原本每種任務各用一個寫死的粉彩色(黃 / 綠 / 藍 / 紫),
// 不會跟著主題變,深色主題下是四塊發亮的白;大螢幕 header 上同樣這幾顆按鈕
// 本來就沒有分顏色,所以這裡也不分了。
const DispatchContainer = styled.div`
  font-family: "Roboto Mono", monospace;
  background: var(--c-bg-subtle);
`;

// 平板一排四顆,手機寬度放不下時自動變成兩排
const DispatchGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
  gap: var(--space-sm);
`;

const DispatchButton = styled.button`
  all: unset;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  /* 手指要點得到:至少 56px 高 */
  min-height: 3.5rem;
  padding: var(--space-sm) var(--space-md);
  background: var(--c-bg);
  border: 1px solid var(--c-header-border);
  border-left: 4px solid var(--c-header-accent);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  color: var(--c-text);
  font-size: var(--font-md);
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s,
    color 0.2s;

  &:hover,
  &:active {
    background: var(--c-header-accent-soft);
    border-color: var(--c-header-accent);
    color: var(--c-header-accent);
  }

  &:focus-visible {
    outline: 2px solid var(--c-header-accent);
    outline-offset: 2px;
  }
`;

const DispatchIcon = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 4px;
  background: var(--c-header-accent-soft);
  color: var(--c-header-accent);
  font-size: 1.15rem;
`;

const DispatchLabel = styled.span`
  min-width: 0;
  line-height: 1.3;
  overflow-wrap: anywhere;
`;

const DispatchAction = ({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <DispatchButton type="button" onClick={onClick}>
    <DispatchIcon>{icon}</DispatchIcon>
    <DispatchLabel>{label}</DispatchLabel>
  </DispatchButton>
);

const MissionDispatchPanel = () => {
  const { t } = useTranslation();
  const setOpenAssignMission = useSetAtom(OpenAssignMission);
  const [showQuickMission, setShowQuickMission] = useState(false);
  const [showUploadMission, setShowUploadMission] = useState(false);
  const [showCycleMission, setShowCycleMission] = useState(false);
  const [showEditCycleMission, setShowEditCycleMission] = useState(false);
  const [editCyc, setEditCyc] = useState<null | Cycle>(null);

  return (
    <DispatchContainer>
      <DispatchGrid>
        <DispatchAction
          icon={<ThunderboltOutlined />}
          label={t("main.card_name.quick_mission")}
          onClick={() => setShowQuickMission(true)}
        />
        <DispatchAction
          icon={<SyncOutlined />}
          label={t("main.card_name.auto_mission")}
          onClick={() => setShowCycleMission(true)}
        />
        <DispatchAction
          icon={<CalendarOutlined />}
          label={t("main.card_name.new_mission")}
          onClick={() => setOpenAssignMission(true)}
        />
        <DispatchAction
          icon={<UploadOutlined />}
          label={t("main.card_name.upload_mission")}
          onClick={() => setShowUploadMission(true)}
        />
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
