import { SingleChargeStation } from '@/api/useAllCharge';
import FormHr from '@/pages/Setting/utils/FormHr';
import { PeripheralEditData, IsEditPeripheralStyle } from '@/utils/gloable';
import { Button, Select, Table } from 'antd';
import { useAtom, useSetAtom } from 'jotai';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SettingStyleForm from './SettingStyleForm';
import { FormatPainterOutlined } from '@ant-design/icons';
import usePeripheralStyle from '@/api/usePeripheralStyle';

const EditPeripheralIcon: FC<{
  sortableId: string;
  attributes: import('@dnd-kit/core').DraggableAttributes;
  listeners: import('@dnd-kit/core/dist/hooks/utilities').SyntheticListenerMap | undefined;
}> = ({ attributes, listeners }) => {
  const { t } = useTranslation();
  const setSelectStation = useSetAtom(PeripheralEditData);
  const [isEditStation, setIsEditStation] = useAtom(IsEditPeripheralStyle);
  const [filterType, setFilterType] = useState<string | null>(null);
  const { data } = usePeripheralStyle(filterType);

  const uniqueAreaTypes = Array.from(new Set((data ?? []).map((item) => item?.areaType)));

  const onChangeAreaType = (type: string) => {
    setFilterType(type ?? null);
  };

  const handleEdit = (loc: number) => {
    if (!data) return;
    const targetIndex = data.findIndex((a) => a?.locationId === loc);

    if (targetIndex === -1) {
      setSelectStation(null);
      return;
    }

    setSelectStation({
      loc: data[targetIndex]?.locationId as number,
      peripheralType: data[targetIndex]?.areaType as string,
      translateX: data[targetIndex]?.translateX as number,
      translateY: data[targetIndex]?.translateY as number,
      rotate: data[targetIndex]?.rotate as number,
      scale: data[targetIndex]?.scale as number,
      flex_direction: data[targetIndex]?.flex_direction as string
    });

    setIsEditStation(true);
  };

  const columns = [
    {
      title: t('other.edit_mission_tag.location'),
      dataIndex: 'locationId',
      key: 'locationId'
    },
    {
      title: t('peripheral_style.areaType'),
      dataIndex: 'areaType',
      key: 'areaType',
      filteredValue: filterType ? [filterType] : null,
      onFilter: (value, record) => record.areaType === value,
      sorter: (a, b) => a.areaType.localeCompare(b.areaType),
      render: (v: string) => t(`peripheral.${v}` as any) || v
    },
    {
      title: 'x',
      dataIndex: 'x',
      key: 'x'
    },
    {
      title: 'y',
      dataIndex: 'y',
      key: 'y'
    },
    {
      title: 'translateX',
      dataIndex: 'translateX',
      key: 'translateX'
    },
    {
      title: 'translateY',
      dataIndex: 'translateY',
      key: 'translateY'
    },
    {
      title: 'rotate',
      dataIndex: 'rotate',
      key: 'rotate'
    },
    {
      title: 'scale',
      dataIndex: 'scale',
      key: 'scale'
    },
    {
      title: t('other.edit_charge_station_icon_style.edit_position'),
      dataIndex: 'operation',
      key: 'operation',

      render: (_v: unknown, record: SingleChargeStation) => {
        return (
          <Button
            icon={<FormatPainterOutlined />}
            onClick={() => handleEdit(record.locationId)}
            color="primary"
            variant="filled"
          >
            {t('other.edit_charge_station_icon_style.edit_position')}
          </Button>
        );
      }
    }
  ];

  return (
    <div>
      <h3 className="drop_button_style" {...listeners} {...attributes}>
        {t('toolbar.others.edit_peripheral_style')}
      </h3>
      <FormHr />

      {isEditStation ? (
        <SettingStyleForm />
      ) : (
        <>
          <Select
            allowClear
            style={{ width: 200, marginBottom: 16 }}
            placeholder="Filter by areaType"
            onChange={(value) => onChangeAreaType(value)}
            options={uniqueAreaTypes.map((type) => ({ label: type, value: type }))}
            value={filterType ?? undefined}
          />
          <Table
            dataSource={data as SingleChargeStation[]}
            columns={columns as []}
            rowKey={(record: SingleChargeStation) => record.locationId}
          />
        </>
      )}
    </div>
  );
};

export default EditPeripheralIcon;
