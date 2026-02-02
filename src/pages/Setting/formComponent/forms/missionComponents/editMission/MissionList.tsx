import { Button, Flex, Form, message, Modal, Popconfirm, Tooltip } from "antd";
import { Dispatch, FC, SetStateAction, useState } from "react";
import { nanoid } from "nanoid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import client from "@/api/axiosClient";
import ForkTaskTable from "./ForkTaskTable";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { CopyOutlined, LeftOutlined, PlusOutlined } from "@ant-design/icons";
import { isFork, isHumanRobot } from "@/utils/globalFunction";
import HumanRobotTaskTable from "./HumanRobotTaskTable";
import TaskFormHumanRobot from "./humanRobotEditMissionSlice/TaskFormHumanRobot";
import TaskFormFork from "./forkEditMissionSlice/TaskFormFork";

const copy = (originKey: string) => {
  const randomId = nanoid();
  return {
    originKey,
    newKey: randomId,
  };
};

// Industrial Styled Components
const IndustrialContainer = styled.div`
  background: #f5f5f5;
  padding: 20px;
  font-family: "Roboto Mono", "Courier New", monospace;
`;

const HeaderBar = styled.div`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-left: 4px solid #1890ff;
  padding: 16px 20px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  flex-wrap: wrap;
`;

const MissionTitle = styled.div`
  color: #262626;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: "Roboto Mono", monospace;
  padding: 8px 16px;
  background: #e6f7ff;
  border: 1px solid #1890ff;
  border-radius: 4px;
  margin-left: auto;
`;

const IndustrialButton = styled(Button)`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #262626;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;
  font-weight: 600;

  &:hover {
    background: #f0f5ff;
    border-color: #1890ff;
    color: #1890ff;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
  }

  &.primary {
    background: #1890ff;
    border-color: #1890ff;
    color: #ffffff;

    &:hover {
      background: #40a9ff;
      border-color: #40a9ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  }

  &.back {
    background: #ffffff;
    border-color: #d9d9d9;
    color: #595959;

    &:hover {
      background: #fafafa;
      border-color: #8c8c8c;
      color: #262626;
    }
  }
`;

const IndustrialModal = styled(Modal)`
  .ant-modal-content {
    background: #f5f5f5;
    border: 2px solid #d9d9d9;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .ant-modal-header {
    background: #ffffff;
    border-bottom: 2px solid #d9d9d9;
    border-left: 4px solid #1890ff;
    padding: 16px 24px;
  }

  .ant-modal-title {
    color: #262626;
    font-size: 16px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: "Roboto Mono", monospace;
  }

  .ant-modal-body {
    padding: 0;
    background: #f5f5f5;
  }

  .ant-modal-close {
    color: #8c8c8c;

    &:hover {
      color: #262626;
    }
  }
`;

const MissionList: FC<{
  selectedMissionKey: string;
  setSelectedMissionKey: Dispatch<SetStateAction<string>>;
  selectedMissionCar: string;
  missionName: string;
}> = ({
  selectedMissionKey,
  setSelectedMissionKey,
  selectedMissionCar,
  missionName,
}) => {
  const [open, setOpen] = useState(false);
  const [editTaskKey, setEditTaskKey] = useState("");
  const [ForkForm] = Form.useForm();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const addTaskMutation = useMutation({
    mutationFn: () => {
      return client.post("api/setting/add-task", {
        key: selectedMissionKey,
      });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["all-relate-all-relate-task-fork", selectedMissionKey],
      });
      await queryClient.refetchQueries({
        queryKey: ["all-relate-task-human-robot", selectedMissionKey],
      });
      messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const copyMissionMutation = useMutation({
    mutationFn: () => {
      return client.post("api/setting/copy-task", copy(selectedMissionKey));
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["all-mission-title-detail"],
      });
      messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const addNewTask = () => {
    addTaskMutation.mutate();
  };

  const showModal = (key: string) => {
    setEditTaskKey(key);
    setOpen(true);
  };

  const copyMission = () => {
    copyMissionMutation.mutate();
  };

  const handleCancel = () => {
    setOpen(false);
    ForkForm.resetFields();
  };

  return (
    <IndustrialContainer>
      {contextHolder}
      <Flex gap="middle" justify="flex-start" align="start" vertical>
        <HeaderBar>
          <Tooltip title={t("mission.mission_list.previous")}>
            <IndustrialButton
              className="back"
              onClick={() => setSelectedMissionKey("")}
              icon={<LeftOutlined />}
            >
              BACK
            </IndustrialButton>
          </Tooltip>

          <IndustrialButton
            className="primary"
            icon={<PlusOutlined />}
            onClick={() => addNewTask()}
          >
            {t("mission.mission_list.create_mission")}
          </IndustrialButton>

          <Popconfirm
            title="are your sure copy mission?"
            onConfirm={() => copyMission()}
          >
            <IndustrialButton icon={<CopyOutlined />}>
              {t("mission.mission_list.copy_mission")}
            </IndustrialButton>
          </Popconfirm>

          <MissionTitle>{missionName}</MissionTitle>
        </HeaderBar>

        {isFork(selectedMissionCar) && (
          <ForkTaskTable
            showModal={showModal}
            selectedMissionKey={selectedMissionKey}
            selectedMissionCar={selectedMissionCar}
          />
        )}

        {isHumanRobot(selectedMissionCar) && (
          <HumanRobotTaskTable
            showModal={showModal}
            selectedMissionKey={selectedMissionKey}
            selectedMissionCar={selectedMissionCar}
          />
        )}

        <IndustrialModal
          width={3000}
          title={t("utils.edit")}
          open={open}
          onCancel={handleCancel}
          footer={null}
        >
          {isFork(selectedMissionCar) && (
            <TaskFormFork
              editTaskKey={editTaskKey}
              selectedMissionCar={selectedMissionCar}
              selectedMissionKey={selectedMissionKey}
              form={ForkForm}
            />
          )}

          {isHumanRobot(selectedMissionCar) && (
            <TaskFormHumanRobot
              editTaskKey={editTaskKey}
              selectedMissionKey={selectedMissionKey}
            />
          )}
        </IndustrialModal>
      </Flex>
    </IndustrialContainer>
  );
};

export default MissionList;
