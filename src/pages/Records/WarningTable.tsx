import { FC, useMemo } from "react";
import { WarningOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";
import useWarningHistory from "@/api/useWarningHistory";
import RecordPanel, { IdTag, RecordText, RecordTime } from "./RecordPanel";

interface WarningRecord {
  id: string;
  warning_id: number;
  createdAt: Date;
  warning: { info_ch: string };
}

const TONE = "warning";

const WarningTable: FC = () => {
  const { t } = useTranslation();

  const columns = useMemo<ColumnsType<WarningRecord>>(
    () => [
      {
        title: t("records.warning_id"),
        dataIndex: "warning_id",
        key: "warning_id",
        width: 72,
        render: (id: number) => <IdTag $tone={TONE}>{id}</IdTag>,
      },
      {
        title: t("records.description"),
        key: "description",
        render: (_: unknown, record) => (
          <RecordText>{record.warning.info_ch}</RecordText>
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
    <RecordPanel<WarningRecord>
      tone={TONE}
      icon={<WarningOutlined />}
      title={t("records.warning")}
      columns={columns}
      useHistory={useWarningHistory}
      deleteUrl="/api/records/delete-all-warning"
      exportUrl="/api/records/export-warning"
      exportFileName="warning_history"
    />
  );
};

export default WarningTable;
