import FormHr from "@/pages/Setting/utils/FormHr";
import client from "@/api/axiosClient";
import { Err } from "@/utils/responseErr";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Flex,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Table,
  TableProps,
} from "antd";
import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import useAMRsample from "@/api/useAMRsample";
import {
  EditOutlined,
  DeleteTwoTone,
  PlusOutlined,
  SaveOutlined,
} from "@ant-design/icons";

// Industrial Styled Components
const IndustrialContainer = styled.div`
  font-family: "Roboto Mono", monospace;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const PanelHeader = styled.h3`
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-left: 4px solid #1890ff;
  padding: 12px 16px;
  margin: 0 0 20px 0;
  font-family: "Roboto Mono", monospace;
  color: #262626;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 14px;
  cursor: move;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;

  &:hover {
    background: #f0f5ff;
    border-left-color: #40a9ff;
  }
`;

const FormSection = styled.div`
  background: #fafafa;
  border: 1px solid #d9d9d9;
  padding: 20px;
  border-radius: 4px;
  margin-bottom: 20px;
`;

const IndustrialTableContainer = styled.div`
  .ant-table {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .ant-table-thead > tr > th {
    background: #fafafa;
    color: #262626;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 1px;
    border-bottom: 2px solid #d9d9d9;
    font-family: "Roboto Mono", monospace;
  }

  .ant-table-tbody > tr {
    background: #ffffff;
    transition: all 0.2s ease;
    font-family: "Roboto Mono", monospace;

    &:hover {
      background: #f0f5ff !important;
      box-shadow: 0 2px 4px rgba(24, 144, 255, 0.1);
    }
  }

  .ant-table-tbody > tr > td {
    border-bottom: 1px solid #f0f0f0;
    font-size: 12px;
    color: #595959;
  }
`;

const StyledForm = styled(Form)`
  .ant-form-item-label > label {
    color: #595959;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: "Roboto Mono", monospace;
    font-weight: 600;
  }

  .ant-input,
  .ant-input-number-input {
    font-family: "Roboto Mono", monospace;
    font-size: 12px;
    border-radius: 4px;

    &:hover {
      border-color: #40a9ff;
    }

    &:focus {
      border-color: #1890ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
    }
  }

  .ant-input-number {
    width: 100%;
    border-radius: 4px;

    &:hover {
      border-color: #40a9ff;
    }

    &:focus-within {
      border-color: #1890ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
    }
  }
`;

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.5px;
  height: 32px;
  font-weight: 600;
  border-radius: 4px;
  transition: all 0.2s ease;

  &.delete-btn {
    background: #fff1f0;
    border: 1px solid #ff4d4f;
    color: #ff4d4f;

    &:hover {
      background: #ff4d4f;
      border-color: #ff4d4f;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(255, 77, 79, 0.3);
    }
  }

  &.edit-btn {
    background: #e6f7ff;
    border: 1px solid #1890ff;
    color: #1890ff;

    &:hover {
      background: #1890ff;
      border-color: #1890ff;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
    }
  }

  &.save-btn {
    background: #52c41a;
    border: 1px solid #52c41a;
    color: #ffffff;

    &:hover {
      background: #73d13d;
      border-color: #73d13d;
      box-shadow: 0 2px 8px rgba(82, 196, 26, 0.4);
    }
  }

  &.add-btn {
    background: #1890ff;
    border: 1px solid #1890ff;
    color: #ffffff;

    &:hover {
      background: #40a9ff;
      border-color: #40a9ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  }
`;

const DataText = styled.p`
  margin: 0;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  font-weight: 500;
  color: #262626;
`;

const DimensionBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background: #fff7e6;
  border: 1px solid #ffa940;
  border-radius: 4px;
  color: #fa8c16;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 600;
`;

const IndustrialModal = styled(Modal)`
  .ant-modal-content {
    background: #ffffff;
    border: 2px solid #d9d9d9;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .ant-modal-header {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    border-left: 4px solid #fa8c16;
    padding: 16px 24px;
  }

  .ant-modal-title {
    color: #262626;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: "Roboto Mono", monospace;
  }

  .ant-modal-body {
    padding: 24px;
  }
`;

const WarningCard = styled(Card)`
  background: #fff7e6;
  border: 2px solid #ffa940;
  margin-bottom: 16px;

  .ant-card-head {
    background: #fffbf0;
    border-bottom: 1px solid #ffa940;
    color: #fa8c16;
    font-family: "Roboto Mono", monospace;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 1px;
    font-weight: 600;
  }
`;

type Form_Data = {
  name: string;
  value: string;
  width: number;
  length: number;
  height: number;
};

interface TableDataType {
  id: string;
  name: string;
  value: string;
  width: number;
  length: number;
  height: number;
}

const AmrConfigPanel: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [formDelete] = Form.useForm();
  const { data: robotTypes, refetch } = useAMRsample();

  const queryClient = useQueryClient();
  const [isEdit, setIsEdit] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [openDeleteWarn, setOpenDeleteWarn] = useState<
    { id: string; name: string }[]
  >([]);
  const [deleteRobotId, setDeleteRobotId] = useState<string | null>(null);

  const rOption = robotTypes
    ?.filter((a) => a.name != "人形機器人" && a.id !== deleteRobotId)
    .map((a) => {
      return { label: a.name, value: a.id };
    });

  const createMutation = useMutation({
    mutationFn: (payload: Form_Data) => {
      return client.post("api/setting/create-robot-type", payload);
    },
    onSuccess: async () => {
      messageApi.success(t("utils.success"));
      queryClient.refetchQueries({ queryKey: ["amr-sample"] });
      form.resetFields();
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    },
  });

  const editMutation = useMutation({
    mutationFn: (payload: TableDataType) => {
      return client.post("api/setting/edit-robot-type", payload);
    },
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      queryClient.refetchQueries({ queryKey: ["amr-sample"] });
      setIsEdit(false);
      form.resetFields();
    },
    onError: (error: Err) => {
      messageApi.error(error.response.data.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return client.post("api/setting/delete-robot-type", { id });
    },
    onSuccess: async (resp: {
      data: {
        hasRelativeMission: boolean;
        missions: { id: string; name: string }[];
      };
    }) => {
      if (resp.data.hasRelativeMission) {
        setOpenDeleteWarn(resp.data.missions);
        return;
      }
      await queryClient.refetchQueries({
        queryKey: ["all-mission-title-detail"],
      });
      messageApi.success(t("utils.success"));
      queryClient.refetchQueries({ queryKey: ["amr-sample"] });
      queryClient.refetchQueries({ queryKey: ["all-register-amr"] });
    },
    onError: (error: Err) => {
      messageApi.error(error.response.data.message);
    },
  });

  const continueDeleteMutation = useMutation({
    mutationFn: (payload: { id: string; replace_id: string }) => {
      return client.post("api/setting/delete-robot-type-continue", payload);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["all-mission-title-detail"],
      });
      closeDeleteModel();
      formDelete.resetFields();
      messageApi.success(t("utils.success"));
      queryClient.refetchQueries({ queryKey: ["amr-sample"] });
      queryClient.refetchQueries({ queryKey: ["all-register-amr"] });
    },
    onError: (error: Err) => {
      messageApi.error(error.response.data.message);
    },
  });

  const handleDeleteAndChangeRobotTypes = () => {
    const replace_id = formDelete.getFieldValue("change_id");

    if (!replace_id || !deleteRobotId) {
      messageApi.error("PLEASE SELECT ROBOT TYPE");
      return;
    }

    continueDeleteMutation.mutate({
      id: deleteRobotId,
      replace_id,
    });
  };

  const closeDeleteModel = () => {
    setOpenDeleteWarn([]);
    setDeleteRobotId(null);
  };

  const handleAdd = () => {
    const values = form.getFieldsValue() as Form_Data;
    createMutation.mutate(values);
  };

  const handleSave = () => {
    const values = form.getFieldsValue() as TableDataType;
    editMutation.mutate({ ...values, id: form.getFieldValue("id") });
  };

  const handleDelete = (record: TableDataType) => {
    const id = record.id;
    setDeleteRobotId(id);
    deleteMutation.mutate(id);
  };

  const handleEdit = (record: TableDataType) => {
    form.setFieldsValue(record);
    setIsEdit(true);
  };

  const handleCancel = () => {
    setIsEdit(false);
    form.resetFields();
  };

  if (!robotTypes) return null;

  const columns: TableProps<TableDataType>["columns"] = [
    {
      title: "ID",
      key: "id",
      dataIndex: "id",
      width: 0,
      hidden: true,
    },
    {
      title: t("toolbar.amr_setting.amr_name"),
      key: "name",
      dataIndex: "name",
      width: "20%",
      render: (_v: unknown, record: TableDataType) => {
        return <DataText>{record.name}</DataText>;
      },
    },
    {
      title: t("toolbar.amr_setting.serial_name"),
      key: "value",
      dataIndex: "value",
      width: "20%",
      render: (_v: unknown, record: TableDataType) => {
        return <DataText>{record.value}</DataText>;
      },
    },
    {
      title: t("toolbar.amr_setting.length"),
      key: "length",
      dataIndex: "length",
      width: "12%",
      render: (_v: unknown, record: TableDataType) => {
        return <DimensionBadge>{record.length} M</DimensionBadge>;
      },
    },
    {
      title: t("toolbar.amr_setting.width"),
      key: "width",
      dataIndex: "width",
      width: "12%",
      render: (_v: unknown, record: TableDataType) => {
        return <DimensionBadge>{record.width} M</DimensionBadge>;
      },
    },
    {
      title: t("toolbar.amr_setting.height"),
      key: "height",
      dataIndex: "height",
      width: "12%",
      render: (_v: unknown, record: TableDataType) => {
        return <DimensionBadge>{record.height} M</DimensionBadge>;
      },
    },
    {
      title: "ACTIONS",
      dataIndex: "option",
      key: "option",
      width: "24%",
      render: (_v: unknown, record: TableDataType) => {
        return (
          <Flex gap="small">
            <IndustrialButton
              className="edit-btn"
              onClick={() => handleEdit(record)}
              icon={<EditOutlined />}
              size="small"
            >
              {t("utils.edit")}
            </IndustrialButton>

            <Popconfirm
              title={t("utils.delete_warn") || "Sure to delete?"}
              onConfirm={() => handleDelete(record)}
            >
              <IndustrialButton
                className="delete-btn"
                icon={<DeleteTwoTone twoToneColor="#ff4d4f" />}
                size="small"
              >
                {t("utils.delete")}
              </IndustrialButton>
            </Popconfirm>
          </Flex>
        );
      },
    },
  ];

  return (
    <IndustrialContainer>
      {contextHolder}
      <PanelHeader {...listeners} {...attributes}>
        {t("toolbar.amr_setting.amr_config")}
      </PanelHeader>
      <FormHr />

      <Flex gap="middle" justify="flex-start" align="start" vertical>
        <FormSection>
          <StyledForm form={form} layout="vertical">
            <Form.Item
              name="name"
              label={t("toolbar.amr_setting.amr_name")}
              rules={[{ required: true, message: "REQUIRED FIELD" }]}
            >
              <Input placeholder="平衡式" />
            </Form.Item>

            <Form.Item
              name="value"
              label={t("toolbar.amr_setting.serial_name")}
              rules={[{ required: true, message: "REQUIRED FIELD" }]}
            >
              <Input placeholder="anfa-ps14-16" />
            </Form.Item>

            <Flex gap="middle">
              <Form.Item
                name="width"
                label={t("toolbar.amr_setting.width")}
                rules={[{ required: true, message: "REQUIRED" }]}
                style={{ flex: 1 }}
              >
                <InputNumber
                  placeholder="1"
                  max={999}
                  min={0.1}
                  step={0.1}
                  addonAfter="M"
                />
              </Form.Item>

              <Form.Item
                name="length"
                label={t("toolbar.amr_setting.length")}
                rules={[{ required: true, message: "REQUIRED" }]}
                style={{ flex: 1 }}
              >
                <InputNumber
                  placeholder="1"
                  max={999}
                  min={0.1}
                  step={0.1}
                  addonAfter="M"
                />
              </Form.Item>

              <Form.Item
                name="height"
                label={t("toolbar.amr_setting.height")}
                rules={[{ required: true, message: "REQUIRED" }]}
                style={{ flex: 1 }}
              >
                <InputNumber
                  placeholder="1"
                  max={999}
                  min={0.1}
                  step={0.1}
                  addonAfter="M"
                />
              </Form.Item>
            </Flex>

            <Flex gap="middle">
              {isEdit ? (
                <>
                  <IndustrialButton
                    className="save-btn"
                    onClick={handleSave}
                    icon={<SaveOutlined />}
                    loading={editMutation.isLoading}
                  >
                    {t("utils.save")}
                  </IndustrialButton>
                  <IndustrialButton onClick={handleCancel}>
                    {t("utils.cancel")}
                  </IndustrialButton>
                </>
              ) : (
                <IndustrialButton
                  className="add-btn"
                  onClick={handleAdd}
                  icon={<PlusOutlined />}
                  loading={createMutation.isLoading}
                >
                  {t("utils.add")}
                </IndustrialButton>
              )}
            </Flex>
          </StyledForm>
        </FormSection>

        <IndustrialTableContainer>
          <Table<TableDataType>
            rowKey={(record) => record.id}
            columns={columns.filter((col) => !col.hidden)}
            dataSource={robotTypes}
            bordered
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `TOTAL: ${total} ROBOTS`,
            }}
          />
        </IndustrialTableContainer>
      </Flex>

      <IndustrialModal
        onCancel={closeDeleteModel}
        open={openDeleteWarn.length > 0}
        title="REPLACE ROBOT TYPE REQUIRED"
        onOk={handleDeleteAndChangeRobotTypes}
        okText="CONFIRM"
        cancelText="CANCEL"
      >
        <WarningCard title="⚠️ WARNING: RELATED MISSIONS FOUND">
          <p
            style={{
              fontFamily: "Roboto Mono",
              fontSize: 12,
              marginBottom: 16,
            }}
          >
            This robot type is used in the following missions:
          </p>
          <ul
            style={{
              fontFamily: "Roboto Mono",
              fontSize: 11,
              color: "#595959",
            }}
          >
            {openDeleteWarn.map((mission, idx) => (
              <li key={idx}>
                {typeof mission === "string"
                  ? mission
                  : mission?.name || JSON.stringify(mission)}
              </li>
            ))}
          </ul>
        </WarningCard>

        <StyledForm form={formDelete} layout="vertical">
          <Form.Item
            name="change_id"
            label="SELECT REPLACEMENT ROBOT TYPE"
            rules={[{ required: true, message: "REQUIRED FIELD" }]}
          >
            <Select
              style={{ width: "100%" }}
              size="large"
              options={rOption}
              placeholder="SELECT ROBOT TYPE"
            />
          </Form.Item>
        </StyledForm>
      </IndustrialModal>
    </IndustrialContainer>
  );
};

export default AmrConfigPanel;
