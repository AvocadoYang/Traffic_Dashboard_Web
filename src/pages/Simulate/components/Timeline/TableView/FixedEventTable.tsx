import { Mission_Schedule } from "@/sockets/useTimelineScheduleSocket";
import { Typography, Tag, Flex, Button, Switch, Popconfirm, Table } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { Local_Table_Value } from "./type";

const { Text } = Typography;

interface FixedEventTableProps {
  dataSource: Local_Table_Value[] | undefined;
  onEdit: (id: string) => void;
  onEnable: (id: string, isEnable: boolean) => void;
  onRemove: (id: string, time: string) => void;
  rowSelection: any;
  scheduleData: Mission_Schedule[];
}

const FixedEventTable: React.FC<FixedEventTableProps> = ({
  dataSource,
  onEdit,
  onEnable,
  onRemove,
  rowSelection,
  scheduleData,
}) => {
  const { t } = useTranslation();

  const getScheduleRecord = (id: string): Mission_Schedule | undefined => {
    return scheduleData.find((v) => v.id === id);
  };

  const columns = [
    {
      title: t("sim.insert_modal.time"),
      dataIndex: "time",
      key: "time",
      render: (time: string) => (
        <Text code style={{ color: "#1890ff" }}>
          {time}
        </Text>
      ),
      sorter: (a: Local_Table_Value, b: Local_Table_Value) =>
        dayjs(a.time, "HH:mm").unix() - dayjs(b.time, "HH:mm").unix(),
      defaultSortOrder: "ascend" as const,
    },
    {
      title: t("sim.insert_modal.type"),
      dataIndex: "type",
      sorter: (a: Local_Table_Value, b: Local_Table_Value) =>
        a.type.localeCompare(b.type),
      key: "type",
      render: (type: string) => {
        let label = type;
        let tagColor = "default";
        switch (type) {
          case "MISSION":
            label = t("sim.insert_modal.mission");
            tagColor = "blue";
            break;
          case "SPAWN_CARGO":
            label = t("sim.insert_modal.spawn_cargo");
            tagColor = "green";
            break;
          case "SHIFT_CARGO":
            label = t("sim.insert_modal.shift_cargo");
            tagColor = "orange";
            break;
        }
        return (
          <Tag color={tagColor} style={{ borderRadius: "12px" }}>
            {label}
          </Tag>
        );
      },
    },
    {
      title: t("sim.table_schedule.detail"),
      dataIndex: "detail",
      key: "detail",
    },
    {
      title: t("utils.action"),
      key: "actions",
      render: (_: any, record: Local_Table_Value) => {
        const scheduleRecord = getScheduleRecord(record.id);

        return (
          <Flex gap="middle">
            <Button size="small" onClick={() => onEdit(record.id)}>
              {t("utils.edit")}
            </Button>

            {scheduleRecord && (
              <Switch
                checkedChildren="ON"
                unCheckedChildren="OFF"
                onClick={() => onEnable(record.id, !scheduleRecord.isEnable)}
                checked={scheduleRecord.isEnable}
              />
            )}

            <Popconfirm
              title="are you sure?"
              onConfirm={() => onRemove(record.id, record.time)}
            >
              <Button size="small" danger>
                {t("utils.delete")}
              </Button>
            </Popconfirm>
          </Flex>
        );
      },
    },
  ];

  return (
    <Table
      rowSelection={{ type: "checkbox", ...rowSelection }}
      columns={columns}
      dataSource={dataSource}
      rowKey={(record: Local_Table_Value) =>
        record.id ?? `${record.time}-${record.detail}`
      }
      scroll={{ x: 1000 }}
      pagination={false}
    />
  );
};

export default FixedEventTable;
