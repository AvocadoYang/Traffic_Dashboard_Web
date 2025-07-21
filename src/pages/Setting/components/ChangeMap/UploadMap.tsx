import { InboxOutlined } from '@ant-design/icons';
import client from '@/api/axiosClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Form, InputNumber, message, UploadProps } from 'antd';
import Dragger from 'antd/es/upload/Dragger';
import { FC, memo, useState } from 'react';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';
import { useTranslation } from 'react-i18next';

const UploadMap: FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [file, setFile] = useState<File | null>(null);
  const [messageApi, contextHolders] = message.useMessage();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => {
      return client.post('api/setting/map-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    },
    onSuccess: async () => {
      message.success(t('upload.success'));
      await queryClient.refetchQueries({ queryKey: ['all-map-Info'] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (!file) {
        message.error(t('upload.no_file'));
        return;
      }

      const formData = new FormData();
      formData.append('filePath', file);
      formData.append('mapOriginX', values.mapOriginX);
      formData.append('mapOriginY', values.mapOriginY);

      uploadMutation.mutate(formData);
    } catch (err) {
      console.error('Validation Error:', err);
      message.error(t('upload.validation_error'));
    }
  };

  const uploadProps: UploadProps = {
    accept: 'image/*',
    multiple: false,
    fileList: file ? [file as any] : [],
    beforeUpload: (newFile) => {
      const isPNG = newFile.type === 'image/png';
      const validName = /^[a-zA-Z0-9-_]+\.(png)$/i.test(newFile.name);

      if (!validName) {
        message.error(t('upload.invalid_filename'));
        return false;
      }

      if (!isPNG) {
        message.error(t('upload.invalid_file_type', { name: newFile.name }));
        return false;
      }

      if (file) {
        message.warning(t('upload.only_one_file'));
        return false;
      }

      setFile(newFile);
      return false;
    },
    onRemove: () => {
      setFile(null);
    }
  };

  return (
    <>
      {contextHolders}
      <Form form={form} layout="vertical">
        <Form.Item
          name="mapOriginX"
          label={t('upload.map_origin_x')}
          rules={[{ required: true, message: t('upload.enter_map_origin_x') }]}
        >
          <InputNumber style={{ width: '100%' }} placeholder={t('upload.enter_map_origin_x')} />
        </Form.Item>
        <Form.Item
          name="mapOriginY"
          label={t('upload.map_origin_y')}
          rules={[{ required: true, message: t('upload.enter_map_origin_y') }]}
        >
          <InputNumber style={{ width: '100%' }} placeholder={t('upload.enter_map_origin_y')} />
        </Form.Item>
        <Form.Item label={t('upload.upload_label')}>
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">{t('upload.drag_text')}</p>
            <p className="ant-upload-hint">{t('upload.hint')}</p>
          </Dragger>
        </Form.Item>
      </Form>
      <Button key="upload" type="primary" onClick={handleOk} loading={uploadMutation.isLoading}>
        {t('upload.button')}
      </Button>
    </>
  );
};

export default memo(UploadMap);
