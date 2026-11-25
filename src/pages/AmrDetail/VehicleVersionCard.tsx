import { FC } from "react";
import { Card, Empty, Table, Typography } from "antd";
import { CloudServerOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { commitTime, useVehicleVersionHistory, useVehicleVersions } from "@/api/useVehicleVersions";

const { Text } = Typography;

/** 車輛詳情頁: 這台車 amr-core 的版本、是不是低於最低版本、最近的版本更新紀錄 */
const VehicleVersionCard: FC<{ amrId: string }> = ({ amrId }) => {
  const { t } = useTranslation();
  const { data } = useVehicleVersions();
  const { data: history } = useVehicleVersionHistory(amrId);
  const car = data?.cars.find((c) => c.amrId === amrId);

  return (
    <Card
      size="small"
      style={{ marginBottom: 24 }}
      title={
        <span>
          <CloudServerOutlined /> {t("vehicle_version.card_title")}
        </span>
      }
    >
      {!car?.version ? (
        <Text type="secondary">{t("vehicle_version.not_reported")}</Text>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <Text strong style={{ fontFamily: "Roboto Mono" }} type={car.belowMin ? "danger" : undefined}>
            {car.version}
          </Text>
          <Text type="secondary">
            {" · "}
            {commitTime(car.commitAt) ?? t("vehicle_version.no_commit_time")}
          </Text>
          {car.belowMin && data?.min && (
            <div>
              <Text type="danger">
                {t("vehicle_version.below_min_detail", { min: data.min.version })}
              </Text>
            </div>
          )}
        </div>
      )}
      {history && history.length > 0 ? (
        <Table
          size="small"
          rowKey="id"
          pagination={{ pageSize: 5, hideOnSinglePage: true, showSizeChanger: false }}
          dataSource={history}
          columns={[
            {
              title: t("vehicle_version.col.time"),
              dataIndex: "seenAt",
              render: (v: number) => new Date(v).toLocaleString([], { hour12: false }),
            },
            {
              title: t("vehicle_version.col.change"),
              render: (_: unknown, r) => (
                <span style={{ fontFamily: "Roboto Mono" }}>
                  {r.previousVersion ? `${r.previousVersion} → ${r.version}` : `${t("vehicle_version.first_seen")} ${r.version}`}
                </span>
              ),
            },
          ]}
        />
      ) : (
        car?.version && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("vehicle_version.no_history")} />
      )}
    </Card>
  );
};

export default VehicleVersionCard;
