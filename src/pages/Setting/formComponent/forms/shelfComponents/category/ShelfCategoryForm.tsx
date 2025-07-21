import {
  Col,
  Form,
  FormInstance,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Row,
  Select
} from 'antd';
import { Dispatch, FC, SetStateAction, useEffect, useState } from 'react';
import styled from 'styled-components';
import { CheckCircleOutlined, DeleteTwoTone, FormOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import useShelfCategory from '@/api/useShelfCategory';
import client from '@/api/axiosClient';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';
import SubmitButton from '@/utils/SubmitButton';

const { Search } = Input;

const ListWrapper = styled.div`
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  gap: 0.5em;
`;

const Item = styled.div`
  display: flex;
  width: 15em;
  height: 2em;
  text-align: center;
  box-shadow: 5px 1px 10px 2px #0000000f;
  justify-content: center;
  align-items: center;
  font-weight: 700;
  font-size: 1.3em;
  color: gray;
  padding-right: 1em;
`;

const WordTitle = styled.span`
  margin: 0;
  width: 100%;
`;

const Word = styled.div`
  width: 100%;
`;

type EditType = {
  newHeight: number;
  index: number;
  shelfId: string;
};

const ShelfCategoryForm: FC<{
  selectId: string;
  form: FormInstance<unknown>;
  cateHeight: number[] | undefined;
  setCateHeight: Dispatch<SetStateAction<number[] | undefined>>;
  setHasDelete: Dispatch<SetStateAction<boolean>>;
  editHandler: () => void;
  openModel: boolean;
  setOpenModel: Dispatch<SetStateAction<boolean>>;
}> = ({
  selectId,
  form,
  cateHeight,
  setCateHeight,
  setHasDelete,
  editHandler,
  openModel,
  setOpenModel
}) => {
  const { data, refetch } = useShelfCategory();
  const [messageApi, contextHolders] = message.useMessage();
  const targetCategory = data?.find((v) => v.id === selectId);
  const { t } = useTranslation();

  const options = [
    { value: 'type_1', label: t('edit_shelf_category.type_1') },
    { value: 'type_2', label: t('edit_shelf_category.type_2') }
  ];

  const editMutation = useMutation({
    mutationFn: (payload: EditType) => {
      return client.post('api/setting/edit-shelf-height', payload);
    },
    onSuccess() {
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const onAdd = (value: string) => {
    const numberRegex = /^[0-9]+$/;

    // Check if the value contains only numbers
    if (!numberRegex.test(value)) {
      messageApi.warning(t('edit_shelf_category.add_number_warning'));
      return;
    }

    const convertValue = Number(value);
    if (!cateHeight) {
      setCateHeight([convertValue]);
      return;
    }
    if (!cateHeight.includes(convertValue)) {
      // Value is not a duplicate, add it to the array
      setCateHeight([...cateHeight, convertValue].sort((a, b) => a - b));
      setHasDelete(true);
    } else {
      messageApi.error(t('utils.error'));
    }
  };

  const onEdit = (newHeight: number, index: number) => {
    editMutation.mutate({
      newHeight,
      index,
      shelfId: selectId
    });
  };

  const onDelete = (id: number) => {
    if (!cateHeight) return;
    setCateHeight(cateHeight.filter((o) => o !== id));
    setHasDelete(true);
  };
  const onGenderChange = (value: string) => {
    switch (value) {
      case 'type_1':
        form.setFieldValue('shelf_style', 'type_1');
        break;

      case 'type_2':
        form.setFieldValue('shelf_style', 'type_2');
        break;

      default:
        break;
    }
  };
  useEffect(() => {
    if (!targetCategory) return;
    form.setFieldValue('name', targetCategory.name);
    form.setFieldValue('height', cateHeight);
    form.setFieldValue('shelfStyle', targetCategory.shelf_style);
    const heightOnly = targetCategory.Height?.map((v) => v?.height || 0);
    setCateHeight(heightOnly);
  }, [targetCategory]);

  return (
    <>
      {contextHolders}
      <Modal
        title={t('edit_shelf_category.edit_shelf_category')}
        open={openModel}
        onCancel={() => setOpenModel(false)}
        footer={() => (
          <>
            <SubmitButton form={form} onOk={editHandler} isModel />
          </>
        )}
      >
        <Row gutter={[24, 12]}>
          <Col span={24}>
            <Form form={form} labelCol={{ span: 6 }} autoComplete="off">
              <Form.Item
                label={t('edit_shelf_category.name')}
                name="name"
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
                label={t('edit_shelf_category.style')}
                name="shelfStyle"
                hasFeedback
                rules={[
                  {
                    required: true,
                    message: t('utils.required')
                  }
                ]}
              >
                <Select onChange={onGenderChange} allowClear options={options} />
              </Form.Item>

              <Form.Item label={t('edit_shelf_category.every_level')}>
                <Search
                  placeholder="0"
                  allowClear
                  enterButton={t('utils.add')}
                  size="large"
                  onSearch={onAdd}
                />
              </Form.Item>
            </Form>
          </Col>

          <Col span={24}>
            <ListWrapper>
              {cateHeight?.map((v, i) => {
                return (
                  <LevelStrip key={`level-${i}`} v={v} i={i} onDelete={onDelete} onEdit={onEdit} />
                );
              })}
            </ListWrapper>
          </Col>
        </Row>
      </Modal>
    </>
  );
};

const LevelStrip: FC<{
  v: number;
  i: number;
  onDelete: (id: number) => void;
  onEdit: (newHeight: number, index: number) => void;
}> = ({ v, i, onDelete, onEdit }) => {
  const [isEdit, setIsEdit] = useState(false);
  const [editValue, setEditValue] = useState(0);
  const { t } = useTranslation();

  const handleShowEdit = () => {
    setIsEdit(true);
  };

  const handleSaveEdit = () => {
    setIsEdit(false);
    onEdit(editValue, i);
  };

  return (
    <Item key={i}>
      <WordTitle>
        {t('edit_shelf_category.f1')}
        {i + 1}
        {t('edit_shelf_category.f2')}
      </WordTitle>

      {isEdit ? (
        <WordTitle>
          <InputNumber
            min={1}
            onChange={(e) => setEditValue(e as number)}
            placeholder={v.toString()}
          />
        </WordTitle>
      ) : (
        []
      )}

      {isEdit ? (
        []
      ) : (
        <Word>
          {v}
          mm
        </Word>
      )}

      {isEdit ? <CheckCircleOutlined onClick={() => handleSaveEdit()} /> : []}

      {isEdit ? [] : <FormOutlined onClick={() => handleShowEdit()} />}

      <Popconfirm
        title={t('edit_shelf_category.delete_warning')}
        onConfirm={() => onDelete(Number(v))}
      >
        <DeleteTwoTone twoToneColor="#a61d24" />
      </Popconfirm>
    </Item>
  );
};

export default ShelfCategoryForm;
