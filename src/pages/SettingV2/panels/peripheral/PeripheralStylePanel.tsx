import { FC, useMemo, useState } from "react";
import { Drawer, Input, Select, Skeleton, Table } from "antd";
import type { TableColumnsType } from "antd";
import {
  BgColorsOutlined,
  EditOutlined,
  FormatPainterOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useAtom, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import usePeripheralStyle from "@/api/usePeripheralStyle";
import { PeripheralEditData, IsEditPeripheralStyle } from "@/utils/gloable";
import SettingStyleForm from "@/pages/Setting/formComponent/forms/other/editPeripheralIcon/SettingStyleForm";
import SettingMultiStyleForm from "@/pages/Setting/formComponent/forms/other/editPeripheralIcon/SettingMultiStyleForm";
import useIsNarrow from "../../ui/useIsNarrow";
import {
  PanelShell,
  Section,
  SectionTitle,
  Toolbar,
  SolidButton,
  GhostButton,
  EmptyState,
  TableWrap,
  CardList,
  ItemCard,
  CardTitleRow,
  CardFacts,
  Tag,
  CountNote,
} from "../../ui/primitives";

/** usePeripheralStyle 匯出的 PeripheralStyle 少了 name 與 flex_direction,這裡照 schema 補齊 */
type StyleRow = {
  locationId: number;
  x: number;
  y: number;
  name?: string | null;
  areaType: string;
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
  flex_direction: string;
};

const PeripheralStylePanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();

  const setSelectStation = useSetAtom(PeripheralEditData);
  const [isEditStation, setIsEditStation] = useAtom(IsEditPeripheralStyle);

  const [filterType, setFilterType] = useState<string | null>(null);
  const { data, isLoading, isFetching, refetch } =
    usePeripheralStyle(filterType);

  const [search, setSearch] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [openBulk, setOpenBulk] = useState(false);

  const areaTypes = useMemo(
    () => Array.from(new Set((data ?? []).map((item) => item?.areaType))),
    [data],
  );

  const rows = useMemo(() => {
    const all = (data ?? []) as StyleRow[];
    const keyword = search.trim().toLowerCase();
    if (!keyword) return all;
    return all.filter(
      (item) =>
        String(item?.locationId ?? "")
          .toLowerCase()
          .includes(keyword) ||
        String(item?.name ?? "")
          .toLowerCase()
          .includes(keyword),
    );
  }, [data, search]);

  /** 單筆編輯是把資料丟進共用 atom,再由 SettingStyleForm 接手 */
  const openSingleEdit = (locationId: number) => {
    const target = ((data ?? []) as StyleRow[]).find(
      (a) => a?.locationId === locationId,
    );
    if (!target) {
      setSelectStation(null);
      return;
    }
    setSelectStation({
      loc: target.locationId,
      peripheralType: target.areaType,
      translateX: target.translateX,
      translateY: target.translateY,
      rotate: target.rotate,
      scale: target.scale,
      flex_direction: target.flex_direction,
    });
    setIsEditStation(true);
  };

  const columns: TableColumnsType<StyleRow> = [
    {
      title: t("other.edit_mission_tag.location"),
      dataIndex: "locationId",
      key: "locationId",
      width: 90,
      fixed: "left",
      sorter: (a, b) => Number(a.locationId) - Number(b.locationId),
    },
    {
      title: t("peripheral_name_table.name"),
      dataIndex: "name",
      key: "name",
      width: 150,
      ellipsis: true,
      render: (v: string | null) => v || "—",
    },
    {
      title: t("peripheral_style.areaType"),
      dataIndex: "areaType",
      key: "areaType",
      width: 130,
      sorter: (a, b) => a.areaType.localeCompare(b.areaType),
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: "POSITION",
      key: "position",
      width: 140,
      render: (_, r) => `X ${r.x} · Y ${r.y}`,
    },
    {
      title: "TRANSLATE",
      key: "translate",
      width: 140,
      render: (_, r) => `X ${r.translateX} · Y ${r.translateY}`,
    },
    {
      title: "TRANSFORM",
      key: "transform",
      width: 120,
      render: (_, r) => `${r.rotate}° · ${r.scale}x`,
    },
    {
      title: "",
      key: "actions",
      width: 80,
      fixed: "right",
      render: (_, r) => (
        <Toolbar>
          <GhostButton onClick={() => openSingleEdit(r.locationId)}>
            <FormatPainterOutlined />
          </GhostButton>
        </Toolbar>
      ),
    },
  ];

  if (isLoading) return <Skeleton active />;

  // 單筆編輯時整個面板換成樣式表單,回上一頁由表單自己控制 atom
  if (isEditStation) {
    return (
      <PanelShell>
        <Section>
          <SettingStyleForm />
        </Section>
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      <Section>
        <SectionTitle>
          <BgColorsOutlined />
          {t("toolbar.others.edit_peripheral_style")}
        </SectionTitle>

        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={`${t("utils.search")} ${t("other.edit_mission_tag.location")}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Select
          allowClear
          placeholder={t("peripheral_style.areaType")}
          onChange={(v: string | undefined) => setFilterType(v ?? null)}
          options={areaTypes.map((type) => ({ label: type, value: type }))}
          value={filterType ?? undefined}
          style={{ width: "100%" }}
        />

        <Toolbar>
          <SolidButton
            onClick={() => setOpenBulk(true)}
            disabled={selectedRowKeys.length === 0}
          >
            <EditOutlined />
            {t("utils.edit")}
          </SolidButton>
          <GhostButton
            onClick={() => setSelectedRowKeys([])}
            disabled={selectedRowKeys.length === 0}
          >
            {t("utils.reset")}
          </GhostButton>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
          <CountNote>
            {selectedRowKeys.length} / {rows.length}
          </CountNote>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState>NO PERIPHERALS</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.locationId}>
                <CardTitleRow>
                  <span>{row.name || row.locationId}</span>
                  <Tag>{row.areaType}</Tag>
                </CardTitleRow>

                <CardFacts>
                  <dt>{t("other.edit_mission_tag.location")}</dt>
                  <dd>{row.locationId}</dd>
                  <dt>POSITION</dt>
                  <dd>
                    X {row.x} · Y {row.y}
                  </dd>
                  <dt>TRANSLATE</dt>
                  <dd>
                    X {row.translateX} · Y {row.translateY}
                  </dd>
                  <dt>TRANSFORM</dt>
                  <dd>
                    {row.rotate}° · {row.scale}x
                  </dd>
                </CardFacts>

                <Toolbar>
                  <GhostButton onClick={() => openSingleEdit(row.locationId)}>
                    <FormatPainterOutlined />
                    {t("utils.edit")}
                  </GhostButton>
                </Toolbar>
              </ItemCard>
            ))}
          </CardList>
        ) : (
          <TableWrap>
            <Table<StyleRow>
              size="small"
              rowKey="locationId"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              scroll={{ x: "max-content" }}
              rowSelection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys,
              }}
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
                showTotal: (total) => `TOTAL ${total}`,
              }}
            />
          </TableWrap>
        )}
      </Section>

      <Drawer
        title={t("toolbar.others.edit_peripheral_style")}
        placement="right"
        onClose={() => setOpenBulk(false)}
        open={openBulk}
        destroyOnHidden
      >
        <SettingMultiStyleForm locations={selectedRowKeys as string[]} />
      </Drawer>
    </PanelShell>
  );
};

export default PeripheralStylePanel;
