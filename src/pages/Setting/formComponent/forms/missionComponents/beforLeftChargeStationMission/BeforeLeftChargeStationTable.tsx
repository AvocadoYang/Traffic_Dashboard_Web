import { FC } from "react";
import { Button, Flex, Popconfirm, Skeleton, Table, message } from "antd";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useMutation } from "@tanstack/react-query";
import useBLCS from "@/api/useBeforeleftChargeStation";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import {
  CloseCircleOutlined,
  DeleteTwoTone,
  PlayCircleOutlined,
} from "@ant-design/icons";

interface DataType {
  id: string;
  active: boolean;
  amrId: string[];
  missionId: string;
  name: string;
}

const ActiveBox = styled.div`
  min-width: 4em;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
`;

type DotStyle = {
  $active: boolean;
};

const Dot = styled.div<DotStyle>`
  border-radius: 99%;
  width: 7px;
  height: 7px;
  background-color: ${(prop) => (prop.$active ? "#2bea00" : "#979797")};
`;

const AmrBox = styled.div`
  display: flex;
  flex-direction: column;
`;

const AmrText = styled.span`
  margin: 0;
  padding: 0;
  color: #4d4d4d;
`;

const BeforeLeftChargeStationTable: FC = () => {
  const { data, isLoading, refetch } = useBLCS();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const activeMutation = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) => {
      return client.post("api/setting/active-BLCS", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string }) => {
      return client.post("api/setting/delete-BLCS", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleActive = (isActive: boolean, id: string) => {
    activeMutation.mutate({ id, isActive });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const columns = [
    {
      title: t("mission.before_left_charge_station_mission.status"),
      key: "active",
      dataIndex: "active",
      width: 100,
      render: (_v: unknown, record: DataType) => {
        return (
          <ActiveBox>
            <Dot $active={record.active as boolean} />{" "}
            <>
              {record.active
                ? t("mission.before_left_charge_station_mission.executing")
                : t("mission.before_left_charge_station_mission.stale")}
            </>
          </ActiveBox>
        );
      },
    },
    {
      title: t("mission.before_left_charge_station_mission.mission"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("mission.before_left_charge_station_mission.car"),
      dataIndex: "amrId",
      key: "amrId",
      render: (_v: unknown, record: DataType) => {
        const da = record.amrId.map((s, i) => {
          const subName = s.split("-").slice(1).join("-");

          return <AmrText key={`${subName}-${i}`}>{subName}</AmrText>;
        });

        return <AmrBox>{da}</AmrBox>;
      },
    },
    {
      title: "",
      dataIndex: "option",
      key: "option",
      width: 50,
      render: (_v: unknown, record: DataType) => {
        return (
          <>
            <Flex gap="small">
              {record.active ? (
                <Button
                  onClick={() => handleActive(false, record.id)}
                  icon={<CloseCircleOutlined />}
                  color="default"
                  variant="filled"
                  type="link"
                >
                  {t("utils.inactive")}
                </Button>
              ) : (
                <Button
                  onClick={() => handleActive(true, record.id)}
                  icon={<PlayCircleOutlined />}
                  color="primary"
                  variant="filled"
                  type="link"
                >
                  {t("utils.active")}
                </Button>
              )}
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
            </Flex>
          </>
        );
      },
    },
  ];

  if (isLoading) return <Skeleton />;
  return (
    <>
      {contextHolder}
      <Table
        rowKey={(record) => record.missionId}
        columns={columns}
        dataSource={data as DataType[]}
      />
    </>
  );
};

export default BeforeLeftChargeStationTable;
