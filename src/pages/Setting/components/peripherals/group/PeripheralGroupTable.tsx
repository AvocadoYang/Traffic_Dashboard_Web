import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Flex, Popconfirm, Skeleton, Table, Tag, message } from "antd";
import { useTranslation } from "react-i18next";
import usePeripheralGroup, {
  PeripheralGroupName,
} from "@/api/usePeripheralGroup";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import AddModal from "./AddModal";
import { prefixLevelName } from "@/utils/globalFunction";
import { DeleteOutlined, EditTwoTone, PlusOutlined } from "@ant-design/icons";

const PeripheralGroupTable: React.FC = () => {
  const { t } = useTranslation();

  const { data: groups, refetch } = usePeripheralGroup();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editValue, setEditValue] = useState<PeripheralGroupName | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string }) => {
      return client.post("/api/setting/delete-peripheral-group", payload);
    },
    onSuccess: () => {
      messageApi.success("success");
      queryClient.invalidateQueries({ queryKey: ["peripheral-group"] });
      queryClient.invalidateQueries({ queryKey: ["peripheral-corning"] });
      setIsOpenModal(false);
    },
    onError: (e: ErrorResponse) => {
      errorHandler(e, messageApi);
    },
  });

  const handleOpenAddModal = () => {
    setIsOpenModal(true);
  };

  const edit = (record: PeripheralGroupName) => {
    if (!record.id) {
      messageApi.error("id is not found");
      return;
    }
    setIsOpenModal(true);
    setIsEdit(true);
    setEditValue(record);
  };

  const resetEdit = () => {
    setIsEdit(false);
    setEditValue(null);
    setIsOpenModal(false);
  };

  const deleteData = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const columns = [
    {
      title: t("peripheral_group_table.name"),
      dataIndex: "name",
      width: "10%",
      sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
    },
    {
      title: t("peripheral_group_table.description"),
      dataIndex: "description",
      width: "30%",
    },
    {
      title: t("peripheral_group_table.peripherals"),
      dataIndex: "groups",
      width: "30%",

      render: (_: unknown, record: PeripheralGroupName) => {
        return record.peripherals.map((e) => (
          <Tag key={e.id}>{prefixLevelName(e.name)}</Tag>
        ));
      },
    },
    {
      dataIndex: "operation",
      render: (_: any, record: PeripheralGroupName) => {
        return (
          <>
            <Flex gap="middle">
              <Button
                color="primary"
                variant="filled"
                onClick={() => edit(record)}
                icon={<EditTwoTone twoToneColor="#33bcb7" />}
              >
                {t("utils.edit")}
              </Button>

              <Popconfirm
                title="are you sure?"
                onConfirm={() => deleteData(record.id)}
              >
                <Button
                  icon={<DeleteOutlined color="#ff0707" />}
                  color="danger"
                  variant="filled"
                  type="link"
                >
                  {t("utils.delete")}
                </Button>
              </Popconfirm>
            </Flex>
          </>
        );
      },
    },
  ];

  if (!groups) return <Skeleton active />;

  return (
    <>
      {contextHolder}
      <Flex gap="middle">
        <Button icon={<PlusOutlined />} onClick={handleOpenAddModal}>
          {t("utils.add")}
        </Button>

        <Button onClick={() => refetch()}>{t("utils.reload")}</Button>
      </Flex>

      <Table<PeripheralGroupName>
        bordered
        rowKey={(record) => record.id}
        dataSource={groups as []}
        columns={columns}
        rowClassName="editable-row"
      />

      <AddModal
        isEdit={isEdit}
        editValue={editValue}
        isOpenModal={isOpenModal}
        resetEdit={resetEdit}
      />
    </>
  );
};

export default PeripheralGroupTable;
