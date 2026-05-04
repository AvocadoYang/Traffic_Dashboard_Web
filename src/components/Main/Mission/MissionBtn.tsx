import {
  ThunderboltOutlined,
  CalendarOutlined,
  UploadOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { Button, Flex, Grid } from "antd";
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSetAtom } from "jotai";
import styled from "styled-components";
import { OpenAssignMission } from "@/jotai.ts";
import { Cycle } from "@/sockets/useCycleMission";
import { titleSizes } from "@/styles/mixins";
import { DialogMission } from "@/pages/Main/components/missionModal";
import UploadMission from "@/pages/Main/components/missionModal/UploadMission";
import CycleMissionV2 from "@/pages/Main/components/missionModal/CycleMissionV2";
import QuickMissionWebView from "@/pages/Main/components/missionModal/QuickMissionWebView";
import CycleMissionViewer from "@/pages/Main/components/missionModal/CycleMissionViewer";
import SimControl from "@/components/Common/SimControl";

const { useBreakpoint } = Grid;

// ─── Types ──────────────────────────────────────────────
type ModalState = {
  showQuickMission: boolean;
  showUploadMission: boolean;
  showCycleMission: boolean;
  showEditCycleMission: boolean;
  setShowQuickMission: (v: boolean) => void;
  setShowUploadMission: (v: boolean) => void;
  setShowCycleMission: (v: boolean) => void;
  setShowEditCycleMission: (v: boolean) => void;
};

type SimControlProps = {
  isSimulating: boolean;
  onStart: () => void;
  onStop: () => void;
};

// ─── Shared Config ───────────────────────────────────────
const BUTTON_CONFIG = [
  {
    key: "upload",
    className: "upload-mission",
    icon: <UploadOutlined />,
    i18nKey: "main.card_name.upload_mission",
    color: "#722ed1",
    bg: "#f9f0ff",
    stateKey: "showUploadMission" as const,
  },
  {
    key: "cycle",
    className: "cycle-mission",
    icon: <SyncOutlined />,
    i18nKey: "main.card_name.cycle_mission",
    color: "#327411",
    bg: "#f6ffed",
    stateKey: "showCycleMission" as const,
  },
  {
    key: "quick",
    className: "quick-mission",
    icon: <ThunderboltOutlined />,
    i18nKey: "main.card_name.quick_mission",
    color: "#af7603",
    bg: "#fffbe6",
    stateKey: "showQuickMission" as const,
  },
  {
    key: "new",
    className: "new-mission",
    icon: <CalendarOutlined />,
    i18nKey: "main.card_name.new_mission",
    color: "#1890ff",
    bg: "#e6f7ff",
    stateKey: null,
  },
] as const;

// ─── Desktop Styles ──────────────────────────────────────
const MissionBtnWrap = styled.div`
  position: relative;
`;

const ButtonGroup = styled(Flex)`
  gap: 20px;
`;

const IndustrialButton = styled(Button)`
  ${titleSizes.xs};
  background: #ffffff;
  border: 1px solid #d9d9d9;
  height: 36px;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
  }

  .anticon {
    font-size: 18px;
  }

  &.upload-mission {
    border-color: #722ed1;
    color: #722ed1;
    background: #f9f0ff;
    &:hover {
      background: #efdbff;
      color: #531dab;
      box-shadow: 0 2px 12px rgba(114, 46, 209, 0.3);
    }
  }

  &.cycle-mission {
    border-color: #52c41a;
    color: #327411;
    background: #f6ffed;
    &:hover {
      background: #d9f7be;
      color: #389e0d;
      box-shadow: 0 2px 12px rgba(82, 196, 26, 0.3);
    }
  }

  &.quick-mission {
    border-color: #faad14;
    color: #af7603;
    background: #fffbe6;
    &:hover {
      background: #fff1b8;
      color: #fa8c16;
      box-shadow: 0 2px 12px rgba(250, 173, 20, 0.3);
    }
  }

  &.new-mission {
    border-color: #1890ff;
    color: #1890ff;
    background: #e6f7ff;
    &:hover {
      background: #bae7ff;
      color: #096dd9;
      box-shadow: 0 2px 12px rgba(24, 144, 255, 0.3);
    }
  }
`;

// ─── Mobile Styles ───────────────────────────────────────
const BottomNav = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 56px;
  border-top: 1px solid #d9d9d9;
  display: flex;
  z-index: 100;
