import client from '@/api/axiosClient';
import useName from '@/api/useAmrName';
import useAllMissionTitles from '@/api/useMissionTitle';
import { useTopicMission } from '@/api/useTopicMission';
import { ErrorResponse } from '@/utils/globalType';
import SubmitButton from '@/utils/SubmitButton';
import { errorHandler } from '@/utils/utils';
import { useMutation } from '@tanstack/react-query';
import { Form, InputNumber, message, Select } from 'antd';
import { FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

type SubmitPayload = {
  amrId: string[];
  missionId: string;
  topicId: number;
};
const Wrapper = styled.div`
  min-width: 600px;
`;

const TopicForm: FC = () => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const { data: name } = useName();
  const { data: missionTitle } = useAllMissionTitles();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: topicData, refetch } = useTopicMission();

  const AmrOption: { value: null | string; label: string }[] | undefined = useMemo(() => {
    return name?.amrs.map((m) => ({
      label: `${m.amrId} ${m.isReal ? [] : t('simulate')}`,
      value: m.amrId
    }));
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
      return client.post('api/setting/add-topic-task', payload);
    },
    onSuccess: async () => {
      void messageApi.success(t('utils.success'));
      refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const submit = () => {
    const payload = form.getFieldsValue() as SubmitPayload;

    if (topicData?.findIndex((v) => v.topicId === payload.topicId) !== -1) {
      messageApi.warning(t('mission.topic_mission.topic_duplicate'));
      return;
    }

    if (!payload.amrId || payload.amrId.length === 0) {
      messageApi.warning(`amrId${t('mission.topic_mission.amr_warn')}`);
      return;
    }

    for (const key of Object.keys(payload) as Array<keyof SubmitPayload>) {
      if (payload[key] === null) {
        messageApi.warning(`${key}${t('mission.topic_mission.missed')}`);
        return;
      }
    }
    setMissionMutation.mutate(payload);
  };

  return (
    <Wrapper>
      {contextHolder}

      <Form form={form} title={t('mission.topic_mission.topic_mission')}>
        <Form.Item
          label={t('mission.topic_mission.car')}
          name="amrId"
          hasFeedback
          rules={[
            {
              required: true,
              message: t('utils.required')
            }
          ]}
        >
          <Select mode="multiple" options={AmrOption} />
        </Form.Item>

        <Form.Item
          label="topic ID"
          name="topicId"
          hasFeedback
          rules={[
            {
              required: true,
              message: t('utils.required')
            }
          ]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label={t('mission.topic_mission.mission')}
          name="missionId"
          hasFeedback
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
          <SubmitButton form={form} isModel={false} onOk={submit} />
        </Form.Item>
      </Form>
    </Wrapper>
  );
};

export default TopicForm;
