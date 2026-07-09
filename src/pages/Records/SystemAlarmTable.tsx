import { FC, useState } from "react";
import { message, Popconfirm, DatePicker, Button } from "antd";
import {
  WarningOutlined,
  DatabaseOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useMutation } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import client from "@/api/axiosClient";
import useSystemAlarmHhistory from "@/api/useSystemAlarmHhistory";
import { SystemAlarmData } from "@/sockets/useSystemAlarm";
import {
  IndustrialContainer,
  IndustrialCard,
  StatusBar,
  StatusBarTitle,
  MetricsRow,
  SectionHeader,
  MetricDisplay,
  IdTag,
  IdDesc,
  TimeDisplay,
  StyledTable,
  EmptyStateContainer,
  paginationTotalStyle,
} from "./industrialStyles";

const { RangePicker } = DatePicker;

const ACCENT = "#1890ff";
const TAG_BG = "#e6f7ff";

const SystemAlarmTable: FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const { data, isLoading, refetch } = useSystemAlarmHhistory(
    currentPage,
    pageSize,
  );

  const deleteMutation = useMutation({
    mutationFn: () => client.post("/api/records/delete-all-system-alarm"),
    onSuccess: () => {
      refetch();
      messageApi.info("nice");
    },
  });

  // 匯出 Excel
  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!dateRange) {
        throw new Error("請先選擇時間區間");
      }
      const [start, end] = dateRange;
      const res = await client.get("/api/records/export-system-alarm", {
        params: {
          start: start.startOf("day").toISOString(),
          end: end.endOf("day").toISOString(),
        },
        responseType: "blob",
      });
      return res.data as Blob;
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const [start, end] = dateRange!;
      link.href = url;
      link.download = `system_alarm_history_${start.format("YYYYMMDD")}_${end.format(
        "YYYYMMDD",
      )}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      messageApi.success("匯出成功");
    },
    onError: (err: any) => {
      messageApi.error(err?.message || "匯出失敗");
    },
  });

  const formatDateTime = (date: Date) => {
    const d = new Date(date);
    return {
      dateStr: d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
      timeStr: d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    };
  };

  const columns: ColumnsType<SystemAlarmData> = [
    {
      title: "Level",
      dataIndex: "level",
      key: "level",
      width: 80,
      render: (level: number) => (
        <IdTag $accent={ACCENT} $bg={TAG_BG}>
          {level}
        </IdTag>
      ),
    },
    {
      title: "Message",
      dataIndex: "message",
      key: "message",
      render: (text: string) => (
        <IdDesc style={{ whiteSpace: "pre-line", display: "block" }}>
          {text.split("|").join("|\n")}
        </IdDesc>
      ),
    },
    {
      title: "Timestamp",
      dataIndex: "tstamp",
      key: "tstamp",
      width: 140,
      render: (date: Date) => {
        const { dateStr, timeStr } = formatDateTime(date);
        return (
          <TimeDisplay>
            <div className="date">{dateStr}</div>
            <div className="time">{timeStr}</div>
          </TimeDisplay>
        );
      },
      sorter: (a: SystemAlarmData, b: SystemAlarmData) =>
        (a.tstamp as Date).getTime() - (b.tstamp as Date).getTime(),
      defaultSortOrder: "descend",
    },
  ];

  return (
    <>
      {contextHolder}
      <IndustrialContainer>
        <StatusBar $accent={ACCENT}>
          <StatusBarTitle>
            <WarningOutlined style={{ fontSize: 16 }} />
            SYSTEM ALARM HISTORY
          </StatusBarTitle>
          <MetricsRow>
            <RangePicker
              value={dateRange}
              onChange={(val) => setDateRange(val as [Dayjs, Dayjs] | null)}
              allowClear
              style={{ marginRight: 8 }}
            />
            <Button
              icon={<DownloadOutlined />}
              disabled={!dateRange}
              loading={exportMutation.isPending}
              onClick={() => exportMutation.mutate()}
              style={{ marginRight: 8 }}
            >
              匯出 Excel
            </Button>
            <Popconfirm
              onConfirm={() => deleteMutation.mutate()}
              title="Are you sure?"
            >
              <MetricDisplay $accent={ACCENT}>
                <span className="label">DELETE ALL</span>
              </MetricDisplay>
            </Popconfirm>
            <MetricDisplay $accent={ACCENT}>
              <span className="label">TOTAL:</span>
              <span className="value">{data?.total ?? 0}</span>
            </MetricDisplay>
            <MetricDisplay $accent={ACCENT}>
              <span className="label">STORAGE:</span>
              <span className="value">{data?.storageSizeMb} MB</span>
            </MetricDisplay>
            <MetricDisplay $accent={ACCENT}>
              <span className="label">PAGE:</span>
              <span className="value">{currentPage}</span>
            </MetricDisplay>
          </MetricsRow>
        </StatusBar>

        <IndustrialCard>
          <SectionHeader $accent={ACCENT}>
            <DatabaseOutlined />
            [01] SYSTEM ALARM RECORDS DATABASE
          </SectionHeader>
          <StyledTable
            $accent={ACCENT}
            columns={columns as any}
            dataSource={data?.data || []}
            rowKey="id"
            loading={isLoading}
            size="small"
            scroll={{ x: "max-content" }}
            pagination={{
              current: currentPage,
              pageSize,
              total: data?.total || 0,
              showSizeChanger: true,
              showTotal: (total) => (
                <span style={paginationTotalStyle}>Total: {total} Records</span>
              ),
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              },
              pageSizeOptions: ["10", "20", "50", "100"],
            }}
            locale={{
              emptyText: (
                <EmptyStateContainer>
                  <div className="empty-icon">
                    <WarningOutlined />
                  </div>
                  <div className="empty-text">
                    [ No System Alarm Records Found ]
                  </div>
                </EmptyStateContainer>
              ),
            }}
          />
        </IndustrialCard>
      </IndustrialContainer>
    </>
  );
};

export default SystemAlarmTable;