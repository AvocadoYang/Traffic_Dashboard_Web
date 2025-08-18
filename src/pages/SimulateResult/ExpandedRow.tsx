import { Table, Card, Typography, Flex } from "antd";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Bar,
} from "recharts";
import styled from "styled-components";
import { SimulationResult } from "@/api/useSimResult";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

const COLORS = ["#1890ff", "#52c41a"];

const ExpandedRowContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  padding: 16px;
`;

const CardWithCustomHeight = styled(Card)`
  min-height: 350px;
`;

const TableWrapper = styled(Card)`
  min-height: 100px;
`;

const ChartWrapper = styled.div`
  display: flex;
`;

const ExpandedRow = ({ record }: { record: SimulationResult }) => {
  const { t } = useTranslation();
  const totalWorking = record.amr_stat.reduce(
    (sum, a) => sum + a.workingTime,
    0,
  );
  const totalIdle = record.amr_stat.reduce((sum, a) => sum + a.idleTime, 0);

  const idleChartData = [
    { name: t("sim.sim_result.working"), value: totalWorking },
    { name: t("sim.sim_result.idle"), value: totalIdle },
  ];

  return (
    <ExpandedRowContainer>
      <Flex vertical>
        <TableWrapper title={t("sim.sim_result.amr_stats")}>
          <Table
            dataSource={record.amr_stat}
            rowKey={(row) => `${record.id}-${row.amrName}`}
            size="small"
            pagination={false}
            columns={[
              {
                title: t("sim.sim_result.amr"),
                dataIndex: "amrName",
                render: (amrName: string) => <Text code>{amrName}</Text>,
              },
              {
                title: t("sim.sim_result.missions"),
                dataIndex: "missionCount",
              },
              { title: t("sim.sim_result.carry"), dataIndex: "totalCarry" },
              {
                title: t("sim.sim_result.battery_cost"),
                dataIndex: "totalBatteryCost",
              },
              {
                title: t("sim.sim_result.working_time"),
                dataIndex: "workingTime",
              },
              { title: t("sim.sim_result.idle_time"), dataIndex: "idleTime" },
              {
                title: t("sim.sim_result.total_distance"),
                dataIndex: "totalDistance",
              },
            ]}
            scroll={{ y: 200 }}
          />
        </TableWrapper>

        <ChartWrapper>
          <CardWithCustomHeight title={t("sim.sim_result.idle_vs_working")}>
            <PieChart width={300} height={300}>
              <Pie
                data={idleChartData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label
              >
                {idleChartData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          </CardWithCustomHeight>

          <CardWithCustomHeight
            title={t("sim.sim_result.battery_cost_per_amr")}
          >
            <BarChart width={300} height={250} data={record.amr_stat}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="amrName" interval="preserveStartEnd" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="totalBatteryCost" fill="#108ee9" />
            </BarChart>
          </CardWithCustomHeight>

          <CardWithCustomHeight title={t("sim.sim_result.missions_vs_cargos")}>
            <BarChart width={300} height={250} data={record.amr_stat}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="amrName" interval="preserveStartEnd" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Bar
                dataKey="missionCount"
                fill="#fa8c16"
                name={t("sim.sim_result.missions")}
              />
              <Bar
                dataKey="totalCarry"
                fill="#13c2c2"
                name={t("sim.sim_result.cargos")}
              />
            </BarChart>
          </CardWithCustomHeight>

          <CardWithCustomHeight
            title={t("sim.sim_result.total_distance_traveled")}
          >
            <LineChart width={300} height={250} data={record.amr_stat}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="amrName" interval="preserveStartEnd" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Line type="monotone" dataKey="totalDistance" stroke="#8884d8" />
            </LineChart>
          </CardWithCustomHeight>
        </ChartWrapper>
      </Flex>
    </ExpandedRowContainer>
  );
};

export default ExpandedRow;
