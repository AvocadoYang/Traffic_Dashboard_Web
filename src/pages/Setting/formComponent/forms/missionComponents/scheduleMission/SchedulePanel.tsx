import { FC, useState } from 'react';
import { Flex, Form } from 'antd';
import { useTranslation } from 'react-i18next';
import FormHr from '@/pages/Setting/utils/FormHr';
import ScheduleForm from './ScheduleForm';
import ScheduleTable from './ScheduleTable';

const SchedulePanel: FC<{
  sortableId: string;
  attributes: import('@dnd-kit/core').DraggableAttributes;
  listeners: import('@dnd-kit/core/dist/hooks/utilities').SyntheticListenerMap | undefined;
}> = ({ attributes, listeners }) => {
  const [selectId, setSelectId] = useState<null | string>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const { t } = useTranslation();

  return (
    <>
      <div>
        <h3 className="drop_button_style" {...listeners} {...attributes}>
          {t('mission.schedule_mission.schedule_mission')}
        </h3>
        <FormHr />

        <Flex gap="middle" justify="flex-start" align="start" vertical>
          <ScheduleForm
            form={form}
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            selectId={selectId}
            setSelectId={setSelectId}
          />
          <ScheduleTable setSelectId={setSelectId} form={form} setIsModalOpen={setIsModalOpen} />
        </Flex>
      </div>
    </>
  );
};

export default SchedulePanel;
