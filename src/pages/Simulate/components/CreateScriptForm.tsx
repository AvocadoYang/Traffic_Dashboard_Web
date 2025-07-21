import client from '@/api/axiosClient';
import useSimulateScript from '@/api/useSimulateScript';
import { GlobalLoadingPage } from '@/utils/GlobalLoadingPage';
import { ErrorResponse } from '@/utils/globalType';
import SubmitButton from '@/utils/SubmitButton';
import { errorHandler } from '@/utils/utils';
import { useMutation } from '@tanstack/react-query';
import { Flex, Form, Input, message, Modal, Typography } from 'antd';
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type FieldType = {
  name: string;
};

const CreateScriptForm: FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [messageApi, contextHolders] = message.useMessage();
  const { isLoading, isError, refetch } = useSimulateScript();
  const [open, setOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: (payload: FieldType) => {
      return client.post('api/simulate/create-script', payload);
    },
    onSuccess: () => {
      void messageApi.success(t('utils.success'));
      setOpen(false);
      refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const onFinish = () => {
    const payload = form.getFieldsValue() as FieldType;
    createMutation.mutate(payload);
  };

  useEffect(() => {
    if (isError) setOpen(true);
  }, [isError]);

  if (isLoading) return <GlobalLoadingPage />;
  return (
    <>
      {contextHolders}

      <Modal
        open={open}
        title={t("sim.modal.haven't_set_default")}
        footer={() => <SubmitButton isModel form={form} onOk={onFinish} />}
      >
        <Flex vertical align="start" gap={24}>
          <Typography.Text>{t('sim.modal.do_you_want_to_create_one')}</Typography.Text>

          <Form form={form} autoComplete="off">
            <Form.Item<FieldType>
              label={t('sim.modal.name')}
              name="name"
              rules={[{ required: true, message: t('utils.required') }]}
            >
              <Input />
            </Form.Item>
          </Form>
        </Flex>
      </Modal>
    </>
  );
};

export default CreateScriptForm;
