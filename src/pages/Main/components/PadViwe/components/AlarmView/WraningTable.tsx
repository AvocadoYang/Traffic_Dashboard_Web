/* eslint-disable no-restricted-syntax */
import { FC, memo } from "react";
import { Table } from "antd";
import type { TableProps } from "antd";
import { nanoid } from "nanoid";
import useWarningTable from "@/api/useWarningTable";

interface DataType {
  key: string;
  level: number;
  Alarm_music: boolean;
  info: string;
  debug: string;
}

const columns: TableProps<DataType>["columns"] = [
  {
    title: "錯誤編號",
    dataIndex: "key",
    key: "errorNum",
    render: (key) => `#${key}`,
  },
  {
    title: "警報鈴",
    dataIndex: "Alarm_music",
    key: "ring",
    render: (ring) => (ring ? "是" : "否"),
  },
  {
    title: "錯誤原因",
    dataIndex: "info",
    key: "error",
  },
  {
    title: "排除方法",
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
        columns={columns}
        dataSource={[]}
        size="small"
        pagination={{ pageSize: 8 }}
      />
    </>
  );
};

export default memo(WarningTable);
