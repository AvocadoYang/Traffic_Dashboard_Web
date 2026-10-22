import { ReactNode, useState } from "react";
import { Button, DatePicker, Pagination, Popconfirm, Table, message } from "antd";
import { DeleteOutlined, DownloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useMutation } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";

const { RangePicker } = DatePicker;

// 三種紀錄各用一個語意色:系統告警跟著主題的強調色,警告黃、異常紅。
// 狀態色不跟主題的色相走(見 theme/palettes.ts),所以換主題後仍然分得出來。
export type RecordTone = "info" | "warning" | "danger";

const TONE: Record<RecordTone, { accent: string; soft: string; text: string }> =
  {
    info: {
      accent: "var(--c-header-accent)",
      soft: "var(--c-header-accent-soft)",
      text: "var(--c-header-accent)",
    },
    warning: {
      accent: "var(--c-warning)",
      soft: "var(--c-warning-soft)",
      // 黃字在白底上看不清楚,警告的字維持一般文字色,只用邊框跟底色表達
      text: "var(--c-text)",
    },
    danger: {
      accent: "var(--c-danger)",
      soft: "var(--c-danger-soft)",
      text: "var(--c-danger)",
    },
  };

// 外框跟首頁的 TitleBar / 車輛卡片同一套:1px 邊框 + 左側 4px 色條 + 淡陰影
const Panel = styled.section<{ $tone: RecordTone }>`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--c-bg);
  border: 1px solid var(--c-header-border);
  border-left: 4px solid ${({ $tone }) => TONE[$tone].accent};
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  font-family: "Roboto Mono", monospace;
  overflow: hidden;
`;

const PanelHead = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--c-bg-subtle);
  border-bottom: 1px solid var(--c-border);
`;

const TitleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  column-gap: var(--space-md);
  row-gap: 2px;
`;

const Title = styled.h2<{ $tone: RecordTone }>`
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin: 0;
  font-size: var(--font-md);
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--c-text);

  .anticon {
    color: ${({ $tone }) => TONE[$tone].accent};
  }
`;

const Meta = styled.div`
  font-size: var(--font-sm);
  color: var(--c-text-muted);
  white-space: nowrap;

  strong {
    font-weight: 600;
    color: var(--c-text);
  }
`;

// 日期區間佔滿剩下的寬度,按鈕放不下就換到下一行(窄面板 / 手機)
const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);

  .ant-picker {
    flex: 1 1 220px;
    min-width: 0;
  }
`;

const ToolbarButtons = styled.div`
  display: flex;
  gap: var(--space-sm);
  margin-left: auto;
`;

// 表格自己捲動,表頭黏在最上面,分頁固定在面板底部,
// 所以不管哪種螢幕,換頁鈕都不會被長長的清單推到看不見的地方。
const TableScroll = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  scrollbar-width: thin;

  .ant-table {
    background: transparent;
    font-family: "Roboto Mono", monospace;
  }

  .ant-table-thead > tr > th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--c-bg-subtle);
    border-bottom: 1px solid var(--c-header-border);
    color: var(--c-text-secondary);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    white-space: nowrap;

    &::before {
      display: none;
    }
  }

  .ant-table-tbody > tr > td {
    border-bottom: 1px solid var(--c-bg-muted);
    font-size: 12px;
    color: var(--c-text-secondary);
    vertical-align: top;
  }

  .ant-table-tbody > tr:hover > td {
    background: var(--c-header-accent-soft) !important;
  }
`;

const PanelFoot = styled.div`
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
  padding: var(--space-sm) var(--space-md);
  border-top: 1px solid var(--c-border);
  background: var(--c-bg-subtle);

  .ant-pagination {
    font-family: "Roboto Mono", monospace;
  }
`;

const Empty = styled.div`
  padding: 32px 12px;
  text-align: center;
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--c-text-muted);

  .anticon {
    display: block;
    margin-bottom: 12px;
    font-size: 32px;
    color: var(--c-border-strong);
  }
`;

// ── 給各個表格的欄位共用的小元件 ──

export const IdTag = styled.span<{ $tone: RecordTone }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  padding: 1px 8px;
  border: 1px solid ${({ $tone }) => TONE[$tone].accent};
  border-radius: 2px;
  background: ${({ $tone }) => TONE[$tone].soft};
  color: ${({ $tone }) => TONE[$tone].text};
  font-size: 11px;
  font-weight: 600;
  line-height: 1.6;
