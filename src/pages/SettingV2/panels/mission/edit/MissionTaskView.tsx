import { FC, useState } from "react";
import { Form, Modal, Popconfirm, message } from "antd";
import {
  CopyOutlined,
  LeftOutlined,
  PlusOutlined,
  ScheduleOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { nanoid } from "nanoid";
import client from "@/api/axiosClient";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { isFork, isMir } from "@/utils/globalFunction";
import {
  PanelShell,
  Section,
  SectionTitle,
  Toolbar,
  SolidButton,
  GhostButton,
  EmptyState,
  Tag,
} from "../../../ui/primitives";
import ForkStepList from "./steps/ForkStepList";
import ForkTaskForm from "./forkForm/ForkTaskForm";
import MirMissionEditor from "./mirForm/MirMissionEditor";
import { STEP_QUERY_BASE } from "./steps/useStepMutations";

type Props = {
  missionId: string;
  missionName: string;
  /** Robot_types.value,用來判斷是 fork 還是 MiR */
  robotValue: string;
  onBack: () => void;
};

const MissionTaskView: FC<Props> = ({
  missionId,
  missionName,
  robotValue,
  onBack,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [taskForm] = Form.useForm();
  const currentMapId = useAtomValue(currentMapIdAtom);

  const [editTaskKey, setEditTaskKey] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  // 人形車的步驟編輯器沒有人在用,v2 不做這一支;v1 的 /setting 還留著。
  const isForkMission = isFork(robotValue);
  const isMirMission = isMir(robotValue);

  /**
   * Fork 的步驟是一次加一筆、當下就寫進後端;
   * MiR 走的是自己那一套(本地先排好,按儲存才一次送出),所以不用這顆按鈕。
   */
  const addTaskMutation = useMutation({
    mutationFn: () =>
      client.post("api/setting/add-task", { key: missionId, currentMapId }),
    onSuccess: async () => {
      // v1 這裡打的是 "all-relate-all-relate-task-fork",多寫了一次前綴,
      // 所以其實沒有對到任何 query,只是靠 2 秒的輪詢才看到新步驟。
      await queryClient.refetchQueries({
        queryKey: [STEP_QUERY_BASE, missionId],
      });
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const copyMissionMutation = useMutation({
    mutationFn: () =>
      client.post("api/setting/copy-task", {
        originKey: missionId,
        newKey: nanoid(),
        currentMapId: currentMapId || "",
      }),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["all-mission-title-detail"],
      });
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const openTaskForm = (key: string) => {
    taskForm.resetFields();
    setEditTaskKey(key);
    setFormOpen(true);
  };

  const closeTaskForm = () => {
    setFormOpen(false);
    setEditTaskKey("");
  };

  return (
    <PanelShell>
      {contextHolder}

      <Section>
        <SectionTitle>
          <ScheduleOutlined />
          {t("mission.add_mission.edit_detail")}
          <Tag>{missionName}</Tag>
        </SectionTitle>

        <Toolbar>
          <GhostButton onClick={onBack}>
            <LeftOutlined />
            {t("mission.mission_list.previous")}
          </GhostButton>

          {isForkMission && (
            <SolidButton
              onClick={() => addTaskMutation.mutate()}
              disabled={addTaskMutation.isLoading}
            >
              <PlusOutlined />
              {t("mission.mission_list.create_mission")}
            </SolidButton>
          )}

          <Popconfirm
            title={t("mission.mission_list.copy_mission")}
            okText={t("utils.confirm")}
            cancelText={t("utils.cancel")}
            onConfirm={() => copyMissionMutation.mutate()}
          >
            <GhostButton>
              <CopyOutlined />
              {t("mission.mission_list.copy_mission")}
            </GhostButton>
          </Popconfirm>
        </Toolbar>

        {!isForkMission && !isMirMission && (
          <EmptyState>
            這個車種的步驟編輯還沒有搬到新版設定頁。請先從舊版設定頁
            (/setting)編輯。
          </EmptyState>
        )}

        {isForkMission && (
          <ForkStepList
            missionId={missionId}
            robotValue={robotValue}
            onEditStep={openTaskForm}
          />
        )}

        {isMirMission && (
          <MirMissionEditor key={missionId} missionId={missionId} />
        )}
      </Section>

      {/* MiR 的參數是在自己的抽屜裡改,不會用到這個對話框 */}
      <Modal
        open={formOpen && isForkMission}
        title={t("utils.edit")}
        onCancel={closeTaskForm}
        footer={null}
        width="90vw"
        style={{ top: 24 }}
        destroyOnHidden
      >
        <ForkTaskForm
          key={editTaskKey}
          editTaskKey={editTaskKey}
          selectedMissionKey={missionId}
          form={taskForm}
        />
      </Modal>
    </PanelShell>
  );
};

export default MissionTaskView;
