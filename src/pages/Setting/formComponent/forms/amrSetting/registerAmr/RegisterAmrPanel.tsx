import FormHr from '@/pages/Setting/utils/FormHr';
import { Flex } from 'antd';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import RegisterForm from './RegisterForm';
import RegisterTable from './RegisterTable';

type When_Finish = {
  robot_type: string;
  full_name: string;
  serialNum: string;
};

const RegisterAmrPanel: FC<{
  sortableId: string;
  attributes: import('@dnd-kit/core').DraggableAttributes;
  listeners: import('@dnd-kit/core/dist/hooks/utilities').SyntheticListenerMap | undefined;
}> = ({ attributes, listeners }) => {
  const { t } = useTranslation();
  const [isEdit, setIsEdit] = useState(false);
  const [editData, setEditData] = useState<When_Finish>();

  const props = {
    editData,
    setEditData,
    isEdit,
    setIsEdit
  };
  return (
    <>
      <div>
        <h3 className="drop_button_style" {...listeners} {...attributes}>
          {t('setting_amr.register_amr.title_name')}
        </h3>
        <FormHr />

        <Flex gap="middle" justify="flex-start" align="start" vertical>
          <RegisterForm {...props} />
          <RegisterTable {...props} />
        </Flex>
      </div>
    </>
  );
};

export default RegisterAmrPanel;
