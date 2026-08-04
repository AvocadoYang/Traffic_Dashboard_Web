import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Flex, Popconfirm, Skeleton, Table, Tag, message } from "antd";
import { useTranslation } from "react-i18next";
import useMapGroup, { MapGroupName } from "@/api/useMapGroup";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import AddModal from "./AddModal";
import { DeleteOutlined, EditTwoTone, PlayCircleOutlined, PlusOutlined } from "@ant-design/icons";

const MapGroupTable: React.FC = () => {
  const { t } = useTranslation();

  const { data: groups, refetch } = useMapGroup();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editValue, setEditValue] = useState<MapGroupName | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return client.delete("/api/setting/map-group", { data: { id } });
    },
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      queryClient.invalidateQueries({ queryKey: ["map-group"] });
      queryClient.invalidateQueries({ queryKey: ["all-map-Info"] });
    },
    onError: (e: ErrorResponse) => {
      errorHandler(e, messageApi);
    },
  });

  const activateGroupMutation = useMutation({
    mutationFn: (id: string) => {
      return client.patch("api/setting/map-group/activate", { id });
    },
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      queryClient.invalidateQueries({ queryKey: ["map-group"] });
      queryClient.invalidateQueries({ queryKey: ["all-map-Info"] });
      queryClient.invalidateQueries({ queryKey: ["map"] });
      queryClient.invalidateQueries({ queryKey: ["map-list"] });
      queryClient.invalidateQueries({ queryKey: ["active-group-resources"] });
      queryClient.invalidateQueries({ queryKey: ["all-groups-resources"] });
    },
    onError: (e: ErrorResponse) => {
      errorHandler(e, messageApi);
    },
  });

  const handleOpenAddModal = () => {
    setIsOpenModal(true);
  };

  const edit = (record: MapGroupName) => {
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
    deleteMutation.mutate(id);
  };

  const columns = [
    {
      title: t("map_group_table.name"),
      dataIndex: "group_name",
      width: "25%",
      sorter: (a: MapGroupName, b: MapGroupName) =>
        (a.group_name || "").localeCompare(b.group_name || ""),
    },
    {
      title: t("map_group_table.maps"),
      dataIndex: "maps",
      width: "50%",
      render: (_: unknown, record: MapGroupName) => {
        return record.maps.map((e) => <Tag key={e.id}>{e.fileName}</Tag>);
      },
    },
    {
      title: t("map_group_table.status"),
      dataIndex: "isUsing",
      render: (isUsing: boolean) =>
        isUsing ? (
          <Tag color="magenta">{t("map_group_table.active")}</Tag>
        ) : (
          <Tag>{t("map_group_table.inactive")}</Tag>
        ),
    },
    {
      dataIndex: "operation",
      render: (_: unknown, record: MapGroupName) => {
        return (
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

            <Popconfirm
              title={t("map_group_table.activate_confirm")}
              onConfirm={() => activateGroupMutation.mutate(record.id)}
            >
              <Button
                color="primary"
                variant="filled"
                disabled={record.isUsing}
                icon = { <PlayCircleOutlined color="#52c41a"></PlayCircleOutlined>}
                style={
                  record.isUsing
                    ? undefined
                    : { color: "#52c41a" }
                }
              >
                {t("map_group_table.activate")}
              </Button>
            </Popconfirm>
          </Flex>
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

      <Table<MapGroupName>
        bordered
        rowKey={(record) => record.id}
        dataSource={groups as MapGroupName[]}
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

export default MapGroupTable;
