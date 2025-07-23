import { DeleteTwoTone, EditOutlined } from "@ant-design/icons";
import client from "@/api/axiosClient";
import { YawType, YawTypeWithoutList } from "@/api/useYaw";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Popconfirm, Skeleton, Table, Flex, Button } from "antd";
import { ColumnsType } from "antd/es/table";
import { FC } from "react";
import { useTranslation } from "react-i18next";

const YawTable: FC<{
  setOpenYawModel: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectYawId: React.Dispatch<React.SetStateAction<string>>;
  yawDataSource: YawType;
}> = ({ setOpenYawModel, setSelectYawId, yawDataSource }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return client.post("api/setting/delete-yaw", {
        id,
      });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["yaw"],
      });
      await queryClient.refetchQueries({ queryKey: ["cargoLoc-mission"] });
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleEdit = (id: string) => {
    setSelectYawId(id);
    setOpenYawModel(true);
  };

  const columns: ColumnsType<YawTypeWithoutList> = [
    {
      title: "yaw",
      dataIndex: "yaw",
      key: "yaw",
      sorter: (a, b) => a.yaw - b.yaw,
    },
    {
      title: "",
      dataIndex: "operation",
      key: "operation",

      render: (_, record: YawTypeWithoutList) => {
        return (
          <Flex gap="small">
            <Popconfirm
              title="Sure to delete?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button
                icon={<DeleteTwoTone twoToneColor="#f30303" />}
                color="danger"
                variant="filled"
                type="link"
              >
                {t("utils.delete")}
              </Button>
            </Popconfirm>
            <Button
              onClick={() => handleEdit(record.id)}
              icon={<EditOutlined />}
              color="primary"
              variant="filled"
              type="link"
            >
              {t("utils.edit")}
            </Button>
          </Flex>
        );
      },
    },
  ];
  if (!yawDataSource) return <Skeleton active />;

  return (
    <Table
      dataSource={yawDataSource}
      columns={columns}
      rowKey={(record: YawTypeWithoutList) => record.id}
    />
  );
};

export default YawTable;
