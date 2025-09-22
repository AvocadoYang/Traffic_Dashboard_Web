import React, { FC } from "react";
import { Card, Modal, Skeleton, Table, Tag } from "antd";
import useChargeStationSocket from "@/sockets/useChargeStationSocket";
import { useSetAtom } from "jotai";
import { OpenChargeStationModal } from "@/pages/Main/global/jotai";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

type TableRow = {
  key: string;
  category: "current" | "error" | "other";
  field: string;
  value: boolean;
};

const fieldI18nMap: Record<string, string> = {
  // current
  AUTO_MODE: "charge.auto_mode",
  COMPLETE: "charge.complete",
  FAULT: "charge.fault",
  PROCESS: "charge.process",
  STANDBY: "charge.standby",

  // error
  MODULE_COMMUNICATION_FAILURE: "charge.moduleCommunicationFailure",
  REVERSE_BATTERY_CONNECTION: "charge.reverseBetterConnection",
  BATTERY_NOT_CONNECTED: "charge.batteryNotConnected",
  SHORT_CIRCUIT: "charge.shortCircuit",
  OVER_VOLTAGE: "charge.overVoltage",
  OVER_CURRENT: "charge.overCurrent",
  TOTAL_FAULT: "charge.totalFault",

  // other
  INFRARED_IN_PLACE: "charge.infraredInPlace",
  COMPRESS: "charge.compress",
  SCALING_FAILURE: "charge.scalingFault",
  REACH_OUT_CHARGE: "charge.reachOutCharge",
  RETURNING: "charge.returning",
  IS_STRETCHING_OUT: "charge.isStretching",
  RESET: "charge.reset",
};

const StatusPanel: FC<{ locId: string | null }> = ({ locId }) => {
  const socketState = useChargeStationSocket();
  const setChargeConfig = useSetAtom(OpenChargeStationModal);
  const { t } = useTranslation();

  const handleClose = () => {
    setChargeConfig(null);
  };

  const station = locId ? socketState[locId] : null;
  const currentStatus = station?.currentStatus;

  const columns = [
    {
      title: "",
      dataIndex: "category",
      key: "category",
      width: 100,
      render: (cat: string) => (
        <Tag
          color={
            cat === "current" ? "blue" : cat === "error" ? "red" : "purple"
          }
        >
          {t(`charge.${cat}`)}
        </Tag>
      ),
    },
    {
      title: "",
      dataIndex: "field",
      key: "field",
      render: (field: string) => t(fieldI18nMap[field] || field),
    },
    {
      title: "",
      dataIndex: "value",
      key: "value",
      render: (val: boolean) => (
        <Tag color={val ? "green" : "red"}>{val ? "ON" : "OFF"}</Tag>
      ),
    },
  ];

  let content;
  if (!station || !currentStatus) {
    // Show skeleton while waiting for socket data
    content = <Skeleton active paragraph={{ rows: 6 }} />;
  } else {
    const rows: TableRow[] = [
      ...Object.entries(currentStatus.current).map(([field, value]) => ({
        key: `current-${field}`,
        category: "current",
        field,
        value,
      })),
      ...Object.entries(currentStatus.error).map(([field, value]) => ({
        key: `error-${field}`,
        category: "error",
        field,
        value,
      })),
      ...Object.entries(currentStatus.other).map(([field, value]) => ({
        key: `other-${field}`,
        category: "other",
        field,
        value,
      })),
    ];

    content = (
      <Card
        title={`${station.name} (${station.locationId})`}
        extra={`Station: ${station.stationId} | ${station.ip}:${station.port}`}
      >
        <div style={{ marginBottom: 8 }}>
          <strong>{t("charge.updateTime")}:</strong>{" "}
          {currentStatus.responseTime
            ? dayjs(currentStatus.responseTime).format("YYYY-MM-DD HH:mm:ss")
            : "-"}
        </div>
        <Table
          size="small"
          bordered
          pagination={false}
          dataSource={rows}
          columns={columns}
          rowKey="key"
        />
      </Card>
    );
  }

  return (
    <Modal open={!!locId} onCancel={handleClose} footer={null}>
      {content}
    </Modal>
  );
};

export default StatusPanel;
