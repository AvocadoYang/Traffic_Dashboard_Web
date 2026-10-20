import useCargoHistory from "@/api/useCargoHistory";
import {
  Typography,
  Table,
  Tag,
  Flex,
  Card,
  Input,
  Alert,
  Tooltip,
  Select,
  DatePicker,
  Switch,
  Statistic,
  Row,
  Col,
} from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import moment from "moment";
import { FC, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import ReactJsonView from "@uiw/react-json-view";
import { Button } from "antd";
import { useTranslation } from "react-i18next";
import useSearchCargoMetadata from "@/api/useSearchCargoMetadata";
import { useReverifyCargoFormat } from "@/hooks/useReverifyCargoFormat";
import MissionDetailModal from "@/components/MissionDetail/MissionDetailModal";

const { Text } = Typography;

const PageContainer = styled.div`
  padding: 24px;
  background-color: var(--c-bg-subtle);
`;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
`;

const StyledTable = styled(Table)`
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const MetaCard = styled(Card)`
  width: 30%;
  min-height: 100%;
`;

const HisCard = styled(Card)`
  width: 70%;
  min-height: 100%;
`;

const HistoryItem = styled.div`
  padding: 8px 0 8px 12px;
  border-left: 2px solid var(--c-border, #d9d9d9);
  margin-bottom: 4px;
`;

const NoDefine = styled.span`
  margin: 0;
  font-size: 1.5em;
  font-weight: 600;
  color: #a4a4a4;
`;

type CargoData = {
  id: string;
  status: string;
  custom_id: string | null;
  metadata: string | null;
  createdAt: Date;
  register_robot?: { id: string };
  ShelfConfig?: { id: string };
  custom_cargo_metadata?: { custom_name: string };
  history: {
    id: string;
    action: string;
    description?: string;
    actor?: string;
    mission_id?: string | null;
    amr_id?: string | null;
    location?: string | null;
    timestamp: string;
  }[];
};

export enum CargoCurrentStatus {
  ON_AMR = "ON_AMR",
  AT_LOCATION = "AT_LOCATION",
  SHIFT = "SHIFT",
  PRE_SPAWN = "PRE_SPAWN",
}

export enum CargoAction {
  CREATED = "CREATED",
  TRANSFER = "TRANSFER",
  LOAD = "LOAD",
  OFFLOAD = "OFFLOAD",
  SHIFTED = "SHIFTED",
  UPDATED = "UPDATED",
}

const AUTO_REFRESH_MS = 30000;

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const lastHistory = (r: CargoData) =>
  [...(r.history || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];

const HistoryTable: FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [metadataSearch, setMetadataSearch] = useState("");
  // 任務 ID 是後端篩選, 跨頁都找得到 (其他篩選只作用在目前載入的這一頁)
  const [missionFilter, setMissionFilter] = useState("");
  const { data, refetch, isFetching } = useCargoHistory(
    currentPage,
    pageSize,
    missionFilter.trim() || undefined
  );
  const { data: searchData } = useSearchCargoMetadata(metadataSearch);

  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [actionFilter, setActionFilter] = useState<string | undefined>();
  const [range, setRange] = useState<[number, number] | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [missionId, setMissionId] = useState<string | null>(null);

  const { t } = useTranslation();

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => refetch(), AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [autoRefresh, refetch]);

  const baseRows: CargoData[] = (
    metadataSearch ? searchData?.data || [] : data?.data || []
  ) as any;

  // 後端分頁, 篩選只作用在目前載入的這一頁(或搜尋結果)
  const rows = useMemo(
    () =>
      baseRows.filter((r) => {
        if (statusFilter && r.status !== statusFilter) return false;
        if (actionFilter && !r.history?.some((h) => h.action === actionFilter))
          return false;
        if (range) {
          const ts = new Date(r.createdAt).getTime();
          if (ts < range[0] || ts > range[1]) return false;
        }
        return true;
      }),
    [baseRows, statusFilter, actionFilter, range]
  );

  const hasFilter = !!(
    statusFilter ||
    actionFilter ||
    range ||
    metadataSearch ||
    missionFilter
  );
  const resetFilters = () => {
    setStatusFilter(undefined);
    setActionFilter(undefined);
    setRange(null);
    setMetadataSearch("");
    setMissionFilter("");
    setCurrentPage(1);
  };

  const countBy = (st: CargoCurrentStatus) =>
    baseRows.filter((r) => r.status === st).length;
  const undefinedCount = baseRows.filter((r) => !r.custom_cargo_metadata).length;

  const exportCsv = () => {
    const head = [
      t("cargo_history.cargoId"),
      "ID",
      t("cargo_history.status"),
      t("cargo_history.customFormat"),
      t("cargo_history.metadata"),
      t("cargo_history.last_action"),
      t("cargo_history.createdAt"),
    ];
    const lines = rows.map((r) => {
      const last = lastHistory(r);
      return [
        r.custom_id,
        r.id,
        r.status,
        r.custom_cargo_metadata?.custom_name,
        r.metadata && r.metadata !== "null"
          ? typeof r.metadata === "string"
            ? r.metadata
            : JSON.stringify(r.metadata)
          : "",
        last ? `${last.action} ${moment(last.timestamp).format("YYYY-MM-DD HH:mm:ss")}` : "",
        moment(r.createdAt).format("YYYY-MM-DD HH:mm:ss"),
      ]
        .map(csvCell)
        .join(",");
    });
    const blob = new Blob(["\uFEFF" + [head.map(csvCell).join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cargo-history-${moment().format("YYYYMMDD-HHmmss")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { mutate, isPending, contextHolder } = useReverifyCargoFormat(refetch);

  const reVerityCargoFormat = (cargoInfoId: string) => {
    mutate(cargoInfoId);
  };

  const getActionColor = (action: CargoAction): string => {
    switch (action) {
      case CargoAction.CREATED:
        return "blue";
      case CargoAction.TRANSFER:
        return "magenta";
      case CargoAction.LOAD:
        return "gold";
      case CargoAction.OFFLOAD:
        return "green";
      case CargoAction.SHIFTED:
        return "default";
      case CargoAction.UPDATED:
        return "purple";
      default:
        return "default";
    }
  };

  const columns = [
    {
      title: t("cargo_history.cargoId"),
      dataIndex: "custom_id",
      key: "custom_id",
      render: (record: string) =>
        record ? (
          <Text code copyable={{ text: record }}>
            {record.length > 10 ? `${record.slice(0, 10)}...` : record}
          </Text>
        ) : (
          "-"
        ),
    },
    {
      title: t("cargo_history.status"),
      dataIndex: "status",
      key: "status",
      render: (status: CargoCurrentStatus) => {
        switch (status) {
          case CargoCurrentStatus.ON_AMR:
            return <Tag color="yellow">{status}</Tag>;
          case CargoCurrentStatus.AT_LOCATION:
            return <Tag color="green">{status}</Tag>;
          case CargoCurrentStatus.SHIFT:
            return <Tag>{status}</Tag>;
          case CargoCurrentStatus.PRE_SPAWN:
            return <Tag color="cyan">{status}</Tag>;
          default:
            return <Tag>{status}</Tag>;
        }
      },
    },
    {
      title: t("cargo_history.customFormat"),
      dataIndex: ["custom_cargo_metadata", "custom_name"],
      key: "custom_cargo_metadata",
      render: (name: string | undefined) => name || "-",
    },
    {
      title: t("cargo_history.metadata"),
      dataIndex: "metadata",
      key: "metadata",
      render: (meta: string | null) => {
        try {
          const parsed = meta ? meta : {};
          return (
            <pre style={{ fontSize: 12 }}>
              {JSON.stringify(parsed, null, 0)?.slice(0, 8) || ""}...
            </pre>
          );
        } catch (e) {
          return <Text type="secondary">{t("cargo_history.invalid_json")}</Text>;
        }
      },
    },
    {
      title: t("cargo_history.last_action"),
      key: "last_action",
      render: (_v: unknown, record: CargoData) => {
        const last = lastHistory(record);
        if (!last) return "-";
        return (
          <Tooltip title={last.description || undefined}>
            <Flex gap="small" align="center">
              <Tag style={{ margin: 0 }} color={getActionColor(last.action as CargoAction)}>
                {last.action}
              </Tag>
              <Text type="secondary">{moment(last.timestamp).fromNow()}</Text>
            </Flex>
          </Tooltip>
        );
      },
    },
    {
      title: t("cargo_history.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: (a: CargoData, b: CargoData) =>
        moment(a.createdAt).unix() - moment(b.createdAt).unix(),
      render: (_v: string, record: CargoData) =>
        new Date(record.createdAt).toLocaleString(),
    },
  ];

  return (
    <>
      {contextHolder}
      <PageContainer>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {[
            { label: t("cargo_history.total"), value: data?.total ?? 0 },
            { label: "ON_AMR", value: countBy(CargoCurrentStatus.ON_AMR) },
            { label: "AT_LOCATION", value: countBy(CargoCurrentStatus.AT_LOCATION) },
            { label: "PRE_SPAWN", value: countBy(CargoCurrentStatus.PRE_SPAWN) },
            { label: t("cargo_history.undefined_format"), value: undefinedCount },
          ].map((it) => (
            <Col key={it.label} xs={12} md={8} xl={4}>
              <Card size="small">
                <Statistic title={it.label} value={it.value} />
              </Card>
            </Col>
          ))}
        </Row>
        <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
          {t("cargo_history.stats_hint", { count: baseRows.length })}
        </Text>
        <HeaderContainer style={{ flexWrap: "wrap", gap: 8 }}>
          <Flex gap="small" wrap>
            <Select
              allowClear
              placeholder={t("cargo_history.status")}
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 160 }}
              options={Object.values(CargoCurrentStatus).map((v) => ({
                value: v,
                label: v,
              }))}
            />
            <Select
              allowClear
              placeholder={t("cargo_history.action_filter")}
              value={actionFilter}
              onChange={setActionFilter}
              style={{ width: 160 }}
              options={Object.values(CargoAction).map((v) => ({
                value: v,
                label: v,
              }))}
            />
            <DatePicker.RangePicker
              showTime
              onChange={(v) =>
                setRange(
                  v && v[0] && v[1] ? [v[0].valueOf(), v[1].valueOf()] : null
                )
              }
            />
            <Input
              placeholder={t("cargo_history.filter_mission")}
              value={missionFilter}
              onChange={(e) => {
                setMissionFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: 280 }}
              allowClear
            />
            <Input
              placeholder={t("cargo_history.search_metadata")}
              value={metadataSearch}
              onChange={(e) => setMetadataSearch(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
            {hasFilter && (
              <Button onClick={resetFilters}>{t("cargo_history.reset")}</Button>
            )}
          </Flex>

          <Flex gap="small" align="center" wrap>
            <Flex gap={6} align="center">
              <Switch size="small" checked={autoRefresh} onChange={setAutoRefresh} />
              <Text type="secondary">{t("cargo_history.auto_refresh")}</Text>
            </Flex>
            <Button
              icon={<DownloadOutlined />}
              onClick={exportCsv}
              disabled={rows.length === 0}
            >
              {t("cargo_history.export_csv")}
            </Button>
            <Button onClick={() => refetch()} loading={isFetching}>
              {t("cargo_history.refetch")}
            </Button>
          </Flex>
        </HeaderContainer>
        <StyledTable<any>
          dataSource={rows}
          columns={columns}
          pagination={
            metadataSearch || statusFilter || actionFilter || range
              ? false
              : {
                  pageSize,
                  total: data?.total,
                  onChange: (page: number) => setCurrentPage(page),
                }
          }
          rowKey="id"
          expandable={{
            expandedRowRender: (record: CargoData) => (
              <div style={{ width: "100%" }}>
                <Flex gap="small" style={{ width: "100%" }}>
                  <MetaCard
                    title={
                      <>
                        <Flex align="center" gap="large">
                          {t("cargo_history.metadata")}

                          {record.custom_cargo_metadata ? (
                            []
                          ) : (
                            <Tooltip
                              title={t("cargo_history.undefined_format_desc")}
                            >
                              <Alert
                                message={t("cargo_history.undefined_format")}
                                type="warning"
                                showIcon
                              />
                            </Tooltip>
                          )}

                          {record.custom_cargo_metadata ? (
                            []
                          ) : (
                            <Button
                              loading={isPending}
                              onClick={() => reVerityCargoFormat(record.id)}
                            >
                              {t("cargo_history.re_verity_format")}
                            </Button>
                          )}
                        </Flex>
                      </>
                    }
                  >
                    {record.metadata && record.metadata !== "null" ? (
                      <ReactJsonView
                        displayDataTypes={false}
                        value={record.metadata as {}}
                        collapsed={false}
                        enableClipboard={false}
                        style={{ fontSize: 14 }}
                      />
                    ) : (
                      <NoDefine>{t("cargo_history.no_defined")}</NoDefine>
                    )}
                  </MetaCard>
                  <HisCard title={t("cargo_history.history")}>
                    <div style={{ marginTop: 8 }}>
                      {[...record.history]
                        .sort(
                          (a, b) =>
                            new Date(a.timestamp).getTime() -
                            new Date(b.timestamp).getTime()
                        )
                        .map((h, i, arr) => {
                          const prev = arr[i - 1];
                          const gap = prev
                            ? moment(h.timestamp).diff(moment(prev.timestamp))
                            : null;
                          return (
                            <HistoryItem key={h.id}>
                              <Flex gap="small" align="center" wrap>
                                <Text
                                  type="secondary"
                                  style={{ minWidth: 160 }}
                                >
                                  {moment(h.timestamp).format(
                                    "YYYY-MM-DD HH:mm:ss"
                                  )}
                                </Text>
                                <Tag
                                  style={{ margin: 0 }}
                                  color={getActionColor(
                                    h.action as CargoAction
                                  )}
                                >
                                  {h.action}{" "}
                                  {
                                    t(
                                      `cargo_history.action.${h.action}` as Parameters<
                                        typeof t
                                      >[0]
                                    ) as string
                                  }
                                </Tag>
                                {gap !== null && gap > 0 && (
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    +{moment.duration(gap).humanize()}
                                  </Text>
                                )}
                              </Flex>
                              <Flex
                                gap="middle"
                                wrap
                                style={{ marginTop: 4, paddingLeft: 4 }}
                              >
                                {h.amr_id && (
                                  <Text>
                                    {t("cargo_history.amr")}: <b>{h.amr_id}</b>
                                  </Text>
                                )}
                                {h.location && (
                                  <Text>
                                    {t("cargo_history.location")}:{" "}
                                    <b>{h.location}</b>
                                  </Text>
                                )}
                                {h.mission_id ? (
                                  <Text>
                                    {t("cargo_history.mission")}:{" "}
                                    <Button
                                      type="link"
                                      size="small"
                                      style={{ padding: 0 }}
                                      onClick={() => setMissionId(h.mission_id!)}
                                    >
                                      {h.mission_id.slice(0, 8)}…
                                    </Button>
                                  </Text>
                                ) : (
                                  ["LOAD", "OFFLOAD"].includes(h.action) && (
                                    <Text type="secondary">
                                      {t("cargo_history.no_mission")}
                                    </Text>
                                  )
                                )}
                                {h.actor && (
                                  <Text type="secondary">
                                    {t("cargo_history.actor")}: {h.actor}
                                  </Text>
                                )}
                              </Flex>
                              {h.description && (
                                <Text
                                  type="secondary"
                                  style={{
                                    display: "block",
                                    marginTop: 2,
                                    paddingLeft: 4,
                                  }}
                                >
                                  {h.description}
                                </Text>
                              )}
                            </HistoryItem>
                          );
                        })}
                    </div>
                  </HisCard>
                </Flex>
              </div>
            ),
          }}
        />
      </PageContainer>
      <MissionDetailModal
        missionId={missionId}
        onClose={() => setMissionId(null)}
      />
    </>
  );
};

export default HistoryTable;
