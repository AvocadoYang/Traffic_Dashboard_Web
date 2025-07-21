import { Button, Flex, message, Modal, Tooltip } from 'antd';
import { Dispatch, FC, SetStateAction, useState } from 'react';
import { nanoid } from 'nanoid';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import client from '@/api/axiosClient';
import ForkTaskTable from './ForkTaskTable';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';
import { CopyOutlined, LeftOutlined, PlusOutlined } from '@ant-design/icons';
import { isFork, isHumanRobot } from '@/utils/globalFunction';
import HumanRobotTaskTable from './HumanRobotTaskTable';
import TaskFormHumanRobot from './humanRobotEditMissionSlice/TaskFormHumanRobot';
import TaskFormFork from './forkEditMissionSlice/TaskFormFork';

const copy = (originKey: string) => {
  const randomId = nanoid();
  return {
    originKey,
    newKey: randomId
  };
};

const MissionList: FC<{
  selectedMissionKey: string;
  setSelectedMissionKey: Dispatch<SetStateAction<string>>;
  selectedMissionCar: string;
  missionName: string;
}> = ({ selectedMissionKey, setSelectedMissionKey, selectedMissionCar, missionName }) => {
  const [open, setOpen] = useState(false);
  const [editTaskKey, setEditTaskKey] = useState('');

  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const addTaskMutation = useMutation({
    mutationFn: () => {
      return client.post('api/setting/add-task', {
        key: selectedMissionKey
      });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['all-relate-all-relate-task-fork', selectedMissionKey]
      });
      await queryClient.refetchQueries({
        queryKey: ['all-relate-task-human-robot', selectedMissionKey]
      });
      messageApi.success(t('utils.success'));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const copyMissionMutation = useMutation({
    mutationFn: () => {
      return client.post('api/setting/copy-task', copy(selectedMissionKey));
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['all-mission-title-detail']
      });
      messageApi.success(t('utils.success'));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
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
  };

  return (
    <>
      {contextHolder}
      <Flex gap="middle" justify="flex-start" align="start" vertical>
        <Flex gap="middle" justify="center" align="center">
          <Tooltip title={t('mission.mission_list.previous')}>
            <Button
              onClick={() => setSelectedMissionKey('')}
              color="default"
              variant="filled"
              icon={<LeftOutlined></LeftOutlined>}
            />
          </Tooltip>

          <Button
            icon={<PlusOutlined />}
            color="primary"
            variant="filled"
            onClick={() => addNewTask()}
          >
            {t('mission.mission_list.create_mission')}
          </Button>

          <Button
            icon={<CopyOutlined />}
            color="primary"
            variant="filled"
            onClick={() => copyMission()}
          >
            {t('mission.mission_list.copy_mission')}
          </Button>
          {missionName}
        </Flex>

        {isFork(selectedMissionCar) ? (
          <ForkTaskTable
            showModal={showModal}
            selectedMissionKey={selectedMissionKey}
            selectedMissionCar={selectedMissionCar}
          />
        ) : (
          []
        )}
        {isHumanRobot(selectedMissionCar) ? (
          <HumanRobotTaskTable
            showModal={showModal}
            selectedMissionKey={selectedMissionKey}
            selectedMissionCar={selectedMissionCar}
          />
        ) : (
          []
        )}

        <Modal
          width={700}
          title={t('utils.edit')}
          open={open}
          onCancel={handleCancel}
          footer={() => []}
        >
          {isFork(selectedMissionCar) ? (
            <TaskFormFork
              editTaskKey={editTaskKey}
              selectedMissionCar={selectedMissionCar}
              selectedMissionKey={selectedMissionKey}
            />
          ) : (
            []
          )}
          {isHumanRobot(selectedMissionCar) ? (
            <TaskFormHumanRobot editTaskKey={editTaskKey} selectedMissionKey={selectedMissionKey} />
          ) : (
            []
          )}
        </Modal>
      </Flex>
    </>
  );
};

export default MissionList;