`;

export const RecordText = styled.span`
  color: var(--c-text);
  overflow-wrap: anywhere;
  white-space: pre-line;
`;

const TimeCell = styled.div`
  white-space: nowrap;
  line-height: 1.4;

  .date {
    color: var(--c-text);
    font-weight: 600;
  }

  .time {
    font-size: 11px;
    color: var(--c-text-muted);
  }
`;

export const RecordTime = ({ value }: { value: Date | undefined }) => {
  if (!value) return <>--</>;
  const d = dayjs(value);
  return (
    <TimeCell>
      <div className="date">{d.format("YYYY/MM/DD")}</div>
      <div className="time">{d.format("HH:mm:ss")}</div>
    </TimeCell>
  );
};

type HistoryResult<T> = {
  data?: { data: T[]; total: number; storageSizeMb: number };
  isLoading: boolean;
  refetch: () => unknown;
};

type RecordPanelProps<T> = {
  tone: RecordTone;
  icon: ReactNode;
  title: string;
  columns: ColumnsType<T>;
  // 分頁查詢的 hook(useWarningHistory 那一類),由面板帶入目前頁碼
  useHistory: (page: number, pageSize: number) => HistoryResult<T>;
  deleteUrl: string;
  exportUrl: string;
  // 匯出檔名的前綴,後面會接上日期區間
  exportFileName: string;
};

const RecordPanel = <T extends { id: string }>({
  tone,
  icon,
  title,
  columns,
  useHistory,
  deleteUrl,
  exportUrl,
  exportFileName,
}: RecordPanelProps<T>) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const { data, isLoading, refetch } = useHistory(currentPage, pageSize);

  const deleteMutation = useMutation({
    mutationFn: () => client.post(deleteUrl),
    onSuccess: () => {
      refetch();
      messageApi.success(t("utils.success"));
    },
  });

  // 匯出 Excel
  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!dateRange) {
        throw new Error(t("records.select_range_first") as string);
      }
      const [start, end] = dateRange;
      const res = await client.get(exportUrl, {
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
      link.download = `${exportFileName}_${start.format("YYYYMMDD")}_${end.format(
        "YYYYMMDD",
      )}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      messageApi.success(t("records.export_success"));
    },
    onError: (err: any) => {
      messageApi.error(err?.message || t("records.export_failed"));
    },
  });

  const total = data?.total ?? 0;

  return (
    <Panel $tone={tone}>
      {contextHolder}
      <PanelHead>
        <TitleRow>
          <Title $tone={tone}>
            {icon}
            {title}
          </Title>
          <Meta>
            <strong>{total.toLocaleString()}</strong> {t("records.unit")}
            {data?.storageSizeMb !== undefined && (
              <>
                {" · "}
                {data.storageSizeMb} MB
              </>
            )}
          </Meta>
        </TitleRow>
        <Toolbar>
          <RangePicker
            value={dateRange}
            onChange={(val) => setDateRange(val as [Dayjs, Dayjs] | null)}
            allowClear
          />
          <ToolbarButtons>
            <Button
              icon={<DownloadOutlined />}
              disabled={!dateRange}
              loading={exportMutation.isLoading}
              onClick={() => exportMutation.mutate()}
              title={
                dateRange
                  ? undefined
                  : (t("records.select_range_first") as string)
              }
            >
              {t("records.export_excel")}
            </Button>
            <Popconfirm
              onConfirm={() => deleteMutation.mutate()}
              title={t("records.delete_all_confirm")}
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={deleteMutation.isLoading}
              >
                {t("records.delete_all")}
              </Button>
            </Popconfirm>
          </ToolbarButtons>
        </Toolbar>
      </PanelHead>

      <TableScroll>
        <Table<T>
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={false}
          locale={{
            emptyText: (
              <Empty>
                {icon}
                {t("records.empty")}
              </Empty>
            ),
          }}
        />
      </TableScroll>

      <PanelFoot>
        <Pagination
          size="small"
          current={currentPage}
          pageSize={pageSize}
          total={total}
          showSizeChanger
          showLessItems
          pageSizeOptions={["10", "20", "50", "100"]}
          onChange={(page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          }}
        />
      </PanelFoot>
    </Panel>
  );
};

export default RecordPanel;
