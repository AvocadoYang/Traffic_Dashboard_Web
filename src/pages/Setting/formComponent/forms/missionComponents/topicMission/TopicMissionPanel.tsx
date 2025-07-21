import { FC } from 'react';
import { Flex } from 'antd';
import { useTranslation } from 'react-i18next';
import FormHr from '@/pages/Setting/utils/FormHr';
import TopicForm from './TopicTaskForm';
import TopicTaskTable from './TopicTaskTable';

const TopicMissionPanel: FC<{
  sortableId: string;
  attributes: import('@dnd-kit/core').DraggableAttributes;
  listeners: import('@dnd-kit/core/dist/hooks/utilities').SyntheticListenerMap | undefined;
}> = ({ attributes, listeners }) => {
  const { t } = useTranslation();
  return (
    <div>
      <h3 className="drop_button_style" {...listeners} {...attributes}>
        {t('mission.topic_mission.topic_mission')}
      </h3>
      <FormHr />
      <Flex gap="middle" justify="flex-start" align="start" vertical>
        <TopicForm />
        <TopicTaskTable />
      </Flex>
    </div>
  );
};

export default TopicMissionPanel;
