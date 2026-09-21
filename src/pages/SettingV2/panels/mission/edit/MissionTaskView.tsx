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
import ForkTaskTable from "@/pages/Setting/formComponent/forms/missionComponents/editMission/ForkTaskTable";
import HumanRobotTaskTable from "@/pages/Setting/formComponent/forms/missionComponents/editMission/HumanRobotTaskTable";
import TaskFormFork from "@/pages/Setting/formComponent/forms/missionComponents/editMission/forkEditMissionSlice/TaskFormFork";
import TaskFormHumanRobot from "@/pages/Setting/formComponent/forms/missionComponents/editMission/humanRobotEditMissionSlice/TaskFormHumanRobot";
import MirTaskTable from "@/pages/Setting/formComponent/forms/missionComponents/mir/mirEditMissionSlice/MirTaskTable";
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

  const addTaskMutation = useMutation({
    mutationFn: () =>
      client.post("api/setting/add-task", {
        key: missionId,
        currentMapId,
      }),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["all-relate-all-relate-task-fork", missionId],
      });
      await queryClient.refetchQueries({
        queryKey: ["all-relate-task-human-robot", missionId],
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

        {isFork(robotValue) && (
          <ForkTaskTable
            showModal={openTaskForm}
            selectedMissionKey={missionId}
            selectedMissionCar={robotValue}
          />
        )}

        {isHumanRobot(robotValue) && (
          <HumanRobotTaskTable
            showModal={openTaskForm}
            selectedMissionKey={missionId}
            selectedMissionCar={robotValue}
          />
        )}

        {isMir(robotValue) && (
          <Tabs
            style={{ width: "100%" }}
            items={[
              {
                key: "legacy",
                label: t("utils.detail"),
                children: (
                  <MirTaskTable
                    showModal={openTaskForm}
                    selectedMissionKey={missionId}
                    selectedMissionCar={robotValue}
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
        {isFork(robotValue) && (
          <TaskFormFork
            key={editTaskKey}
            editTaskKey={editTaskKey}
            selectedMissionCar={robotValue}
            selectedMissionKey={missionId}
            form={taskForm}
          />
        )}

        {isHumanRobot(robotValue) && (
          <TaskFormHumanRobot
            editTaskKey={editTaskKey}
            selectedMissionKey={missionId}
          />
        )}

        {isMir(robotValue) && (
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
