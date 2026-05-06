import { FC, useState } from "react";
import { message, Popconfirm } from "antd";
import { WarningOutlined, DatabaseOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import useAlarmHistory from "@/api/useAlarmHistory";
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

const ACCENT = "#ff4d4f";
const TAG_BG = "#fff1f0";

interface WarningRecord {
  id: string;
  alarm_id: number;
  createdAt: Date;
  alarm: { info_ch: string };
}

const AlarmTable: FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [messageApi, contextHolder] = message.useMessage();
  const { data, isLoading, refetch } = useAlarmHistory(currentPage, pageSize);

  const deleteMutation = useMutation({
    mutationFn: () => client.post("/api/records/delete-all-alarm"),
    onSuccess: () => {
      refetch();
      messageApi.info("nice");
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
      title: "Alarm ID",
      dataIndex: "alarm_id",
      key: "alarm_id",
      width: 80,
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
      render: (_: unknown, record) => <IdDesc>{record.alarm.info_ch}</IdDesc>,
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
            ALARM HISTORY
          </StatusBarTitle>
          <MetricsRow>
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
            [01] ALARM RECORDS DATABASE
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
                  <div className="empty-text">[ No Alarm Records Found ]</div>
                </EmptyStateContainer>
              ),
            }}
          />
        </IndustrialCard>
      </IndustrialContainer>
    </>
  );
};

export default AlarmTable;
