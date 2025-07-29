import { useState } from "react";
import styled from "styled-components";
import { Table, Typography, Layout } from "antd";
import moment from "moment";
import useSimResult, { SimulationResult } from "@/api/useSimResult";
import Header from "@/components/Header";
import { Content } from "antd/es/layout/layout";
import { useIsMobile } from "@/hooks/useIsMoblie";
import { useTranslation } from "react-i18next";
import ExpandedRow from "./ExpandedRow";

const { Text } = Typography;

const PageContainer = styled.div`
  padding: 24px;
  background-color: #f5f5f5;
`;

const StyledTable = styled(Table)`
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const AllSimulateResult = () => {
  const { data, isLoading } = useSimResult();
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const { isMobile } = useIsMobile();
  const { t } = useTranslation();

  const columns = [
    {
      title: t("sim.sim_result.simulation_id"),
      dataIndex: "id",
      key: "id",
      render: (id: string) => <Text code>{id.slice(0, 8)}...</Text>,
    },
    {
      title: t("sim.sim_result.start_time"),
      dataIndex: "startTime",
      key: "startTime",
    },
    {
      title: t("sim.sim_result.end_time"),
      dataIndex: "endTime",
      key: "endTime",
    },
    {
      title: t("sim.sim_result.total_cargos"),
      dataIndex: "total_cargos_carried",
      key: "total_cargos_carried",
    },
    {
      title: t("sim.sim_result.success_rate"),
      dataIndex: "mission_success_rate",
      key: "mission_success_rate",
      render: (v: number) => `${v}%`,
    },
    {
      title: t("sim.sim_result.completed_missions"),
      dataIndex: "completed_missions",
      key: "completed_missions",
    },
    {
      title: t("sim.sim_result.total_missions"),
      dataIndex: "total_mission_count",
      key: "total_mission_count",
    },
    {
      title: t("sim.sim_result.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: (a: SimulationResult, b: SimulationResult) =>
        a.createdAt.getTime() - b.createdAt.getTime(),
      render: (time: string) => moment(time).format("YYYY-MM-DD HH:mm:ss"),
    },
  ];

  return (
    <Layout style={{ height: `${isMobile ? "100dvh" : "100%"}` }}>
      <Header isMobile={isMobile} />
      <Content>
        <Layout style={{ height: "100%", width: "100%" }}>
          <PageContainer>
            <StyledTable<any>
              loading={isLoading}
              dataSource={(data || []) as []}
              rowKey="id"
              columns={columns}
              expandable={{
                expandedRowRender: (record: SimulationResult) => (
                  <ExpandedRow record={record} />
                ),
                expandedRowKeys,
                onExpandedRowsChange: (keys: string[]) =>
                  setExpandedRowKeys(keys as string[]),
              }}
            />
          </PageContainer>
        </Layout>
      </Content>
    </Layout>
  );
};

export default AllSimulateResult;
