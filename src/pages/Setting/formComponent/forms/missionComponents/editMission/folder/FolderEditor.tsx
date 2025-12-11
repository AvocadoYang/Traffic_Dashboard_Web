import React, { Dispatch, FC, SetStateAction, useState } from "react";
import type { TableProps } from "antd";
import {
  Button,
  Flex,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Table,
  Typography,
  Space,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  PlusOutlined,
  FolderOutlined,
} from "@ant-design/icons";
import useMissionFolder from "@/api/useMissionFolder";
import client from "@/api/axiosClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

// Industrial Styled Components
const StyledForm = styled(Form)`
  .ant-form-item-label > label {
    color: #595959;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: "Roboto Mono", monospace;
    font-weight: 600;
  }
`;

const IndustrialInput = styled(Input)`
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  height: 36px;
  border-radius: 0;
  border: 1px solid #d9d9d9;

  &:hover {
    border-color: #40a9ff;
  }

  &:focus {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }

  &::placeholder {
    color: #bfbfbf;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
  }
`;

const IndustrialModal = styled(Modal)`
  .ant-modal-content {
    background: #ffffff;
    border: 2px solid #d9d9d9;
    border-radius: 0;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .ant-modal-header {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    border-left: 4px solid #52c41a;
    padding: 16px 24px;
    border-radius: 0;
  }

  .ant-modal-title {
    color: #52c41a;
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-family: "Roboto Mono", monospace;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ant-modal-body {
    padding: 24px;
    background: #ffffff;
  }

  .ant-modal-footer {
    display: none;
  }
`;

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;
  font-weight: 600;
  border-radius: 0;
  transition: all 0.2s ease;

  &.ant-btn-primary {
    background: #52c41a;
    border-color: #52c41a;

    &:hover {
      background: #73d13d;
      border-color: #73d13d;
      box-shadow: 0 2px 8px rgba(82, 196, 26, 0.4);
    }
  }

  &.edit-btn {
    background: #ffffff;
    border: 1px solid #1890ff;
    color: #1890ff;

    &:hover {
      background: #f0f5ff;
      border-color: #40a9ff;
      color: #40a9ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
    }
  }

  &.delete-btn {
    background: #ffffff;
    border: 1px solid #ff4d4f;
    color: #ff4d4f;

    &:hover {
      background: #fff1f0;
      border-color: #ff7875;
      color: #ff7875;
      box-shadow: 0 2px 8px rgba(255, 77, 79, 0.2);
    }
  }

  &.cancel-btn {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    color: #595959;

    &:hover {
      background: #fafafa;
      border-color: #bfbfbf;
      color: #262626;
    }
  }
`;

const IndustrialTable = styled(Table)`
  .ant-table {
    border: 1px solid #d9d9d9;
    border-radius: 0;
    font-family: "Roboto Mono", monospace;
  }

  .ant-table-thead > tr > th {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    color: #595959;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
    padding: 12px 16px;
    border-radius: 0;

    &::before {
      display: none;
    }
  }

  .ant-table-tbody > tr {
    transition: all 0.2s;
    position: relative;

    &:hover {
      background: #f6ffed;

      &::before {
        width: 4px;
      }

      td {
        background: transparent;
      }
    }

    &.editable-row-editing {
      background: #e6f7ff;

      &::before {
        width: 4px;
        background: #1890ff;
      }

      td {
        background: transparent;
      }
    }
  }

  .ant-table-tbody > tr > td {
    border-bottom: 1px solid #f0f0f0;
    padding: 12px 16px;
    font-size: 12px;
    color: #262626;
  }

  .ant-table-pagination {
    margin: 16px 0 0 0;
  }
`;

const SectionDivider = styled.div`
  height: 2px;
  background: repeating-linear-gradient(
    90deg,
    #d9d9d9 0,
    #d9d9d9 10px,
    transparent 10px,
    transparent 20px
  );
  margin: 24px 0;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    background: #52c41a;
    border: 2px solid #ffffff;
    box-shadow: 0 0 0 2px #d9d9d9;
  }
