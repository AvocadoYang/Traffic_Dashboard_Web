import { FC, useMemo } from "react";
import { CloseCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";
import useAlarmHistory from "@/api/useAlarmHistory";
import RecordPanel, { IdTag, RecordText, RecordTime } from "./RecordPanel";

interface AlarmRecord {
  id: string;
  alarm_id: number;
  createdAt: Date;
  alarm: { info_ch: string };
}

const TONE = "danger";

const AlarmTable: FC = () => {
  const { t } = useTranslation();

  const columns = useMemo<ColumnsType<AlarmRecord>>(
    () => [
      {
        title: t("records.alarm_id"),
        dataIndex: "alarm_id",
        key: "alarm_id",
        width: 72,
        render: (id: number) => <IdTag $tone={TONE}>{id}</IdTag>,
      },
      {
        title: t("records.description"),
        key: "description",
        render: (_: unknown, record) => (
          <RecordText>{record.alarm.info_ch}</RecordText>
        ),
      },
      {
        title: t("records.time"),
        dataIndex: "createdAt",
        key: "createdAt",
        width: 110,
        render: (date: Date) => <RecordTime value={date} />,
        sorter: (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        defaultSortOrder: "descend",
      },
    ],
    [t],
  );

  return (
    <RecordPanel<AlarmRecord>
      tone={TONE}
      icon={<CloseCircleOutlined />}
      title={t("records.alarm")}
      columns={columns}
      useHistory={useAlarmHistory}
      deleteUrl="/api/records/delete-all-alarm"
      exportUrl="/api/records/export-alarm"
      exportFileName="alarm_history"
    />
  );
};

export default AlarmTable;