`;

const NavItem = styled.button<{ $color: string; $bg: string }>`
  ${titleSizes.xxs};
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: none;
  border-top: 3px solid transparent;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  cursor: pointer;

  &:active {
    filter: brightness(0.9);
  }
`;

// ─── Desktop Component ───────────────────────────────────
const DesktopMissionBtn: React.FC<ModalState & SimControlProps> = ({
  isSimulating,
  onStart,
  onStop,
  ...modalState
}) => {
  const { t } = useTranslation();
  const openAssignMission = useSetAtom(OpenAssignMission);

  const handleClick = (stateKey: keyof ModalState | null) => {
    if (!stateKey) return openAssignMission(true);
    const setter = modalState[`set${stateKey.charAt(0).toUpperCase()}${stateKey.slice(1)}` as keyof ModalState] as (v: boolean) => void;
    const current = modalState[stateKey] as boolean;
    setter(!current);
  };

  return (
    <MissionBtnWrap>
      <ButtonGroup align="center">
        {BUTTON_CONFIG.map(({ key, className, icon, i18nKey, stateKey }) => (
          <IndustrialButton
            key={key}
            className={className}
            onClick={() => handleClick(stateKey)}
            icon={icon}
          >
            {t(i18nKey)}
          </IndustrialButton>
        ))}
        <SimControl isSimulating={isSimulating} onStart={onStart} onStop={onStop} />
      </ButtonGroup>
    </MissionBtnWrap>
  );
};

// ─── Mobile Component ────────────────────────────────────
const MobileMissionNav: React.FC<ModalState & SimControlProps> = ({
  isSimulating,
  onStart,
  onStop,
  ...modalState
}) => {
  const { t } = useTranslation();
  const openAssignMission = useSetAtom(OpenAssignMission);

  const handleClick = (stateKey: keyof ModalState | null) => {
    if (!stateKey) return openAssignMission(true);
    const setter = modalState[`set${stateKey.charAt(0).toUpperCase()}${stateKey.slice(1)}` as keyof ModalState] as (v: boolean) => void;
    const current = modalState[stateKey] as boolean;
    setter(!current);
  };

  return (
    <BottomNav>
      {BUTTON_CONFIG.map(({ key, icon, i18nKey, color, bg, stateKey }) => (
        <NavItem
          key={key}
          $color={color}
          $bg={bg}
          onClick={() => handleClick(stateKey)}
        >
          {icon}
          {t(i18nKey)}
        </NavItem>
      ))}
      <SimControl isSimulating={isSimulating} onStart={onStart} onStop={onStop} isMobile />
    </BottomNav>
  );
};

// ─── Main Component ──────────────────────────────────────
type MissionBtnProps = SimControlProps;

const MissionBtn: React.FC<MissionBtnProps> = ({ isSimulating, onStart, onStop }) => {
  const { md } = useBreakpoint();
  const isMobile = !md;

  const [showUploadMission, setShowUploadMission] = useState(false);
  const [showCycleMission, setShowCycleMission] = useState(false);
  const [showQuickMission, setShowQuickMission] = useState(false);
  const [showEditCycleMission, setShowEditCycleMission] = useState(false);
  const [editCyc, setEditCyc] = useState<null | Cycle>(null);

  const modalState: ModalState = {
    showQuickMission,
    showUploadMission,
    showCycleMission,
    showEditCycleMission,
    setShowQuickMission,
    setShowUploadMission,
    setShowCycleMission,
    setShowEditCycleMission,
  };

  const simProps: SimControlProps = { isSimulating, onStart, onStop };

  return (
    <>
      {isMobile
        ? <MobileMissionNav {...modalState} {...simProps} />
        : <DesktopMissionBtn {...modalState} {...simProps} />
      }
      <DialogMission />
      <UploadMission
        open={showUploadMission}
        setShowUploadMission={setShowUploadMission}
      />
      <CycleMissionV2
        open={showEditCycleMission}
        setShowCycleMission={setShowEditCycleMission}
        editCyc={editCyc}
        setEditCyc={setEditCyc}
      />
      <QuickMissionWebView
        showQuickMission={showQuickMission}
        setShowQuickMission={setShowQuickMission}
      />
      <CycleMissionViewer
        open={showCycleMission}
        setShowCycleMission={setShowCycleMission}
        setShowEditCycleMission={setShowEditCycleMission}
        setEditCyc={setEditCyc}
      />
    </>
  );
};

export default memo(MissionBtn);