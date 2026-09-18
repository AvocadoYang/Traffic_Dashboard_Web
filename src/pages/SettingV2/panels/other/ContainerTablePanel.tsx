import { FC, useMemo, useState } from "react";
import { Input, Skeleton, Table } from "antd";
import type { TableColumnsType } from "antd";
import {
  DownOutlined,
  InboxOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import ReactJsonView from "@uiw/react-json-view";
import { useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import useContainerLocation, { Loc_For_CD } from "@/api/useContainerLocation";
import { tooltipProp } from "@/utils/gloable";
import { locationOption } from "@/pages/Setting/utils/func";
import useIsNarrow from "../../ui/useIsNarrow";
import { c } from "../../ui/tokens";
import {
  PanelShell,
  Section,
  SectionTitle,
  Toolbar,
  GhostButton,
  EmptyState,
  TableWrap,
  CardList,
  ItemCard,
  CardTitleRow,
  CardFacts,
  Tag,
  Hint,
} from "../../ui/primitives";

const hasContainer = (row: Loc_For_CD) =>
  !!row.container && Object.keys(row.container as object).length > 0;

const ContainerTablePanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();

  const { data, isLoading, isFetching, refetch } = useContainerLocation();
  // 滑過清單時在地圖上標出那個點位
  const setTooltip = useSetAtom(tooltipProp);

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);

  const rows = useMemo(() => {
    const all = data ?? [];
    const keyword = search.trim().toLowerCase();
    if (!keyword) return all;
    return all.filter(
      (row) =>
        row.locationId.toLowerCase().includes(keyword) ||
        (row.locationName ?? "").toLowerCase().includes(keyword),
    );
  }, [data, search]);

  const toggleCard = (id: string) =>
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );

  const jsonView = (row: Loc_For_CD) =>
    hasContainer(row) ? (
      <div
        style={{
          background: c.bgSubtle,
          padding: 12,
          border: `1px solid ${c.border}`,
        }}
      >
        <ReactJsonView
          displayDataTypes={false}
          value={row.container as object}
          collapsed={false}
          enableClipboard={false}
          style={{ fontSize: 13, background: "transparent" }}
        />
      </div>
    ) : (
      <EmptyState>{t("utils.none")}</EmptyState>
    );

  const columns: TableColumnsType<Loc_For_CD> = [
    {
      title: t("utils.location"),
      dataIndex: "locationId",
      key: "locationId",
      width: 100,
      fixed: "left",
      sorter: (a, b) => Number(a.locationId) - Number(b.locationId),
    },
    {
      title: t("blind_location.location_name"),
      dataIndex: "locationName",
      key: "locationName",
      width: 160,
      render: (v: string) => v || "—",
    },
    {
      title: t("utils.point_type"),
      dataIndex: "areaType",
      key: "areaType",
      width: 130,
      sorter: (a, b) => a.areaType.localeCompare(b.areaType),
      render: (v: string) => <Tag>{locationOption(v)}</Tag>,
    },
    {
      title: t("container_table.container_info"),
      key: "container",
      width: 110,
      filters: [
        { text: t("utils.yes"), value: true },
        { text: t("utils.no"), value: false },
      ],
      onFilter: (value, r) => hasContainer(r) === value,
      render: (_, r) => (hasContainer(r) ? t("utils.yes") : "—"),
    },
    {
      title: "X / Y",
      key: "xy",
      width: 150,
      render: (_, r) => `${r.x.toFixed(3)}, ${r.y.toFixed(3)}`,
    },
  ];

  if (isLoading) return <Skeleton active />;

  return (
    <PanelShell onMouseLeave={() => setTooltip(null)}>
      <Section>
        <SectionTitle>
          <InboxOutlined />
          {t("container_table.title")}
        </SectionTitle>

        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={`${t("utils.search")} ${t("utils.location")}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Toolbar>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>

        <Hint>滑過清單上的點位,地圖會標出它的位置。展開可看完整貨物資訊。</Hint>

        {rows.length === 0 ? (
          <EmptyState>NO LOCATIONS</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => {
              const isOpen = expanded.includes(row.locationId);
              return (
                <ItemCard
                  key={row.locationId}
                  onMouseEnter={() =>
                    setTooltip({
                      x: row.x,
                      y: row.y,
                      locationId: row.locationId,
                    })
                  }
                >
                  <CardTitleRow>
                    <span>{row.locationName || row.locationId}</span>
                    <Tag>{locationOption(row.areaType)}</Tag>
                  </CardTitleRow>

                  <CardFacts>
                    <dt>{t("utils.location")}</dt>
                    <dd>{row.locationId}</dd>
                    <dt>X / Y</dt>
                    <dd>
                      {row.x.toFixed(3)}, {row.y.toFixed(3)}
                    </dd>
                    <dt>{t("container_table.container_info")}</dt>
                    <dd>{hasContainer(row) ? t("utils.yes") : "—"}</dd>
                  </CardFacts>

                  <Toolbar>
                    <GhostButton onClick={() => toggleCard(row.locationId)}>
                      {isOpen ? <DownOutlined /> : <RightOutlined />}
                      {t("utils.detail")}
                    </GhostButton>
                  </Toolbar>

                  {isOpen && jsonView(row)}
                </ItemCard>
              );
            })}
          </CardList>
        ) : (
          <TableWrap>
            <Table<Loc_For_CD>
              size="small"
              rowKey="locationId"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              scroll={{ x: "max-content" }}
              expandable={{
                expandedRowRender: jsonView,
                rowExpandable: hasContainer,
              }}
              onRow={(record: Loc_For_CD) => ({
                onMouseEnter: () =>
                  setTooltip({
                    x: record.x,
                    y: record.y,
                    locationId: record.locationId,
                  }),
              })}
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
                showTotal: (total) => `TOTAL ${total}`,
              }}
            />
          </TableWrap>
        )}
      </Section>
    </PanelShell>
  );
};

export default ContainerTablePanel;
