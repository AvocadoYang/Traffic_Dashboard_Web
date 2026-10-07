import { FC, useMemo } from "react";
import { AlertOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";
import useSystemAlarmHhistory from "@/api/useSystemAlarmHhistory";
import RecordPanel, { IdTag, RecordText, RecordTime } from "./RecordPanel";

interface SystemAlarmRecord {
  id: string;
  level: number;
  message: string;
  tstamp: Date;
}

const TONE = "info";

const SystemAlarmTable: FC = () => {
  const { t } = useTranslation();

  const columns = useMemo<ColumnsType<SystemAlarmRecord>>(
    () => [
      {
        title: t("records.level"),
        dataIndex: "level",
        key: "level",
        width: 72,
        render: (level: number) => <IdTag $tone={TONE}>{level}</IdTag>,
      },
      {
        title: t("records.message"),
        dataIndex: "message",
        key: "message",
        // 後端用 | 把多段訊息串在一起,這裡一段一行
        render: (text: string) => (
          <RecordText>{text.split("|").join("|\n")}</RecordText>
        ),
      },
      {
        title: t("records.time"),
        dataIndex: "tstamp",
        key: "tstamp",
        width: 110,
        render: (date: Date) => <RecordTime value={date} />,
        sorter: (a, b) =>
          new Date(a.tstamp).getTime() - new Date(b.tstamp).getTime(),
        defaultSortOrder: "descend",
      },
    ],
    [t],
  );

  return (
    <RecordPanel<SystemAlarmRecord>
      tone={TONE}
      icon={<AlertOutlined />}
      title={t("records.system_alarm")}
      columns={columns}
      useHistory={useSystemAlarmHhistory}
      deleteUrl="/api/records/delete-all-system-alarm"
      exportUrl="/api/records/export-system-alarm"
      exportFileName="system_alarm_history"
    />
  );
};

export default SystemAlarmTable;
