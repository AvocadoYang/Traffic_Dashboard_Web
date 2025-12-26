import { DeleteOutlined, EditTwoTone, PlusOutlined } from "@ant-design/icons";
import client from "@/api/axiosClient";
import useShelfCategory, {
  ShelfCategoryWithoutList,
} from "@/api/useShelfCategory";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Popconfirm, Button, Flex, message, Alert } from "antd";
import { ColumnsType } from "antd/es/table";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import styled from "styled-components";

const IndustrialContainer = styled.div`
  font-family: "Roboto Mono", monospace;
`;

const IndustrialButton = styled(Button)`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #1890ff;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;

  &:hover {
    background: #f0f5ff;
    border-color: #1890ff;
    color: #1890ff;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
  }

  &.danger {
    border-color: #ff4d4f;
    color: #ff4d4f;

    &:hover {
      background: #fff1f0;
      border-color: #ff7875;
      color: #ff7875;
      box-shadow: 0 2px 8px rgba(255, 77, 79, 0.2);
    }
  }

  &.primary {
    background: #1890ff;
    border-color: #1890ff;
    color: #ffffff;
    font-weight: 600;

    &:hover {
      background: #40a9ff;
      border-color: #40a9ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  }
`;

const IndustrialAlert = styled(Alert)`
  margin-bottom: 16px;
  font-family: "Roboto Mono", monospace;
  border: 1px solid #ff4d4f;
  border-left: 4px solid #ff4d4f;
  background: #fff1f0;

  .ant-alert-message {
    color: #ff4d4f;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }
`;

const StyledTable = styled(Table)`
  font-family: "Roboto Mono", monospace;

  .ant-table {
    border: 1px solid #d9d9d9;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    background: #ffffff;
  }

  .ant-table-thead > tr > th {
    background: #ffffff;
    border-bottom: 2px solid #1890ff;
    color: #262626;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: "Roboto Mono", monospace;
    padding: 12px 16px;
  }

  .ant-table-tbody > tr > td {
    padding: 12px 16px;
    color: #595959;
    border-bottom: 1px solid #d9d9d9;
    font-family: "Roboto Mono", monospace;
    font-size: 12px;
  }

  .ant-table-tbody > tr:hover > td {
    background: #fafafa;
  }
`;

const ShelfCategoryTable: FC<{
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectId: React.Dispatch<React.SetStateAction<string>>;
}> = ({ setOpen, setSelectId }) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useShelfCategory();
  const { t } = useTranslation();
  const [messageApi, contextHolders] = message.useMessage();

  const addMutation = useMutation({
    mutationFn: () => {
      return client.post("api/setting/add-shelf-category");
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["all-shelf-category"],
      });
      await queryClient.refetchQueries({
        queryKey: ["shelf"],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return client.post<unknown>("api/setting/delete-shelf-category", {
        id,
      });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["shelf"] });
      await queryClient.refetchQueries({
        queryKey: ["all-shelf-category"],
      });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const addHandler = () => [addMutation.mutate()];

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleEdit = (id: string) => {
    setOpen(true);
    setSelectId(id);
  };

  const columns: ColumnsType<ShelfCategoryWithoutList> = [
    {
      title: t("edit_shelf_category.name"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("edit_shelf_category.style"),
      dataIndex: "shelf_style",
      key: "shelf_style",
      render: (_v, record) => {
        switch (record.shelf_style) {
          case "type_1":
            return <>{t("edit_shelf_category.type_1")}</>;

          case "type_2":
            return <>{t("edit_shelf_category.type_2")}</>;

          default:
            return <></>;
        }
      },
    },
    {
      title: t("edit_shelf_category.every_level"),
      dataIndex: "height",
      key: "height",
      render: (_v, recorder) => {
        const sortedHeight = recorder.Height?.sort(
          (a, b) => a.height - b.height
        );

        return sortedHeight?.map((k) => <p key={k.id}>{k.height}</p>);
      },
    },
    {
      title: "",
      dataIndex: "",
      render: (_v, record) => {
        return (
          <Flex gap="small">
            <Popconfirm
              title={t("edit_shelf_category.delete_warning")}
              onConfirm={() => handleDelete(record.id)}
            >
              <IndustrialButton className="danger" icon={<DeleteOutlined />}>
                {t("utils.delete")}
              </IndustrialButton>
            </Popconfirm>

            <IndustrialButton
              className="primary"
              onClick={() => handleEdit(record.id)}
              icon={<EditTwoTone twoToneColor="#ffffff" />}
            >
              {t("utils.edit")}
            </IndustrialButton>
          </Flex>
        );
      },
    },
  ];

  if (isLoading) return [];
  return (
    <IndustrialContainer>
      {contextHolders}
      <IndustrialButton
        className="primary"
        icon={<PlusOutlined />}
        onClick={addHandler}
        style={{ marginBottom: 16 }}
      >
        {t("edit_shelf_category.add_shelf")}
      </IndustrialButton>

      <IndustrialAlert title={t("edit_shelf_panel.warn")} type="error" />

      <StyledTable
        dataSource={data as ShelfCategoryWithoutList[]}
        columns={columns}
        rowKey={(record) => record.id}
      />
    </IndustrialContainer>
  );
};

export default ShelfCategoryTable;
