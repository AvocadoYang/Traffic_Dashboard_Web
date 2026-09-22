import { FC } from "react";
import { Alert, Empty, Flex, Statistic, Table, Tag } from "antd";
import { useTranslation } from "react-i18next";
import useScenarioForecast, { ForecastRow } from "@/api/useScenarioForecast";

/**
 * 按下開始之前最想知道的事: 「這樣設會不會 20 分鐘就塞死」。
 * 用進料速率 vs 群組容量 vs 有沒有出口消化, 直接把撐得住多久算出來。
 */
const ForecastPanel: FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useScenarioForecast();

  if (!data) return null;

  const risky = data.rows.filter(
    (r) => r.minutesToFull !== null && r.minutesToFull < 60
  );

  const columns = [
    { title: t("sim.scenario.group"), dataIndex: "groupName" },
    { title: t("sim.scenario.capacity"), dataIndex: "capacity", width: 80 },
    {
      title: t("sim.scenario.inflow"),
      width: 110,
      render: (_: unknown, row: ForecastRow) =>
        t("sim.scenario.per_hour", { count: row.inflowPerHour }),
    },
    {
      title: t("sim.scenario.has_sink"),
      width: 90,
      render: (_: unknown, row: ForecastRow) =>
        row.hasSink ? (
          <Tag color="green">{t("sim.scenario.yes")}</Tag>
        ) : (
          <Tag color="orange">{t("sim.scenario.no")}</Tag>
        ),
    },
    {
      title: t("sim.scenario.time_to_full"),
      width: 130,
      render: (_: unknown, row: ForecastRow) => {
        if (row.minutesToFull === null)
          return <Tag color="green">{t("sim.scenario.sustainable")}</Tag>;

        const color = row.minutesToFull < 30 ? "red" : row.minutesToFull < 60 ? "orange" : "blue";
        return (
          <Tag color={color}>
            {t("sim.scenario.minutes", { count: row.minutesToFull })}
          </Tag>
        );
      },
    },
  ];

  return (
    <Flex vertical gap={12}>
      <Flex gap={32} wrap>
        <Statistic
          title={t("sim.scenario.total_inflow")}
          value={data.inflowPerHour}
          suffix={t("sim.scenario.per_hour_unit")}
          loading={isLoading}
        />
      </Flex>

      {!data.hasAnyRule && (
        <Alert type="warning" showIcon message={t("sim.scenario.no_rules_warning")} />
      )}

      {data.hasAnyRule && !data.hasFallback && (
        <Alert type="warning" showIcon message={t("sim.scenario.no_fallback_warning")} />
      )}

      {risky.length > 0 && (
        <Alert
          type="error"
          showIcon
          message={t("sim.scenario.saturation_warning", {
            groups: risky.map((r) => r.groupName).join(", "),
          })}
        />
      )}

      <Table
        size="small"
        rowKey="groupId"
        loading={isLoading}
        dataSource={data.rows}
        columns={columns as never}
        pagination={false}
        locale={{
          emptyText: <Empty description={t("sim.scenario.no_forecast")} />,
        }}
      />
    </Flex>
  );
};

export default ForecastPanel;