`;

const SectionHeader = styled.div`
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-left: 3px solid #52c41a;
  padding: 10px 16px;
  margin-bottom: 16px;
  font-family: "Roboto Mono", monospace;
  color: #52c41a;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
`;

const FolderCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 20px;
  padding: 0 8px;
  background: #e6f7ff;
  border: 1px solid #1890ff;
  color: #1890ff;
  font-size: 10px;
  font-weight: 700;
  font-family: "Roboto Mono", monospace;
`;

type DataType = {
  name: string;
  id: string;
  missionTitles: {
    id: string;
  }[];
};

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
  editing: boolean;
  dataIndex: string;
  title: any;
  inputType: "number" | "text";
  record: DataType;
  index: number;
}

const EditableCell: React.FC<React.PropsWithChildren<EditableCellProps>> = ({
  editing,
  dataIndex,
  title,
  inputType,
  record,
  index,
  children,
  ...restProps
}) => {
  const inputNode =
    inputType === "number" ? <InputNumber /> : <IndustrialInput />;

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[
            {
              required: true,
              message: `Please Input ${title}!`,
            },
          ]}
        >
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

const FolderEditor: FC<{
  openFolderEditorModal: boolean;
  setOpenFolderEditorModal: Dispatch<SetStateAction<boolean>>;
}> = ({ openFolderEditorModal, setOpenFolderEditorModal }) => {
  const [form] = Form.useForm();
  const [folderForm] = Form.useForm();
  const [editingKey, setEditingKey] = useState("");
  const { data: folders, refetch: refetchFolders } = useMissionFolder();
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const isEditing = (record: DataType) => record.id === editingKey;

  const deleteFolderMutation = useMutation(
    (folderId: string) =>
      client.post("api/setting/delete-mission-folder", { id: folderId }),
    {
      onSuccess: async () => {
        await refetchFolders();
        await queryClient.refetchQueries({
          queryKey: ["all-mission-title-detail"],
        });
        messageApi.success(t("folder_editor.delete_success"));
      },
      onError: (error: any) => {
        messageApi.error(error?.response?.data?.message || t("utils.error"));
      },
    }
  );

  const addFolderMutation = useMutation(
    (folderData: { name: string }) =>
      client.post("api/setting/add-mission-folder", folderData),
    {
      onSuccess: async () => {
        await refetchFolders();
        messageApi.success(t("folder_editor.add_success"));
        folderForm.resetFields();
      },
      onError: (error: any) => {
        messageApi.error(error?.response?.data?.message || t("utils.error"));
      },
    }
  );

  const editFolderMutation = useMutation(
    (folderData: { id: string; name: string }) =>
      client.post("api/setting/edit-mission-folder", folderData),
    {
      onSuccess: async () => {
        await refetchFolders();
        messageApi.success(t("folder_editor.edit_success"));
        setEditingKey("");
      },
      onError: (error: any) => {
        messageApi.error(error?.response?.data?.message || t("utils.error"));
      },
    }
  );

  const handleDeleteFolder = (folderId: string) => {
    deleteFolderMutation.mutate(folderId);
  };

  const edit = (record: Partial<DataType>) => {
    form.setFieldsValue({ name: record.name || "" });
    setEditingKey(record.id as string);
  };

  const cancel = () => {
    setEditingKey("");
  };

  const handleCancel = () => {
    setOpenFolderEditorModal(false);
    setEditingKey("");
  };

  const save = async (key: React.Key) => {
    try {
      const row = (await form.validateFields()) as DataType;
      editFolderMutation.mutate({ id: key as string, name: row.name });
    } catch (errInfo) {
      console.log("Validate Failed:", errInfo);
    }
  };

  const handleFolderSubmit = () => {
    const values = folderForm.getFieldsValue();
    if (!values.name) {
      messageApi.warning("Please enter folder name");
      return;
    }
    addFolderMutation.mutate({ name: values.name });
  };

  const columns = [
    {
      title: t("folder_editor.folder_name_column"),
      dataIndex: "name",
      editable: true,
      render: (text: string, record: DataType) => (
        <Space>
          <FolderOutlined style={{ color: "#52c41a" }} />
          <span style={{ fontWeight: 600 }}>{text}</span>
        </Space>
      ),
    },
    {
      title: t("folder_editor.missions_column"),
      dataIndex: "missionTitles",
      render: (titles: any[]) => (
        <FolderCount>{titles?.length || 0}</FolderCount>
      ),
    },
    {
      title: t("folder_editor.operations_column"),
      dataIndex: "operation",
      width: 200,
      render: (_: any, record: DataType) => {
        const editable = isEditing(record);
        return editable ? (
          <Space>
            <IndustrialButton
              icon={<SaveOutlined />}
              type="primary"
              size="small"
              onClick={() => save(record.id)}
              loading={editFolderMutation.isLoading}
            >
              {t("folder_editor.save")}
            </IndustrialButton>
            <IndustrialButton
              className="cancel-btn"
              icon={<CloseOutlined />}
              size="small"
              onClick={cancel}
            >
              {t("folder_editor.cancel")}
            </IndustrialButton>
          </Space>
        ) : (
          <Space>
            <IndustrialButton
              className="edit-btn"
              icon={<EditOutlined />}
              size="small"
              disabled={editingKey !== ""}
              onClick={() => edit(record)}
            >
              {t("folder_editor.edit")}
            </IndustrialButton>
            <Popconfirm
              title={t("folder_editor.delete_title")}
              description={t("folder_editor.delete_description")}
              onConfirm={() => handleDeleteFolder(record.id)}
              okText={t("folder_editor.delete_ok_text")}
              cancelText={t("folder_editor.delete_cancel_text")}
              disabled={editingKey !== ""}
            >
              <IndustrialButton
                className="delete-btn"
                icon={<DeleteOutlined />}
                size="small"
                disabled={editingKey !== ""}
                loading={deleteFolderMutation.isLoading}
              >
                {t("folder_editor.delete")}
              </IndustrialButton>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const mergedColumns: TableProps<DataType>["columns"] = columns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record: DataType) => ({
        record,
        inputType: "text",
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  return (
    <>
      {contextHolder}
      <IndustrialModal
        title={
          <>
            <FolderOutlined />
            {t("folder_editor.title")}
          </>
        }
        open={openFolderEditorModal}
        onCancel={handleCancel}
        width={800}
      >
        {/* Add New Folder Section */}
        <SectionHeader>
          <PlusOutlined />
          {t("folder_editor.create_new_folder")}
        </SectionHeader>
        <StyledForm form={folderForm} layout="vertical">
          <Form.Item
            label={t("folder_editor.folder_name")}
            name="name"
            rules={[
              {
                required: true,
                message: t("folder_editor.folder_name_required"),
              },
            ]}
          >
            <IndustrialInput
              placeholder={t("folder_editor.folder_name_placeholder")}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <IndustrialButton
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleFolderSubmit}
              loading={addFolderMutation.isLoading}
            >
              {t("folder_editor.create_folder_btn")}
            </IndustrialButton>
          </Form.Item>
        </StyledForm>

        <SectionDivider />

        {/* Existing Folders Section */}
        <SectionHeader>
          <FolderOutlined />
          {t("folder_editor.existing_folders")} ({folders?.length || 0})
        </SectionHeader>
        <Form form={form} component={false}>
          <IndustrialTable<DataType>
            components={{
              body: { cell: EditableCell },
            }}
            bordered
            dataSource={folders as []}
            columns={mergedColumns}
            rowClassName={(record) =>
              isEditing(record) ? "editable-row-editing" : "editable-row"
            }
            pagination={{
              pageSize: 10,
              onChange: cancel,
              showTotal: (total, range) => (
                <span style={{ fontFamily: "Roboto Mono, monospace" }}>
                  {range[0]}-{range[1]} {t("utils.of")} {total}
                </span>
              ),
            }}
            rowKey="id"
            loading={
              deleteFolderMutation.isLoading || editFolderMutation.isLoading
            }
          />
        </Form>
      </IndustrialModal>
    </>
  );
};

export default FolderEditor;
