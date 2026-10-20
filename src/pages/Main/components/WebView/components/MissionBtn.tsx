import {
  ThunderboltOutlined,
  CalendarOutlined,
  UploadOutlined,
  SyncOutlined,
  RocketOutlined,
  VerticalAlignMiddleOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Flex, message, Modal } from "antd";
import { useNavigate } from "react-router-dom";
import { useFavoriteMissions } from "./FavoriteMissionBar";
import { useTranslation } from "react-i18next";
import { DialogMission } from "../../missionModal";
import { memo, useState } from "react";
import { OpenAssignMission, OpenQueueMirTask } from "@/pages/Main/global/jotai";
import { useSetAtom } from "jotai";
import QuickMissionWebView from "../../missionModal/QuickMissionWebView";
import styled from "styled-components";
import UploadMission from "../../missionModal/UploadMission";
import CycleMissionV2 from "../../missionModal/CycleMissionV2";
import CycleMissionViewer from "../../missionModal/CycleMissionViewer";
import QueueMirTaskModal from "../../missionModal/QueueMirTaskModal";
import { Cycle, Cycle_Mission } from "@/sockets/useCycleMission";
import { headerNavItemBase } from "@/styles/headerNavItemStyle";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useConfigFlags from "@/api/useConfigFlags";

// 跟 Header 上「切換頁面」的導覽按鈕共用同一份樣式,讓這排任務派發按鈕
// 看起來就是導覽列的一部分,不是另一種風格的工具列。
const NavStyleButton = styled(Button)`
  ${headerNavItemBase}
`;

const ButtonGroup = styled(Flex)`
  gap: 4px;
`;

const MissionBtn = () => {
  const { t } = useTranslation();
  const { data: configFlags } = useConfigFlags();
  const hasMir = configFlags?.hasMir ?? true;
  const openAssignMission = useSetAtom(OpenAssignMission);
  const openQueueMirTask = useSetAtom(OpenQueueMirTask);
  const [showQuickMission, setShowQuickMission] = useState(false);
  const [showUploadMission, setShowUploadMission] = useState(false);
  const [showCycleMission, setShowCycleMission] = useState(false);
  const [showEditCycleMission, setShowEditCycleMission] = useState(false);
  const [editCyc, setEditCyc] = useState<null | Cycle>(null);
  const navigate = useNavigate();
  const { favorites, run, busy, contextHolder: favoriteContextHolder } = useFavoriteMissions();
  const [modal, modalHolder] = Modal.useModal();
  const [messageApi, messageContextHolder] = message.useMessage();

  const submitMutation = useMutation({
    mutationFn: () => {
      return client.post("api/corning/trigger-elevator-mission");
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  return (
    <>
      {favoriteContextHolder}
      {messageContextHolder}
      {modalHolder}
      <ButtonGroup align="center">
        <NavStyleButton
          onClick={() => {
            setShowUploadMission(!showUploadMission);
          }}
          icon={<UploadOutlined />}
        >
          {t("main.card_name.upload_mission")}
        </NavStyleButton>

        <NavStyleButton
          onClick={() => {
            setShowCycleMission(!showCycleMission);
          }}
          icon={<SyncOutlined />}
        >
          {t("main.card_name.cycle_mission")}
        </NavStyleButton>

        <NavStyleButton
          onClick={() => {
            setShowQuickMission(!showQuickMission);
          }}
          icon={<ThunderboltOutlined />}
        >
          {t("main.card_name.quick_mission")}
        </NavStyleButton>

        <NavStyleButton
          onClick={() => {
            submitMutation.mutate();
          }}
          icon={<VerticalAlignMiddleOutlined />}
        >
          {t("main.card_name.elevate_mission")}
        </NavStyleButton>

        <NavStyleButton
          onClick={() => {
            openAssignMission(true);
          }}
          icon={<CalendarOutlined />}
        >
          {t("main.card_name.new_mission")}
        </NavStyleButton>

        {favorites.length > 0 && (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                ...favorites.map(({ fav, name, title }) => ({
                  key: fav.id,
                  label: name,
                  title,
                  disabled: busy === fav.id,
                })),
                { type: "divider" as const },
                { key: "__manage", label: t("profile.favorites.manage") },
              ],
              onClick: ({ key }) => {
                if (key === "__manage") {
                  navigate("/profile?tab=favorites");
                  return;
                }
                const item = favorites.find((x) => x.fav.id === key);
                if (!item) return;
                modal.confirm({
                  title: t("profile.favorites.confirm", { name: item.name }),
                  content: item.fav.amrId ? `${t("utils.amr_id")}: ${item.fav.amrId}` : t("utils.random"),
                  onOk: () => run(item.fav),
                });
              },
            }}
          >
            <NavStyleButton icon={<StarOutlined />}>{t("profile.tab.favorites")}</NavStyleButton>
          </Dropdown>
        )}

        {/* <NavStyleButton
          onClick={() => {
            openQueueMirTask(true);
          }}
          icon={<RocketOutlined />}
        >
          {t("main.card_name.queue_mir_task")}
        </NavStyleButton> */}
      </ButtonGroup>

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
      <QueueMirTaskModal />
    </>
  );
};

export default memo(MissionBtn);
