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
  Select,
} from "antd";
import { Dispatch, FC, SetStateAction, useEffect, useState } from "react";
import styled from "styled-components";
import {
  CheckCircleOutlined,
  DeleteTwoTone,
  FormOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import useShelfCategory from "@/api/useShelfCategory";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import SubmitButton from "@/utils/SubmitButton";

const { Search } = Input;

const IndustrialModal = styled(Modal)`
  .ant-modal-content {
    background: #f5f5f5;
    font-family: "Roboto Mono", monospace;
  }

  .ant-modal-header {
    background: #ffffff;
    border-bottom: 2px solid #1890ff;
    padding: 16px 24px;
  }

  .ant-modal-title {
    color: #1890ff;
    font-family: "Roboto Mono", monospace;
    font-weight: 600;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .ant-modal-body {
    padding: 24px;
    background: #f5f5f5;
  }

  .ant-form-item-label > label {
    font-family: "Roboto Mono", monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #595959;
    font-weight: 600;
  }

  .ant-input,
  .ant-select-selector,
  .ant-input-number {
    font-family: "Roboto Mono", monospace;
    border: 1px solid #d9d9d9;

    &:hover {
      border-color: #1890ff;
    }

    &:focus {
      border-color: #1890ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
    }
  }
`;

const ListWrapper = styled.div`
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-radius: 0;
`;

const Item = styled.div`
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  gap: 12px;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-left: 3px solid #1890ff;
  padding: 8px 16px;
  font-family: "Roboto Mono", monospace;
  transition: all 0.2s ease;

  &:hover {
    background: #fafafa;
    border-left-color: #fa8c16;
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
`;

const WordTitle = styled.span`
  flex: 1;
  font-weight: 600;
  font-size: 11px;
  color: #262626;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const Word = styled.div`
  min-width: 80px;
  text-align: right;
  font-weight: 600;
  font-size: 13px;
  color: #1890ff;
`;

const IconButton = styled.span`
  cursor: pointer;
  color: #8c8c8c;
  transition: color 0.2s;
  font-size: 16px;

  &:hover {
    color: #1890ff;
  }

  &.delete {
    color: #ff4d4f;

    &:hover {
      color: #ff7875;
    }
  }
`;

const SectionHeader = styled.div`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-left: 3px solid #fa8c16;
  padding: 10px 16px;
  margin-bottom: 16px;
  font-family: "Roboto Mono", monospace;
  color: #fa8c16;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
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
  setOpenModel,
}) => {
  const { data, refetch } = useShelfCategory();
  const [messageApi, contextHolders] = message.useMessage();
  const targetCategory = data?.find((v) => v.id === selectId);
  const { t } = useTranslation();

  const options = [
    { value: "type_1", label: t("edit_shelf_category.type_1") },
    { value: "type_2", label: t("edit_shelf_category.type_2") },
  ];

  const editMutation = useMutation({
    mutationFn: (payload: EditType) => {
      return client.post("api/setting/edit-shelf-height", payload);
    },
    onSuccess() {
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const onAdd = (value: string) => {
    const numberRegex = /^[0-9]+$/;

    if (!numberRegex.test(value)) {
      messageApi.warning(t("edit_shelf_category.add_number_warning"));
      return;
    }

    const convertValue = Number(value);
    if (!cateHeight) {
      setCateHeight([convertValue]);
      return;
    }
    if (!cateHeight.includes(convertValue)) {
      setCateHeight([...cateHeight, convertValue].sort((a, b) => a - b));
      setHasDelete(true);
    } else {
      messageApi.error(t("utils.error"));
    }
  };

  const onEdit = (newHeight: number, index: number) => {
    editMutation.mutate({
      newHeight,
      index,
      shelfId: selectId,
    });
  };

  const onDelete = (id: number) => {
    if (!cateHeight) return;
    setCateHeight(cateHeight.filter((o) => o !== id));
    setHasDelete(true);
  };

  const onGenderChange = (value: string) => {
    switch (value) {
      case "type_1":
        form.setFieldValue("shelf_style", "type_1");
        break;

      case "type_2":
        form.setFieldValue("shelf_style", "type_2");
        break;

      default:
        break;
    }
  };

  useEffect(() => {
    if (!targetCategory) return;
    form.setFieldValue("name", targetCategory.name);
    form.setFieldValue("height", cateHeight);
    form.setFieldValue("shelfStyle", targetCategory.shelf_style);
    const heightOnly = targetCategory.Height?.map((v) => v?.height || 0);
    setCateHeight(heightOnly);
  }, [targetCategory]);

  return (
    <>
      {contextHolders}
      <IndustrialModal
        title={
          <>
            <ToolOutlined /> {t("edit_shelf_category.edit_shelf_category")}
          </>
        }
        open={openModel}
        onCancel={() => setOpenModel(false)}
        footer={() => (
          <>
            <SubmitButton form={form} onOk={editHandler} isModel />
          </>
        )}
        width={600}
      >
        <Row gutter={[24, 12]}>
          <Col span={24}>
            <Form form={form} labelCol={{ span: 6 }} autoComplete="off">
              <Form.Item
                label={t("edit_shelf_category.name")}
                name="name"
                hasFeedback
                rules={[
                  {
                    required: true,
                    message: t("utils.required"),
                  },
                ]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label={t("edit_shelf_category.style")}
                name="shelfStyle"
                hasFeedback
                rules={[
                  {
                    required: true,
                    message: t("utils.required"),
                  },
                ]}
              >
                <Select
                  onChange={onGenderChange}
                  allowClear
                  options={options}
                />
              </Form.Item>

              <Form.Item label={t("edit_shelf_category.every_level")}>
                <Search
                  placeholder="0"
                  allowClear
                  enterButton={t("utils.add")}
                  size="large"
                  onSearch={onAdd}
                />
              </Form.Item>
            </Form>
          </Col>

          <Col span={24}>
            <SectionHeader>
              <ToolOutlined />
              {t("edit_shelf_category.every_level")}
            </SectionHeader>
            <ListWrapper>
              {cateHeight && cateHeight.length > 0 ? (
                cateHeight.map((v, i) => (
                  <LevelStrip
                    key={`level-${i}`}
                    v={v}
                    i={i}
                    onDelete={onDelete}
                    onEdit={onEdit}
                  />
                ))
              ) : (
                <div
                  style={{
                    padding: "20px",
                    color: "#8c8c8c",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                  }}
                >
                  [ {t("utils.no")} ]
                </div>
              )}
            </ListWrapper>
          </Col>
        </Row>
      </IndustrialModal>
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
    <Item>
      <WordTitle>
        {t("edit_shelf_category.f1")}
        {i + 1}
        {t("edit_shelf_category.f2")}
      </WordTitle>

      {isEdit ? (
        <InputNumber
          min={1}
          onChange={(e) => setEditValue(e as number)}
          placeholder={v.toString()}
          style={{ width: 100 }}
        />
      ) : (
        <Word>
          {v}
          mm
        </Word>
      )}

      {isEdit && (
        <IconButton onClick={() => handleSaveEdit()}>
          <CheckCircleOutlined />
        </IconButton>
      )}

      {!isEdit && (
        <IconButton onClick={() => handleShowEdit()}>
          <FormOutlined />
        </IconButton>
      )}

      <Popconfirm
        title={t("edit_shelf_category.delete_warning")}
        onConfirm={() => onDelete(Number(v))}
      >
        <IconButton className="delete">
          <DeleteTwoTone twoToneColor="#ff4d4f" />
        </IconButton>
      </Popconfirm>
    </Item>
  );
};

export default ShelfCategoryForm;
