import {
  Button,
  message,
  Popconfirm,
  Space,
  Table,
  TableProps,
  Tag,
} from "antd";
import { CaretRightOutlined, PauseOutlined } from "@ant-design/icons";

import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { useTranslation } from "react-i18next";

type CM = {
  isActive: boolean;
  amrId?: string;
  missionName: string;
  cycle_relate_id: string;
  mission_id: string;
};

const test = [
  {
    key: 1,
    isActive: false,
    missionName: "測試1",
    amrId: "anfa-cb15-40-003",
    cycle_relate_id: "qe1qeqwofwefweoifeiwojfoiwejf",
    mission_id: "jkfoiwejfoijweofijewoifjweoifjoiewjfoiwejfoiwejfoiewjf",
  },
  {
    key: 2,
    isActive: false,
    missionName: "測試2",
    amrId: "anfa-cb15-40-003",
    cycle_relate_id: "qe1qeqwofwe2weoifeiwojfoiwejf",
    mission_id: "jkfoiwejfoijweof2jewoifjweoifjoiewjfoiwejfoiwejfoiewjf",
  },
  {
    key: 3,
    isActive: true,
    missionName: "測試3",
    amrId: "anfa-cb15-40-003",
    cycle_relate_id: "qe11eqwofwe2weoifeiwojfoiwejf",
    mission_id: "jkfoiwej3oijweof2jewoifjweoifjoiewjfoiwejfoiwejfoiewjf",
  },
  {
    key: 4,
    isActive: false,
    missionName: "測試3",
    amrId: "anfa-cb15-40-003",
    cycle_relate_id: "qe11eqwofwe2weoifeiwojfoiwejf",
    mission_id: "jkfoiwej3oijweof2jewoifjweoifjoiewjfoiwejfoiwejfoiewjf",
  },
  {
    key: 5,
    isActive: false,
    missionName: "測試3",
    amrId: "anfa-cb15-40-003",
    cycle_relate_id: "qe11eqwofwe2weoifeiwojfoiwejf",
    mission_id: "jkfoiwej3oijweof2jewoifjweoifjoiewjfoiwejfoiwejfoiewjf",
  },
  {
    key: 6,
    isActive: false,
    missionName: "測試3",
    amrId: "anfa-cb15-40-003",
    cycle_relate_id: "qe11eqwofwe2weoifeiwojfoiwejf",
    mission_id: "jkfoiwej3oijweof2jewoifjweoifjoiewjfoiwejfoiwejfoiewjf",
  },
];

const CycleMissionTable: React.FC<{
  setOpenCycleMissionList: React.Dispatch<boolean>;
}> = ({ setOpenCycleMissionList }) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const activeMutation = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) => {
      return client.post(
        "api/setting/active-cycle-mission",
        {
          cycle_id: payload.id,
          isActive: payload.isActive,
        },
        {
          headers: { authorization: `Bearer ${localStorage.getItem("_KMT")}` },
        },
      );
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
    },
    onError: () => {
      void messageApi.error(t("utils.error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string }) => {
      return client.post(
        "api/setting/delete-cycle-mission",
        {
          cycle_id: payload.id,
        },
        {
          headers: { authorization: `Bearer ${localStorage.getItem("_KMT")}` },
        },
      );
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
    },
    onError: () => {
      void messageApi.error(t("utils.error"));
    },
  });

  const activeSwitch = (id: string, isActive: boolean) => {
    activeMutation.mutate({ id, isActive });
  };

  const deleteOne = (id: string) => {
    console.log(id);
    deleteMutation.mutate({ id });
  };

  const columns: TableProps<CM>["columns"] = [
    {
      title: t("toolbar.mission.mission"),
      dataIndex: "missionName",
      width: 10,
      key: "missionName",
    },
    {
      title: t("utils.amr_id"),
      dataIndex: "amrId",
      key: "amrId",
      width: "5%",
      render(_, record) {
        return record.amrId ? record.amrId : t("utils.random");
      },
    },
    Table.EXPAND_COLUMN,
    {
      title: t("utils.status"),
      dataIndex: "status",
      key: "status",
      width: "2%",
      render(_, record) {
        return record.isActive ? (
          <Tag color="green">{t("utils.working")}</Tag>
        ) : (
          <Tag color="red">{t("utils.stopping")}</Tag>
        );
      },
    },
    Table.SELECTION_COLUMN,
  ];
  return (
    <>
      {contextHolder}
      <div style={{ padding: "10px", width: "100%", textAlign: "right" }}>
        <Button
          color="danger"
          variant="filled"
          loading={activeMutation.isLoading}
          onClick={() => setOpenCycleMissionList(false)}
        >
          {t("utils.close")}
        </Button>
      </div>
      <Table
        expandable={{
          expandedRowRender: (record) => {
            return (
              <div style={{ width: "100%", textAlign: "right" }}>
                <Space>
                  <Popconfirm
                    title="Sure to delete?"
                    onConfirm={() => deleteOne(record.cycle_relate_id)}
                  >
                    <Button color="danger" variant="filled">
                      {t("utils.delete")}
                    </Button>
                  </Popconfirm>

                  {record.isActive ? (
                    <Button
                      onClick={() =>
                        activeSwitch(record.cycle_relate_id, !record.isActive)
                      }
                    >
                      <PauseOutlined></PauseOutlined>
                      {t("utils.inactive")}
                    </Button>
                  ) : (
                    <Button
                      onClick={() =>
                        activeSwitch(record.cycle_relate_id, !record.isActive)
                      }
                    >
                      <CaretRightOutlined></CaretRightOutlined>
                      {t("utils.active")}
                    </Button>
                  )}
                </Space>
              </div>
            );
          },
        }}
        style={{ width: "95%" }}
        columns={columns as []}
        // dataSource={!data ? [] : data.map((mission) => ({ ...mission, key: nanoid() }))}
        dataSource={test}
        pagination={{ pageSize: 5 }}
      ></Table>
    </>
  );
};

export default CycleMissionTable;
