import { FC } from "react";
import { Empty, Flex, Spin, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import moment from "moment";
import { useTranslation } from "react-i18next";
import useCargoByMission, {
  CargoMissionEvent,
} from "@/api/useCargoByMission";
import { cargoActionColor } from "./cargoAction";

const { Text } = Typography;

/** 任務 → 貨物: 這個任務取過、放過哪些貨物 */
const MissionCargoEvents: FC<{ missionId: string }> = ({ missionId }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useCargoByMission(missionId);

  const columns: ColumnsType<CargoMissionEvent> = [
    {
      title: t("cargo_history.time"),
      dataIndex: "timestamp",
      width: 170,
      render: (v: string) => moment(v).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: t("cargo_history.action_filter"),
      dataIndex: "action",
      width: 100,
      render: (a: string) => (
        <Tag color={cargoActionColor(a)}>
          {t(`cargo_history.action.${a}` as Parameters<typeof t>[0]) as string}
        </Tag>
      ),
    },
    {
      title: t("cargo_history.cargoId"),
      key: "cargo",
      render: (_v, r) => (
        <Flex vertical>
          <Text code copyable={{ text: r.cargo.custom_id ?? r.cargo.id }}>
            {(r.cargo.custom_id ?? r.cargo.id).slice(0, 12)}
          </Text>
          {r.cargo.custom_cargo_metadata?.custom_name && (
            <Text type="secondary">
              {r.cargo.custom_cargo_metadata.custom_name}
            </Text>
          )}
        </Flex>
      ),
    },
    {
      title: t("cargo_history.location"),
      dataIndex: "location",
      render: (v: string | null) => v || "-",
    },
    {
      title: t("cargo_history.amr"),
      dataIndex: "amr_id",
      render: (v: string | null) => v || "-",
    },
  ];

  if (isLoading) return <Spin />;
  if (!data?.length)
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={t("cargo_history.no_cargo_events")}
      />
    );

  return (
    <Table
      size="small"
      rowKey="id"
      columns={columns}
      dataSource={data}
      pagination={false}
      scroll={{ x: 560 }}
    />
  );
};

export default MissionCargoEvents;
