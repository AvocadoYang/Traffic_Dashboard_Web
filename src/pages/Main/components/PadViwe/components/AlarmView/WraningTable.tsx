/* eslint-disable no-restricted-syntax */
import { FC, memo } from "react";
import { Table } from "antd";
import type { TableProps } from "antd";
import { nanoid } from "nanoid";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import useWarningTable from "@/api/useWarningTable";

interface DataType {
  key: string;
  level: number;
  Alarm_music: boolean;
  info: string;
  debug: string;
}

const getColumns = (t: TFunction): TableProps<DataType>["columns"] => [
  {
    title: t("file.warning_list.error_code"),
    dataIndex: "key",
    key: "errorNum",
    render: (key) => `#${key}`,
  },
  {
    title: t("file.warning_list.buzzer"),
    dataIndex: "Alarm_music",
    key: "ring",
    render: (ring) => (ring ? t("utils.yes") : t("utils.no")),
  },
  {
    title: t("file.warning_list.info"),
    dataIndex: "info",
    key: "error",
  },
  {
    title: t("file.warning_list.solution"),
    dataIndex: "debug",
    key: "solution",
    render: (sol) => (
      <p
        style={{
          fontWeight: "bold",
          color: "red",
        }}
      >
        {sol}
      </p>
    ),
  },
];

const WarningTable: FC = () => {
  const { data } = useWarningTable();
  const { t } = useTranslation();

  // console.log(data);

  // const warningArray: DataType[] = useMemo(() => {
  //   const rawData = { ...(data as WarningTableData) }
  //   const DataIndex = Object.keys(rawData)
  //   return Object.values(rawData).map((item, index) => {
  //     return { ...item, key: DataIndex[index] }
  //   })
  // }, [data])
  // if (!warningArray) return <></>
  return (
    <>
      <Table
        rowKey={() => nanoid()}
        columns={getColumns(t)}
        dataSource={[]}
        size="small"
        pagination={{ pageSize: 8 }}
      />
    </>
  );
};

export default memo(WarningTable);
