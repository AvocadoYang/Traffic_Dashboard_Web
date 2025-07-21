import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Flex } from 'antd';

import WarningIdForm from './WarningIdForm';

import FormHr from '@/pages/Setting/utils/FormHr';

import WarningListTable from './WarningListTable';



const EditWarningListPanel: FC<{
  sortableId: string;
  attributes: import('@dnd-kit/core').DraggableAttributes;
  listeners: import('@dnd-kit/core/dist/hooks/utilities').SyntheticListenerMap | undefined;
}> = ({ attributes, listeners }) => {
  const { t } = useTranslation();

  return (
    <>
      <div>
        <h3 className="drop_button_style" {...listeners} {...attributes}>
          {t('file.warning_list.warning_table')}
        </h3>
        <FormHr />

        <Flex gap="middle" justify="flex-start" align="start" vertical>
          <WarningIdForm />
          <WarningListTable />
        </Flex>
      </div>
    </>
  );
};

export default EditWarningListPanel;
