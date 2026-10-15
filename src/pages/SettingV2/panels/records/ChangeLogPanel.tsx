import { FC, useState } from "react";
import { DatePicker, Input, Modal, Pagination, Select, Skeleton, Switch, Table } from "antd";
import { DiffOutlined, HistoryOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import {
  PanelShell,
  Section,
  SectionTitle,
  Toolbar,
  GhostButton,
  Hint,
  EmptyState,
  CardList,
  ItemCard,
  CardTitleRow,
  CardFacts,
  Tag,
  WarnNote,
} from "../../ui/primitives";
import StatusTag from "../../ui/StatusTag";

const { RangePicker } = DatePicker;

type LogRow = {
  id: string;
  created_at: string;
  account: string | null;
  ip: string | null;
  client_name: string | null;
  method: string;
  path: string;
  category: string;
  action: string;
  target: string | null;
  status: number;
  ok: boolean;
  error: string | null;
  hasBefore: boolean;
  /** 改了哪些欄位 (有改前改後的才有) */
  changed: string[];
};

type LogList = { total: number; keepDays: number; recorded: boolean; rows: LogRow[] };

type LogDetail = Omit<LogRow, "changed"> & {
  body: unknown;
  before: unknown;
  after: unknown;
  changed: { field: string; before: unknown; after: unknown }[];
};

const CATEGORIES = [
  "point",
  "road",
  "zone",
  "map",
  "mission",
  "schedule",
  "idle_rule",
  "charge",
  "dispatch",
  "dispatch_board",
  "amr",
  "peripheral",
  "shelf",
  "cargo_format",
  "alarm",
  "system",
  "mir",
  "user",
  "maintenance",
  "other",
] as const;
type Category = (typeof CATEGORIES)[number];
const ACTIONS = ["create", "update", "delete", "import", "run", "stop", "backup", "restore", "other"] as const;
type Action = (typeof ACTIONS)[number];

const isCategory = (v: string): v is Category => (CATEGORIES as readonly string[]).includes(v);
const isAction = (v: string): v is Action => (ACTIONS as readonly string[]).includes(v);

const PAGE_SIZE = 20;

const show = (v: unknown): string =>
  v === undefined ? "" : v === null ? "null" : typeof v === "object" ? JSON.stringify(v) : String(v);

/**
 * 設定變更紀錄: 誰、什麼時候、從哪台電腦改了哪個設定, 成功與否; 常用的設定 (點位、路徑、
 * 區域、任務步驟、閒置規則、定時任務、充電、區域搬運、作業區、保養) 可以看改前改後。
 */
const ChangeLogPanel: FC = () => {
  const { t } = useTranslation();
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [
    dayjs().subtract(6, "day").startOf("day"),
    dayjs().endOf("day"),
  ]);
  const [account, setAccount] = useState<string | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  const [failedOnly, setFailedOnly] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);

  const params = {
    from: range[0].toISOString(),
    to: range[1].toISOString(),
    account,
    category,
    ok: failedOnly ? false : undefined,
    q: q.trim() || undefined,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["setting-change-log", params],
    queryFn: async () => (await client.get<LogList>("api/setting/change-log", { params })).data,
    keepPreviousData: true,
  });
  const { data: options } = useQuery({
    queryKey: ["setting-change-log-options"],
    queryFn: async () =>
      (await client.get<{ accounts: string[]; categories: string[] }>("api/setting/change-log/options")).data,
  });
  const { data: detail, isFetching: detailLoading } = useQuery({
    queryKey: ["setting-change-log-detail", detailId],
    queryFn: async () => (await client.get<LogDetail>(`api/setting/change-log/${detailId}`)).data,
    enabled: !!detailId,
  });

  const categoryLabel = (c: string) => (isCategory(c) ? t(`change_log.category.${c}`) : c);
  const actionLabel = (a: string) => (isAction(a) ? t(`change_log.action.${a}`) : a);
  const resetPage = () => setPage(1);

  return (
    <PanelShell>
      <Section>
        <SectionTitle>
          <HistoryOutlined />
          {t("change_log.title")}
        </SectionTitle>
        <Hint>{t("change_log.hint", { days: data?.keepDays ?? 180 })}</Hint>

        <Toolbar>
          <RangePicker
            value={range}
            allowClear={false}
            onChange={(v) => {
              if (v && v[0] && v[1]) {
                setRange([v[0].startOf("day"), v[1].endOf("day")]);
                resetPage();
              }
            }}
          />
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>
        <Toolbar>
          <Select
            allowClear
            style={{ minWidth: 140 }}
            placeholder={t("change_log.all_accounts")}
            value={account}
            onChange={(v) => {
              setAccount(v);
              resetPage();
            }}
            options={(options?.accounts ?? []).map((a) => ({ value: a, label: a }))}
          />
          <Select
            allowClear
            style={{ minWidth: 140 }}
            placeholder={t("change_log.all_categories")}
            value={category}
            onChange={(v) => {
              setCategory(v);
              resetPage();
            }}
            options={(options?.categories ?? []).map((c) => ({ value: c, label: categoryLabel(c) }))}
          />
          <Input.Search
            allowClear
            style={{ width: 180 }}
            placeholder={t("change_log.search")}
            onSearch={(v) => {
              setQ(v);
              resetPage();
            }}
          />
          <span>
            <Switch
              size="small"
              checked={failedOnly}
              onChange={(v) => {
                setFailedOnly(v);
                resetPage();
              }}
            />{" "}
            {t("change_log.failed_only")}
          </span>
        </Toolbar>

        {data && !data.recorded && <WarnNote>{t("change_log.not_recorded")}</WarnNote>}

        {isLoading ? (
          <Skeleton active />
        ) : !data || data.rows.length === 0 ? (
          <EmptyState>{t("change_log.empty")}</EmptyState>
        ) : (
          <CardList>
            {data.rows.map((row) => (
              <ItemCard key={row.id}>
                <CardTitleRow>
                  <span>
                    {categoryLabel(row.category)} · {actionLabel(row.action)}
                    {row.target ? ` · ${row.target}` : ""}
                  </span>
                  <StatusTag $on={row.ok}>{row.ok ? t("change_log.ok") : t("change_log.failed")}</StatusTag>
                </CardTitleRow>
                <CardFacts>
                  <dt>{t("change_log.when")}</dt>
                  <dd>{dayjs(row.created_at).format("YYYY-MM-DD HH:mm:ss")}</dd>
                  <dt>{t("change_log.who")}</dt>
                  <dd>
                    {row.account ?? t("change_log.no_account")}
                    {row.client_name ? ` · ${row.client_name}` : ""}
                    {row.ip ? ` · ${row.ip}` : ""}
                  </dd>
                  {row.changed.length > 0 && (
                    <>
                      <dt>{t("change_log.changed")}</dt>
                      <dd>
                        {row.changed.slice(0, 8).map((f) => (
                          <Tag key={f}>{f}</Tag>
                        ))}
                        {row.changed.length > 8 ? ` …(${row.changed.length})` : ""}
                      </dd>
                    </>
                  )}
                  {!row.ok && row.error && (
                    <>
                      <dt>{t("change_log.error")}</dt>
                      <dd>{row.error}</dd>
                    </>
                  )}
                </CardFacts>
                <Toolbar>
                  <GhostButton onClick={() => setDetailId(row.id)}>
                    <DiffOutlined />
                    {row.hasBefore ? t("change_log.view_diff") : t("change_log.view_body")}
                  </GhostButton>
                </Toolbar>
              </ItemCard>
            ))}
          </CardList>
        )}

        {data && data.total > PAGE_SIZE && (
          <Pagination
            size="small"
            current={page}
            pageSize={PAGE_SIZE}
            total={data.total}
            showSizeChanger={false}
            onChange={setPage}
            showTotal={(total) => t("utils.total", { total })}
          />
        )}
      </Section>

      <Modal
        open={!!detailId}
        title={t("change_log.detail_title")}
        onCancel={() => setDetailId(null)}
        footer={null}
        width={720}
        destroyOnHidden
      >
        {detailLoading || !detail ? (
          <Skeleton active />
        ) : (
          <>
            <CardFacts>
              <dt>{t("change_log.request")}</dt>
              <dd>
                {detail.method} /api{detail.path} → {detail.status}
              </dd>
              {detail.error && (
                <>
                  <dt>{t("change_log.error")}</dt>
                  <dd>{detail.error}</dd>
                </>
              )}
            </CardFacts>
            {detail.changed.length > 0 && (
              <Table
                size="small"
                rowKey="field"
                pagination={false}
                dataSource={detail.changed}
                columns={[
                  { title: t("change_log.field"), dataIndex: "field", width: 160 },
                  { title: t("change_log.before"), dataIndex: "before", render: (v: unknown) => show(v) },
                  { title: t("change_log.after"), dataIndex: "after", render: (v: unknown) => show(v) },
                ]}
              />
            )}
            {detail.hasBefore && detail.changed.length === 0 && detail.ok && (
              <Hint>{detail.after === null ? t("change_log.deleted") : t("change_log.no_change")}</Hint>
            )}
            <Hint>{t("change_log.body")}</Hint>
            <pre style={{ maxHeight: 240, overflow: "auto", fontSize: 12 }}>
              {JSON.stringify(detail.body, null, 2)}
            </pre>
            {detail.hasBefore && (
              <>
                <Hint>{t("change_log.before_full")}</Hint>
                <pre style={{ maxHeight: 240, overflow: "auto", fontSize: 12 }}>
                  {JSON.stringify(detail.before, null, 2)}
                </pre>
              </>
            )}
          </>
        )}
      </Modal>
    </PanelShell>
  );
};

export default ChangeLogPanel;
