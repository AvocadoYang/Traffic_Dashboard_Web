import dayjs from 'dayjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox, Form, FormInstance, Modal, Select, TimePicker, message } from 'antd';
import { Dispatch, FC, SetStateAction, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useAllMissionTitles from '@/api/useMissionTitle';
import useName from '@/api/useAmrName';
import client from '@/api/axiosClient';
import { errorHandler } from '@/utils/utils';
import { ErrorResponse } from '@/utils/globalType';
import SubmitButton from '@/utils/SubmitButton';

interface DataType {
  id: string;
  active: boolean;
  amrId?: string[];
  schedule: string;
  missionId?: string;
  missionName: string;
  day?: number[];
  time?: {
    $m: string;
    $H: string;
  };
}

interface SubmitValue {
  id: string;
  schedule: string;
  missionId: string;
  amrId: string[];
}

const format = 'HH:mm';

const weekArr = Array.from({ length: 7 }, (_v, i) => i + 1);

const weekOptions = weekArr.map((v) => ({
  label: `星期${v}`,
  value: v
}));

function convertCommaSeparatedToString(commaSeparated: string): string {
  return commaSeparated.split(',').join('');
}

const ScheduleForm: FC<{
  form: FormInstance<unknown>;
  isModalOpen: boolean;
  setIsModalOpen: Dispatch<SetStateAction<boolean>>;
  selectId: string | null;
  setSelectId: Dispatch<SetStateAction<string | null>>;
}> = ({ form, isModalOpen, setIsModalOpen, selectId, setSelectId }) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: missionTitle } = useAllMissionTitles();
  const queryClient = useQueryClient();
  const { data: name } = useName();

  const AmrOption: { value: null | string; label: string }[] | undefined = useMemo(() => {
    return name?.amrs.map((m) => ({
      label: `${m.amrId} ${m.isReal ? [] : t('simulate')}`,
      value: m.amrId
    }));
  }, [name]);

  const handleCancel = () => {
    setIsModalOpen(false);
  };

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

  const updateMutation = useMutation({
    mutationFn: (payload: SubmitValue) => {
      return client.post('api/setting/update-schedule', payload);
    },
    onSuccess: async () => {
      void messageApi.success(t('utils.success'));
      await queryClient.refetchQueries({
        queryKey: ['all-schedule']
      });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const handleUpdate = () => {
    const payload = form.getFieldsValue() as DataType;

    if (!payload.amrId || !payload.missionId || !payload.day || !payload.time || !selectId) {
      void messageApi.error(t('utils.error'));
      return;
    }
    const schedule = `${convertCommaSeparatedToString(
      payload.day.toString()
    )}-${payload.time?.$H}-${payload.time?.$m}`;

    const value = {
      id: selectId,
      schedule,
      missionId: payload.missionId,
      amrId: payload.amrId
    };

    updateMutation.mutate(value);
    form.resetFields();
    setSelectId(null);
    setIsModalOpen(false);
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={t('mission.schedule_mission.schedule_mission')}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={() => (
          <>
            <SubmitButton form={form} onOk={handleUpdate} isModel />
          </>
        )}
      >
        <Form
          form={form}
          labelCol={{ span: 6 }}
          autoComplete="off"
          name="validateOnly"
          initialValues={{
            time: dayjs('12:08', format)
          }}
        >
          <Form.Item
            label={t('mission.schedule_mission.car')}
            name="amrId"
            rules={[
              {
                required: true,
                message: t('mission.schedule_mission.car_required')
              }
            ]}
          >
            <Select options={AmrOption} mode="multiple" />
          </Form.Item>
          <Form.Item
            label={t('mission.schedule_mission.mission')}
            name="missionId"
            rules={[
              {
                required: true,
                message: t('mission.schedule_mission.mission_required')
              }
            ]}
          >
            <Select options={missionOptions} />
          </Form.Item>

          <Form.Item
            label={t('mission.schedule_mission.week')}
            name="day"
            rules={[
              {
                required: true,
                message: t('mission.schedule_mission.week_required')
              }
            ]}
          >
            <Checkbox.Group options={weekOptions} />
          </Form.Item>

          <Form.Item
            label={t('mission.schedule_mission.what_time')}
            name="time"
            rules={[
              {
                required: true,
                message: t('mission.schedule_mission.week_required')
              }
            ]}
          >
            <TimePicker needConfirm={false} format={format} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ScheduleForm;
