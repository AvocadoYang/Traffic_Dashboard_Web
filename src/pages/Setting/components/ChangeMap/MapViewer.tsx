import {
  Button,
  Carousel,
  Flex,
  Form,
  FormInstance,
  Input,
  InputNumber,
  message,
  Radio
} from 'antd';
import { Dispatch, FC, memo, SetStateAction, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useAllMapInfo from '@/api/useAllMapInfo';
import {
  FormButtonGroup,
  ImageContainer,
  ImageText,
  ShowImageContainer,
  ShowImageText,
  StyledButton,
  StyledForm,
  Map_Info
} from './style';
import './style.css';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/api/axiosClient';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';

const MapViewer: FC = () => {
  const { data, refetch } = useAllMapInfo();
  const [messageApi, contextHolders] = message.useMessage();
  const [isEdit, setIsEdit] = useState(false);
  const [form] = Form.useForm();
  const [selectId, setSelectId] = useState<string | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return client.delete('api/setting/map-delete', {
        data: { id }
      });
    },
    onSuccess: () => {
      void messageApi.success('success');
      refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });
  const queryClient = useQueryClient();

  const editMutation = useMutation({
    mutationFn: (payload: FormData) => {
      return client.patch('api/setting/map-update', payload);
    },
    onSuccess: () => {
      void messageApi.success('success');
      setIsEdit(false);
      queryClient.refetchQueries({ queryKey: ['map'] });
      refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const handleEdit = async () => {
    const payload = {
      ...form.getFieldsValue(),
      id: selectId
    };

    editMutation.mutate(payload);
  };

  const handleDelete = (id: string) => {
    console.log('work', id);
    deleteMutation.mutate(id);
  };

  useEffect(() => {
    if (!data || !selectId) return;

    const target = data.find((v) => v.id === selectId);

    if (!target) return;

    form.setFieldValue('fileName', target.fileName.split('.')[0]);
    form.setFieldValue('isUsing', target.isUsing);
    form.setFieldValue('mapOriginX', target.mapOriginX);
    form.setFieldValue('mapOriginY', target.mapOriginY);
  }, [form, selectId, data]);
  if (!data || data.length === 0) return <NoImageFound />;
  return (
    <>
      {contextHolders}
      <Carousel arrows draggable infinite={false} className="carousel">
        {data.map((v) => {
          return (
            <ShowImageContainer
              url={`https://${location.host.split(':')[0]}:4000/static/images/${v.fileName}`}
              key={v.fileName}
            >
              <ShowImageText is_edit={isEdit.toString()}>
                <Flex gap="middle" align="center" justify="space-evenly">
                  {isEdit ? (
                    <EditOrigin
                      key={v.id}
                      form={form}
                      setIsEdit={setIsEdit}
                      handleEdit={handleEdit}
                    />
                  ) : (
                    <ShowInfo
                      key={v.id}
                      setIsEdit={setIsEdit}
                      handleDelete={handleDelete}
                      setSelectId={setSelectId}
                      info={v}
                    />
                  )}
                </Flex>
              </ShowImageText>
            </ShowImageContainer>
          );
        })}
      </Carousel>
    </>
  );
};

const ShowInfo: FC<{
  setIsEdit: Dispatch<SetStateAction<boolean>>;
  handleDelete: (id: string) => void;
  info: Map_Info;
  setSelectId: Dispatch<SetStateAction<string | null>>;
}> = ({ setIsEdit, setSelectId, handleDelete, info }) => {
  const { t } = useTranslation();

  const handleClick = (id: string) => {
    setSelectId(id);
    setIsEdit(true);
  };

  return (
    <Flex
      vertical
      justify="center"
      align="center"
      gap="16px"
      style={{
        padding: '20px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)'
      }}
    >
      <Flex vertical align="flex-start" gap="12px" style={{ width: '100%', maxWidth: '400px' }}>
        <Flex gap="small" justify="space-between" style={{ width: '100%' }}>
          <span>{t('upload.filename')}:</span>
          <span>{info.fileName}</span>
        </Flex>
        <Flex gap="small" justify="space-between" style={{ width: '100%' }}>
          <span>{t('upload.status')}:</span>
          <span>{info.isUsing ? t('upload.using') : t('upload.not_using')}</span>
        </Flex>
        <Flex gap="small" justify="space-between" style={{ width: '100%' }}>
          <span>{t('upload.map_origin_x')}:</span>
          <span>{info.mapOriginX}</span>
        </Flex>
        <Flex gap="small" justify="space-between" style={{ width: '100%' }}>
          <span>{t('upload.map_origin_y')}:</span>
          <span>{info.mapOriginY}</span>
        </Flex>
      </Flex>

      <Flex gap="12px">
        <Button
          style={{
            backgroundColor: 'rgba(109, 108, 108, 0.1)',
            color: '#7b7b7b',
            width: '100px'
          }}
          onClick={() => handleClick(info.id)}
        >
          {t('utils.edit')}
        </Button>

        <Button
          type="primary"
          danger
          onClick={() => handleDelete(info.id)}
          style={{
            backgroundColor: 'rgba(255, 0, 0, 0.8)',
            border: 'none',
            width: '100px'
          }}
        >
          {t('utils.delete')}
        </Button>
      </Flex>
    </Flex>
  );
};

const EditOrigin: FC<{
  setIsEdit: Dispatch<SetStateAction<boolean>>;
  form: FormInstance<unknown>;
  handleEdit: () => void;
}> = ({ setIsEdit, form, handleEdit }) => {
  const { t } = useTranslation();

  const handleCancel = () => {
    setIsEdit(false);
  };

  return (
    <>
      <StyledForm form={form} layout="inline">
        <Form.Item
          label={t('upload.filename')}
          name="fileName"
          rules={[
            {
              required: true,
              message: 'Please input a value!'
            }
          ]}
        >
          <Input disabled style={{ width: '100px' }} />
        </Form.Item>

        <Form.Item label={t('upload.status')} name="isUsing">
          <Radio.Group>
            <Radio value={false}>{t('utils.no')}</Radio>
            <Radio value>{t('utils.yes')}</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label={t('upload.map_origin_x')}
          name="mapOriginX"
          rules={[
            {
              required: true,
              message: 'Please input a value!'
            }
          ]}
        >
          <InputNumber style={{ width: '100px' }} />
        </Form.Item>
        <Form.Item
          label={t('upload.map_origin_y')}
          name="mapOriginY"
          rules={[
            {
              required: true,
              message: 'Please input a value!'
            }
          ]}
        >
          <InputNumber style={{ width: '100px' }} />
        </Form.Item>
        <FormButtonGroup>
          <StyledButton
            onClick={handleCancel}
            style={{ backgroundColor: '#ffadad', color: 'white' }}
          >
            {t('utils.cancel')}
          </StyledButton>
          <StyledButton onClick={handleEdit} type="primary">
            {t('utils.submit')}
          </StyledButton>
        </FormButtonGroup>
      </StyledForm>
    </>
  );
};

const NoImageFound = () => {
  const { t } = useTranslation();
  return (
    <>
      <ImageContainer url="/Ideas_Surprised_Pikachu_HD.png"></ImageContainer>
      <ImageText>{t('change_map.no_img_found')}</ImageText>
    </>
  );
};

export default memo(MapViewer);
