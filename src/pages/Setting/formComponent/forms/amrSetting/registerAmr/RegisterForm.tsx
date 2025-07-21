import client from '@/api/axiosClient';
import useAMRsample from '@/api/useAMRsample';
import { Err } from '@/utils/responseErr';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Flex, Form, Input, InputNumber, message, Select } from 'antd';
import { Dispatch, FC, SetStateAction, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type When_Finish = {
  id?: string;
  robot_type: string;
  full_name: string;
  serialNum: string;
};

const RegisterForm: FC<{
  isEdit: boolean;
  setIsEdit: Dispatch<SetStateAction<boolean>>;
  editData: When_Finish | undefined;
  setEditData: Dispatch<SetStateAction<When_Finish | undefined>>;
}> = ({ isEdit, setIsEdit, editData, setEditData }) => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const { data: robotTypes } = useAMRsample();
  const values = Form.useWatch([], form);
  const [submittable, setSubmittable] = useState<boolean>(false);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: When_Finish) => {
      return client.post('api/setting/create-register-robot', payload);
    },
    onSuccess: async () => {
      messageApi.success(t('utils.success'));
      queryClient.refetchQueries({ queryKey: ['all-register-amr'] });
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    }
  });

  const editMutation = useMutation({
    mutationFn: (payload: When_Finish) => {
      return client.post('api/setting/edit-register-robot', payload);
    },
    onSuccess: async () => {
      messageApi.success(t('utils.success'));
      queryClient.refetchQueries({ queryKey: ['all-register-amr'] });
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    }
  });

  const robotTypeOptions = useMemo(() => {
    return (
      robotTypes?.map((v) => {
        return {
          label: v.name,
          value: v.value
        };
      }) || []
    );
  }, [robotTypes]);

  const handleCancel = () => {
    form.resetFields();
    setIsEdit(false);
    setEditData(undefined);
  };

  const onFinish = (values: When_Finish) => {
    const paddedFullName = String(values.full_name).padStart(3, '0');

    const prefixAmrName = values.robot_type + '-' + paddedFullName;

    if (isEdit) {
      if (!editData?.id) {
        messageApi.error('id is missed');
        return;
      }

      const payload = {
        id: editData.id,
        full_name: prefixAmrName,
        serialNum: values.serialNum,
        robot_type: values.robot_type
      };

      editMutation.mutate(payload);
      form.resetFields();
      setIsEdit(false);
      setEditData(undefined);

      return;
    }

    const payload = {
      full_name: prefixAmrName,
      serialNum: values.serialNum,
      robot_type: values.robot_type
    };
    createMutation.mutate(payload);
  };

  const validateSerialNum = (_: any, value: string) => {
    const serialNumRegex = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
    if (!value || serialNumRegex.test(value)) {
      return Promise.resolve();
    }
    return Promise.reject(new Error(t('setting_amr.register_amr.invalid_serial_number')));
  };

  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setSubmittable(true))
      .catch(() => setSubmittable(false));
  }, [form, values]);

  useEffect(() => {
    if (!isEdit) return;
    if (!editData) return;
    const nameArr = editData.full_name.split('-');

    const numberName = Number(nameArr[nameArr?.length - 1]);

    form.setFieldsValue({
      robot_type: editData?.robot_type,
      full_name: numberName,
      serialNum: editData?.serialNum
    });
  }, [isEdit]);

  return (
    <>
      {contextHolder}
      <Form form={form} onFinish={onFinish}>
        <Form.Item
          name="robot_type"
          label={t('setting_amr.register_amr.type')}
          rules={[{ required: true }]}
        >
          <Select options={robotTypeOptions} />
        </Form.Item>

        <Form.Item
          name="full_name"
          label={t('setting_amr.register_amr.amr_name')}
          rules={[{ required: true }]}
        >
          <InputNumber placeholder="002" max={999} min={1} />
        </Form.Item>

        <Form.Item
          name="serialNum"
          label={t('setting_amr.register_amr.serial_number')}
          rules={[
            { required: true, message: t('utils.required') },
            { validator: validateSerialNum }
          ]}
        >
          <Input placeholder="58:11:22:3f:f3:b7" />
        </Form.Item>

        <Form.Item>
          <Flex gap="middle">
            {isEdit ? (
              <Button onClick={handleCancel} type="default">
                {t('utils.cancel')}
              </Button>
            ) : (
              []
            )}

            <Button disabled={!submittable} type="primary" htmlType="submit">
              {isEdit ? t('utils.edit') : t('utils.submit')}
            </Button>
          </Flex>
        </Form.Item>
      </Form>
    </>
  );
};

export default RegisterForm;
