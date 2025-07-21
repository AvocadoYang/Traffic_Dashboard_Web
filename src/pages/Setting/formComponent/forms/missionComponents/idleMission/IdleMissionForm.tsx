import client from '@/api/axiosClient';
import useName from '@/api/useAmrName';
import useAllMissionTitles from '@/api/useMissionTitle';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Form, InputNumber, message, Select } from 'antd';
import { FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { array, object, string } from 'yup';
import SubmitButton from '@/utils/SubmitButton';
import styled from 'styled-components';

type SubmitPayload = {
  amrId: string[];
  missionId: string;
  preventLocation: string[] | null;
  idle_min: number;
};

const Wrapper = styled.div`
  min-width: 600px;
`;

const getIdleSelect = async () => {
  const { data } = await client.get<unknown>('api/setting/idle-task-loc-selection');

  const schema = () =>
    array(
      object({
        label: string().optional(),
        value: string().optional()
      })
    ).optional();

  return schema().validate(data, { stripUnknown: true });
};

const IdleMissionForm: FC = () => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const { data: name } = useName();
  const { data: missionTitle } = useAllMissionTitles();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: idleLocSelect, isLoading } = useQuery(['idle-task-selection'], getIdleSelect);
  const queryClient = useQueryClient();

  const AmrOption: { value: null | string; label: string }[] | undefined = useMemo(() => {
    return (
      name?.amrs
        // .filter((a) => a.isReal === true)
        .map((m) => ({
          label: m.isReal ? m.amrId : `${m.amrId} (${t('simulate')})`,
          value: m.amrId
        }))
    );
  }, [name]);

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

  const setMissionMutation = useMutation({
    mutationFn: (payload: SubmitPayload) => {
      return client.post('api/setting/add-idle-task', payload);
    },
    onSuccess: async () => {
      void messageApi.success(t('utils.success'));
      await queryClient.refetchQueries({
        queryKey: ['idle-task']
      });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const submit = () => {
    const payload = form.getFieldsValue() as SubmitPayload;

    if (payload.amrId.length === 0) {
      messageApi.warning('amrId少填資料');
      return;
    }

    // if (payload.idle_min < 3) {
    //   messageApi.warning('不可少於3分鐘');
    //   return;
    // }

    setMissionMutation.mutate(payload);
  };

  return (
    <Wrapper>
      {contextHolder}
      <Form form={form} title="設定依照車輛回傳的id來做任務" onFinish={submit}>
        <Form.Item
          label={t('mission.idle_mission.car')}
          name="amrId"
          hasFeedback
          rules={[
            {
              required: true,
              message: t('mission.idle_mission.amr_warn')
            }
          ]}
        >
          <Select mode="multiple" options={AmrOption} />
        </Form.Item>

        <Form.Item
          label={t('mission.idle_mission.idle_min')}
          name="idle_min"
          hasFeedback
          rules={[
            {
              required: true,
              message: t('utils.required')
            }
          ]}
        >
          <InputNumber min={0.5} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label={t('mission.idle_mission.forbidden')}
          name="preventLocation"
          hasFeedback
          rules={[
            {
              required: true,
              message: t('utils.required')
            }
          ]}
        >
          <Select mode="multiple" options={idleLocSelect} loading={isLoading} />
        </Form.Item>

        <Form.Item
          label={t('mission.idle_mission.mission')}
          hasFeedback
          name="missionId"
          rules={[
            {
              required: true,
              message: t('utils.required')
            }
          ]}
        >
          <Select options={missionOptions} />
        </Form.Item>

        <Form.Item>
          <SubmitButton form={form} isModel={false} />
        </Form.Item>
      </Form>
    </Wrapper>
  );
};

export default IdleMissionForm;
