import { FC, useState } from "react";
import { Form, Modal, Popconfirm, Tabs, message } from "antd";
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
import { isFork, isHumanRobot, isMir } from "@/utils/globalFunction";
import TaskFormHumanRobot from "@/pages/Setting/formComponent/forms/missionComponents/editMission/humanRobotEditMissionSlice/TaskFormHumanRobot";
import TaskFormMir from "@/pages/Setting/formComponent/forms/missionComponents/mir/mirEditMissionSlice/TaskFormMir";
import EditMirMissionPanel from "@/pages/Setting/formComponent/forms/missionComponents/mir/mirEditMissionSlice/EditMirMissionPanel";
import {
  PanelShell,
  Section,
  SectionTitle,
  Toolbar,
  SolidButton,
  GhostButton,
  Tag,
} from "../../../ui/primitives";
import ForkStepList from "./steps/ForkStepList";
import ForkTaskForm from "./forkForm/ForkTaskForm";
import HumanRobotStepList from "./steps/HumanRobotStepList";
import MirStepList from "./steps/MirStepList";
import { STEP_QUERY_BASE, StepVariant } from "./steps/useStepMutations";

type Props = {
  missionId: string;
  missionName: string;
  /** Robot_types.value,用來判斷是 fork / 人形 / MiR */
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

  const variant: StepVariant | null = isFork(robotValue)
    ? "fork"
    : isHumanRobot(robotValue)
      ? "humanRobot"
      : isMir(robotValue)
        ? "mir"
        : null;

  const addTaskMutation = useMutation({
    mutationFn: () =>
      client.post("api/setting/add-task", { key: missionId, currentMapId }),
    onSuccess: async () => {
      // v1 這裡打的是 "all-relate-all-relate-task-fork",多寫了一次前綴,
      // 所以其實沒有對到任何 query,只是靠 2 秒的輪詢才看到新步驟。
      if (variant) {
        await queryClient.refetchQueries({
          queryKey: [STEP_QUERY_BASE[variant], missionId],
        });
      }
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
          <SolidButton
            onClick={() => addTaskMutation.mutate()}
            disabled={addTaskMutation.isLoading}
          >
            <PlusOutlined />
            {t("mission.mission_list.create_mission")}
          </SolidButton>
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

        {variant === "fork" && (
          <ForkStepList
            missionId={missionId}
            robotValue={robotValue}
            onEditStep={openTaskForm}
          />
        )}

        {variant === "humanRobot" && (
          <HumanRobotStepList
            missionId={missionId}
            robotValue={robotValue}
            onEditStep={openTaskForm}
          />
        )}

        {variant === "mir" && (
          <Tabs
            style={{ width: "100%" }}
            items={[
              {
                key: "steps",
                label: t("mission.add_mission.edit_detail"),
                children: (
                  <MirStepList
                    missionId={missionId}
                    robotValue={robotValue}
                    onEditStep={openTaskForm}
                  />
                ),
              },
              {
                key: "mir-style",
                label: "MiR",
                children: <EditMirMissionPanel selectedMissionKey={missionId} />,
              },
            ]}
          />
        )}
      </Section>

      <Modal
        open={formOpen}
        title={t("utils.edit")}
        onCancel={closeTaskForm}
        footer={null}
        width="90vw"
        style={{ top: 24 }}
        destroyOnHidden
      >
        {variant === "fork" && (
          <ForkTaskForm
            key={editTaskKey}
            editTaskKey={editTaskKey}
            selectedMissionKey={missionId}
            form={taskForm}
          />
        )}

        {variant === "humanRobot" && (
          <TaskFormHumanRobot
            editTaskKey={editTaskKey}
            selectedMissionKey={missionId}
          />
        )}

        {variant === "mir" && (
          <TaskFormMir
            key={editTaskKey}
            editTaskKey={editTaskKey}
            selectedMissionCar={robotValue}
            selectedMissionKey={missionId}
            form={taskForm}
          />
        )}
      </Modal>
    </PanelShell>
  );
};

export default MissionTaskView;
