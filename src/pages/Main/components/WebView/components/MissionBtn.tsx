import {
  ThunderboltOutlined,
  CalendarOutlined,
  SwapOutlined,
  CloseOutlined,
  UploadOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { Button, Flex, Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import { DialogMission } from "../../missionModal";
import { memo, useState, useEffect } from "react";
import { OpenAssignMission } from "@/pages/Main/jotai.ts";
import { useSetAtom } from "jotai";
import QuickMissionWebView from "../../missionModal/QuickMissionWebView";
import styled from "styled-components";
import UploadMission from "../../missionModal/UploadMission";
import CycleMissionV2 from "../../missionModal/CycleMissionV2";
import CycleMissionViewer from "../../missionModal/CycleMissionViewer";
import { Cycle, Cycle_Mission } from "@/sockets/useCycleMission";

// Industrial Button Styling - Light Mode
const MissionBtnWrap = styled.div<{ $isMinimized: boolean }>`
  position: relative;
`;

const IndustrialButton = styled(Button)`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #595959;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 1px;
  height: 36px;
  font-weight: 600;
  padding: 0 16px;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 0;
    background: transparent;
    transition: width 0.3s;
  }

  &:hover {
    transform: translateY(-2px);
  }

  &.quick-mission {
    border-color: #faad14;
    color: #af7603;
    background: #fffbe6;
    &::before {
      background: linear-gradient(90deg, transparent, rgba(250, 173, 20, 0.1));
    }
    &:hover {
      background: #fff1b8;
      color: #fa8c16;
      box-shadow: 0 2px 12px rgba(250, 173, 20, 0.3);
      &::before {
        width: 100%;
      }
    }
  }

  &.new-mission {
    border-color: #1890ff;
    color: #1890ff;
    background: #e6f7ff;
    &::before {
      background: linear-gradient(90deg, transparent, rgba(24, 144, 255, 0.1));
    }
    &:hover {
      background: #bae7ff;
      color: #096dd9;
      box-shadow: 0 2px 12px rgba(24, 144, 255, 0.3);
      &::before {
        width: 100%;
      }
    }
  }

  &.cycle-mission {
    border-color: #52c41a;
    color: #327411;
    background: #f6ffed;
    &::before {
      background: linear-gradient(90deg, transparent, rgba(82, 196, 26, 0.1));
    }
    &:hover {
      background: #d9f7be;
      border-color: #52c41a;
      color: #389e0d;
      box-shadow: 0 2px 12px rgba(82, 196, 26, 0.3);
      &::before {
        width: 100%;
      }
    }
  }

  &.upload-mission {
    border-color: #722ed1;
    color: #722ed1;
    background: #f9f0ff;
    &::before {
      background: linear-gradient(90deg, transparent, rgba(114, 46, 209, 0.1));
    }
    &:hover {
      background: #efdbff;
      border-color: #722ed1;
      color: #531dab;
      box-shadow: 0 2px 12px rgba(114, 46, 209, 0.3);
      &::before {
        width: 100%;
      }
    }
  }

  .anticon {
    font-size: 14px;
  }
`;

const MinimizeButton = styled(Button)`
  width: 36px;
  height: 36px;
  min-width: 36px;
  padding: 0;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #8c8c8c;
  font-size: 12px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #fff1f0;
    border-color: #ff4d4f;
    color: #ff4d4f;
    box-shadow: 0 2px 8px rgba(255, 77, 79, 0.2);
    transform: rotate(90deg);
  }
`;

const ExpandButton = styled(Button)`
  width: 36px;
  height: 36px;
  min-width: 36px;
  padding: 0;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #595959;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #f0f5ff;
    border-color: #1890ff;
    color: #1890ff;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
    transform: scale(1.1);
  }
`;

const ButtonGroup = styled(Flex)`
  gap: 8px;
  position: relative;
  padding-left: 12px;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 100%;
    background: linear-gradient(180deg, transparent, #1890ff, transparent);
  }
`;

const MissionBtn = () => {
  const { t } = useTranslation();
  const openAssignMission = useSetAtom(OpenAssignMission);
  const [showQuickMission, setShowQuickMission] = useState(false);
  const [showUploadMission, setShowUploadMission] = useState(false);
  const [showCycleMission, setShowCycleMission] = useState(false);
  const [showEditCycleMission, setShowEditCycleMission] = useState(false);
  const [$isMinimized, set$isMinimized] = useState(false);
  const [editCyc, setEditCyc] = useState<null | Cycle>(null);

  useEffect(() => {
    const savedState = localStorage.getItem("missionBtnMinimized");
    if (savedState) {
      set$isMinimized(JSON.parse(savedState));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("missionBtnMinimized", JSON.stringify($isMinimized));
  }, [$isMinimized]);

  return (
    <>
      <MissionBtnWrap $isMinimized={$isMinimized}>
        {$isMinimized ? (
          <Tooltip title={t("main.card_name.mission")} placement="bottom">
            <ExpandButton
              icon={<SwapOutlined />}
              onClick={() => set$isMinimized(false)}
            />
          </Tooltip>
        ) : (
          <ButtonGroup align="center">
            <IndustrialButton
              className="upload-mission"
              onClick={() => {
                setShowUploadMission(!showUploadMission);
              }}
              icon={<UploadOutlined />}
            >
              {t("main.card_name.upload_mission")}
            </IndustrialButton>

            <IndustrialButton
              className="cycle-mission"
              onClick={() => {
                setShowCycleMission(!showCycleMission);
              }}
              icon={<SyncOutlined />}
            >
              {t("main.card_name.cycle_mission")}
            </IndustrialButton>

            <IndustrialButton
              className="quick-mission"
              onClick={() => {
                setShowQuickMission(!showQuickMission);
              }}
              icon={<ThunderboltOutlined />}
            >
              {t("main.card_name.quick_mission")}
            </IndustrialButton>

            <IndustrialButton
              className="new-mission"
              onClick={() => {
                openAssignMission(true);
              }}
              icon={<CalendarOutlined />}
            >
              {t("main.card_name.new_mission")}
            </IndustrialButton>

            <Tooltip title="Minimize" placement="bottom">
              <MinimizeButton
                icon={<CloseOutlined />}
                onClick={() => set$isMinimized(true)}
              />
            </Tooltip>
          </ButtonGroup>
        )}
      </MissionBtnWrap>
      <DialogMission />
      <QuickMissionWebView
        showQuickMission={showQuickMission}
        setShowQuickMission={setShowQuickMission}
      />
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
