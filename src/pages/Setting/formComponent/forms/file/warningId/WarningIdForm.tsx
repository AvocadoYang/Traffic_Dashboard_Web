import client from '@/api/axiosClient';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, FormProps, Input, InputNumber, message, Radio } from 'antd';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import SubmitButton from '@/utils/SubmitButton';
import useWarningTable from '@/api/useWarningTable';
interface FieldType {
  id: number;
  is_open_buzzer: boolean;
  info_ch: string;
  info_en: string;
  solution_ch: string;
  solution_en: string;
}

const WarningIdForm: FC = () => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const { data: warningData } = useWarningTable();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const addMutation = useMutation({
    mutationFn: (values: FieldType) => {
      return client.post('api/setting/add-warning', values);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['warning-table']
      });
      form.resetFields();
      messageApi.success('success');
    },
    onError: (e: ErrorResponse) => {
      errorHandler(e, messageApi);
    }
  });

  const onFinish: FormProps<FieldType>['onFinish'] = (values) => {

    if (warningData?.findIndex((v) => v?.id === values.id) !== -1) {
      messageApi.warning(t('file.warning_list.id_duplicate_warn'));
      return;
    }
    addMutation.mutate(values);
  };

  return (
    <>
      {contextHolder}
      <Form form={form} autoComplete="off" onFinish={onFinish}>
        <Form.Item
          label={t('file.warning_list.error_code')}
          name="id"
          hasFeedback
          rules={[
            {
              required: true,
              message: t('utils.required')
            }
          ]}
        >
          <InputNumber min={1} />
        </Form.Item>

        <Form.Item
          label={t('file.warning_list.buzzer')}
          name="is_open_buzzer"
          hasFeedback
          rules={[
            {
              required: true,
              message: t('utils.required')
            }
          ]}
        >
          <Radio.Group buttonStyle="solid">
            <Radio.Button value={true}>{t('utils.yes')}</Radio.Button>
            <Radio.Button value={false}>{t('utils.no')}</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label={t('file.warning_list.info_ch')}
          name="info_ch"
          hasFeedback
          rules={[
            {
              required: true,
              message: t('utils.required')
            }
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label={t('file.warning_list.info_en')}
          name="info_en"
          hasFeedback
          rules={[
            {
              required: true,
              message: t('utils.required')
            }
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label={t('file.warning_list.solution_ch')}
          name="solution_ch"
          hasFeedback
          rules={[
            {
              required: true,
              message: t('utils.required')
            }
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label={t('file.warning_list.solution_en')}
          name="solution_en"
          hasFeedback
          rules={[
            {
              required: true,
              message: t('utils.required')
            }
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item>
          <SubmitButton isModel={false} form={form} />
        </Form.Item>
      </Form>
    </>
  );
};

export default WarningIdForm;
