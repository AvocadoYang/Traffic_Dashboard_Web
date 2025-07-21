import client from '@/api/axiosClient';
import useName from '@/api/useAmrName';
import useAllMissionTitles from '@/api/useMissionTitle';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Select, message } from 'antd';
import { FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusOutlined } from '@ant-design/icons';

type DataType = { amrId: string[]; missionId: string };

const BeforeLeftChargeStationForm: FC = () => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const { data: missionTitle } = useAllMissionTitles();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { data: name } = useName();

  const AmrOption: { value: null | string; label: string }[] | undefined = useMemo(() => {
    return name?.amrs.map((m) => ({
      label: `${m.amrId} ${m.isReal ? [] : t('simulate')}`,
      value: m.amrId
    }));
  }, [name]);

  const addMutation = useMutation({
    mutationFn: (payload: DataType) => {
      return client.post('api/setting/add-BLCS', payload);
    },
    onSuccess: async () => {
      void messageApi.success(t('utils.success'));
      await queryClient.refetchQueries({
        queryKey: ['BLCS']
      });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const missionOptions = missionTitle
    ?.filter((g) =>
      g.MissionTitleBridgeCategory.some((s) => s.Category?.tagName === 'normal-mission')
    )
    .map((v) => {
      return {
        value: v.id,
        label: v.name
      };
    });

  const handleAdd = () => {
    const payload = form.getFieldsValue() as DataType;

    if (
      !Array.isArray(payload.amrId) ||
      payload.amrId.length === 0 ||
      !payload.missionId ||
      typeof payload.missionId !== 'string'
    ) {
      void messageApi.warning(t('mission.before_left_charge_station_mission.field_required'));
      return;
    }

    addMutation.mutate(payload);
  };

  return (
    <>
      {contextHolder}
      <Form onFinish={handleAdd} form={form} labelCol={{ span: 6 }} autoComplete="off">
        <Form.Item label={t('mission.before_left_charge_station_mission.car')} name="amrId">
          <Select options={AmrOption} mode="multiple" />
        </Form.Item>
        <Form.Item label={t('mission.before_left_charge_station_mission.mission')} name="missionId">
          <Select options={missionOptions} />
        </Form.Item>

        <Form.Item label={null}>
          <Button icon={<PlusOutlined />} color="primary" variant="filled" htmlType="submit">
            {t('utils.add')}
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

export default BeforeLeftChargeStationForm;
