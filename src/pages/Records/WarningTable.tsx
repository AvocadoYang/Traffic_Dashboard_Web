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
import useWarningHistory from "@/api/useWarningHistory";
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

const ACCENT = "#ffa641";
const TAG_BG = "#fff8f0";

interface WarningRecord {
  id: string;
  warning_id: number;
  createdAt: Date;
  warning: { info_ch: string };
}

const WarningTable: FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const { data, isLoading, refetch } = useWarningHistory(currentPage, pageSize);

  const deleteMutation = useMutation({
    mutationFn: () => client.post("/api/records/delete-all-warning"),
    onSuccess: () => {
      refetch();
      messageApi.info("nice");
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!dateRange) {
        throw new Error("請先選擇時間區間");
      }
      const [start, end] = dateRange;
      const res = await client.get("/api/records/export-warning", {
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
      link.download = `warning_history_${start.format("YYYYMMDD")}_${end.format(
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

  const columns: ColumnsType<WarningRecord> = [
    {
      title: "Warning ID",
      dataIndex: "warning_id",
      key: "warning_id",
      width: 90,
      render: (id: number) => (
        <IdTag $accent={ACCENT} $bg={TAG_BG}>
          {id}
        </IdTag>
      ),
    },
    {
      title: "Description",
      dataIndex: "Description",
      key: "Description",
      render: (_: unknown, record) => <IdDesc>{record.warning.info_ch}</IdDesc>,
    },
    {
      title: "Timestamp",
      dataIndex: "createdAt",
      key: "createdAt",
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
      sorter: (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
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
            WARNING HISTORY
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
            [01] WARNING RECORDS DATABASE
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
                  <div className="empty-text">[ No Warning Records Found ]</div>
                </EmptyStateContainer>
              ),
            }}
          />
        </IndustrialCard>
      </IndustrialContainer>
    </>
  );
};

export default WarningTable;