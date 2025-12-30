import { FC, useState } from "react";
import styled from "styled-components";
import { Table, Flex, message, Popconfirm } from "antd";
import { WarningOutlined, DatabaseOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import useAlarmHistory from "@/api/useAlarmHistory";

// Industrial Style Components
const IndustrialContainer = styled.div`
  background: #f5f5f5;
  min-height: 100vh;
  padding: 20px;
  font-family: "Roboto Mono", "Courier New", monospace;
`;

const StatusBar = styled.div`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-left: 4px solid #ff4d4f;
  padding: 12px 16px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: "Roboto Mono", monospace;
  color: #ff4d4f;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const SectionHeader = styled.div`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-left: 3px solid #ff4d4f;
  padding: 10px 16px;
  margin-bottom: 16px;
  font-family: "Roboto Mono", monospace;
  color: #ff4d4f;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
`;

const IndustrialCard = styled.div`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  margin-bottom: 20px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

  &:hover {
    border-color: #bfbfbf;
  }
`;

const MetricDisplay = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: #fafafa;
  border: 1px solid #d9d9d9;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  color: #ff4d4f;

  .label {
    color: #8c8c8c;
    text-transform: uppercase;
    font-size: 10px;
  }

  .value {
    color: #ff4d4f;
    font-weight: 600;
  }
`;

const WarningIdTag = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  background: #fff1f0;
  border: 1px solid #ff4d4f;
  color: #ff4d4f;
  font-size: 11px;
  font-weight: 700;
  font-family: "Roboto Mono", monospace;
  letter-spacing: 1px;
  box-shadow: 0 1px 4px rgba(255, 77, 79, 0.15);
`;

const WarningIdDesc = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  color: #6e6e6e;
  font-size: 11px;
  font-weight: 700;
  font-family: "Roboto Mono", monospace;
  letter-spacing: 1px;
`;

const TimeDisplay = styled.div`
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  color: #595959;

  .date {
    color: #262626;
    font-weight: 600;
    margin-bottom: 2px;
  }

  .time {
    color: #8c8c8c;
    font-size: 10px;
  }
`;

const StyledTable = styled(Table)`
  .ant-table {
    background: transparent;
    font-family: "Roboto Mono", monospace;
  }

  .ant-table-thead > tr > th {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    color: #262626;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 11px;
    padding: 12px 16px;
    font-family: "Roboto Mono", monospace;

    &::before {
      display: none;
    }
  }

  .ant-table-tbody > tr {
    transition: all 0.2s ease;

    &:hover > td {
      background: #f0f5ff !important;
    }

    > td {
      border-bottom: 1px solid #f0f0f0;
      padding: 12px 16px;
      font-family: "Roboto Mono", monospace;
    }
  }

  .ant-table-tbody > tr:nth-child(odd) > td {
    background: #fafafa;
  }

  .ant-pagination {
    font-family: "Roboto Mono", monospace;

    .ant-pagination-item {
      border: 1px solid #d9d9d9;
      font-family: "Roboto Mono", monospace;

      &:hover {
        border-color: #ff4d4f;
      }

      &.ant-pagination-item-active {
        background: #ff4d4f;
        border-color: #ff4d4f;

        a {
          color: #ffffff;
        }
      }
    }

    .ant-pagination-prev,
    .ant-pagination-next {
      .ant-pagination-item-link {
        border: 1px solid #d9d9d9;
        font-family: "Roboto Mono", monospace;

        &:hover {
          border-color: #ff4d4f;
          color: #ff4d4f;
        }
      }
    }
  }

  .ant-empty {
    .ant-empty-description {
      font-family: "Roboto Mono", monospace;
      color: #8c8c8c;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 11px;
    }
  }
`;

const EmptyStateContainer = styled.div`
  padding: 60px 20px;
  text-align: center;

  .empty-icon {
    font-size: 64px;
    color: #d9d9d9;
    margin-bottom: 16px;
  }

  .empty-text {
    font-family: "Roboto Mono", monospace;
    color: #8c8c8c;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-size: 12px;
  }
`;

interface WarningRecord {
  id: string;
  alarm_id: number;
  createdAt: Date;
  alarm: {
    info_ch: string;
  };
}

const AlarmTable: FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [messageApi, contextHolder] = message.useMessage();
  const { data, isLoading, refetch } = useAlarmHistory(currentPage, pageSize);

  const deleteMutation = useMutation({
    mutationFn: () => {
      return client.post("/api/records/delete-all-alarm");
    },
    onSuccess: () => {
      refetch();
      messageApi.info("nice");
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  // Calculate total storage size
  const totalStorageMb = data?.storageSizeMb;

  const formatDateTime = (date: Date) => {
    const d = new Date(date);
    const dateStr = d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return { dateStr, timeStr };
  };

  const columns: ColumnsType<WarningRecord> = [
    {
      title: "Alarm ID",
      dataIndex: "alarm_id",
      key: "alarm_id",
      width: 70,
      render: (warningId: number) => <WarningIdTag>{warningId}</WarningIdTag>,
    },
    {
      title: "Description ID",
      dataIndex: "Description",
      key: "Description",
      width: 180,
      render: (warningId: number, record) => (
        <WarningIdDesc>{record.alarm.info_ch}</WarningIdDesc>
      ),
    },
    {
      title: "Timestamp",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 220,
      render: (date: Date) => {
        const { dateStr, timeStr } = formatDateTime(date);
        return (
          <TimeDisplay>
            <div className="date">{dateStr}</div>
            <div className="time">{timeStr}</div>
          </TimeDisplay>
        );
      },
      sorter: (a: WarningRecord, b: WarningRecord) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: "descend",
    },
  ];

  return (
    <>
      {contextHolder}

      <IndustrialContainer>
        {/* Status Bar */}
        <StatusBar>
          <Flex gap={"middle"}>
            <Flex align="center" gap="middle">
              <WarningOutlined style={{ fontSize: 16 }} />
              <span style={{ fontWeight: 600 }}>ALARM HISTORY</span>
            </Flex>
            <Flex gap="middle">
              <Popconfirm
                onConfirm={() => handleDelete()}
                title={"are your sure"}
              >
                <MetricDisplay>
                  <span className="label">DELETE ALL</span>
                </MetricDisplay>
              </Popconfirm>

              <MetricDisplay>
                <span className="label">TOTAL:</span>
                <span className="value">{data?.total || 0}</span>
              </MetricDisplay>
              <MetricDisplay>
                <span className="label">STORAGE:</span>
                <span className="value">{totalStorageMb} MB</span>
              </MetricDisplay>
              <MetricDisplay>
                <span className="label">PAGE:</span>
                <span className="value">{currentPage}</span>
              </MetricDisplay>
            </Flex>
          </Flex>
        </StatusBar>

        {/* Main Table Card */}
        <IndustrialCard>
          <SectionHeader>
            <DatabaseOutlined />
            [01] Alarm RECORDS DATABASE
          </SectionHeader>

          <StyledTable
            columns={columns as any}
            dataSource={data?.data || []}
            rowKey="id"
            loading={isLoading}
            size="small"
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: data?.total || 0,
              showSizeChanger: true,
              showTotal: (total) => (
                <span
                  style={{
                    fontFamily: '"Roboto Mono", monospace',
                    fontSize: 11,
                    color: "#595959",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Total: {total} Records
                </span>
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

export default AlarmTable;
