import { Card, Divider, Typography } from 'antd';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import CreateFormat from './CreateFormat';
import DataTable from './DataTable';

const { Title } = Typography;

const CustomCargoInfoPanel: FC<{
  sortableId: string;
  attributes: import('@dnd-kit/core').DraggableAttributes;
  listeners: import('@dnd-kit/core/dist/hooks/utilities').SyntheticListenerMap | undefined;
}> = ({ attributes, listeners }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <Title level={4} className="cursor-move" {...listeners} {...attributes}>
        {t('toolbar.others.custom_cargo_info')}
      </Title>
      <Divider />
      <CreateFormat />
      <Divider />
      <DataTable />
    </Card>
  );
};

export default CustomCargoInfoPanel;
