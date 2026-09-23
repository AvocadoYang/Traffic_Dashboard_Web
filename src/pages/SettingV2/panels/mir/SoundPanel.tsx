import { FC, useMemo, useState } from "react";
import { Input, Skeleton, Table } from "antd";
import type { TableColumnsType } from "antd";
import {
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useSound, SoundRow } from "@/api/useSound";
import { CreateSoundModal } from "@/pages/Setting/formComponent/forms/missionComponents/mir/sound/CreateSoundModal";
import { EditSoundModal } from "@/pages/Setting/formComponent/forms/missionComponents/mir/sound/EditSoundModal";
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
  Hint,
} from "../../ui/primitives";

const formatDuration = (seconds: number | null) => {
  if (seconds === null || Number.isNaN(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const SoundPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();

  const { data = [], isLoading } = useSound();

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SoundRow | null>(null);

  const rows = useMemo(
    () =>
      data.filter((r: SoundRow) =>
        r.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [data, search],
  );

  const columns: TableColumnsType<SoundRow> = [
    {
      title: t("peripheral_name_table.name"),
      dataIndex: "name",
      key: "name",
      width: 180,
      fixed: "left",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "CREATED BY",
      dataIndex: "created_by",
      key: "created_by",
      width: 120,
      render: (v: string) => v || "—",
    },
    {
      title: "DURATION",
      dataIndex: "duration",
      key: "duration",
      width: 100,
      render: formatDuration,
    },
    {
      title: "VOLUME",
      dataIndex: "volume",
      key: "volume",
      width: 100,
      sorter: (a, b) => a.volume - b.volume,
    },
    {
      title: t("peripheral_name_table.description"),
      dataIndex: "note",
      key: "note",
      width: 220,
      render: (v: string | null) => v || "—",
    },
    {
      title: "",
      key: "actions",
      width: 80,
      fixed: "right",
      render: (_, row) => (
        <Toolbar>
          <GhostButton onClick={() => setEditing(row)}>
            {row.created_by === "MiR" ? <EyeOutlined /> : <EditOutlined />}
          </GhostButton>
        </Toolbar>
      ),
    },
  ];

  if (isLoading) return <Skeleton active />;

  return (
    <PanelShell>
      <Section>
        <SectionTitle>
          <SoundOutlined />
          SOUND
        </SectionTitle>

        <Hint>管理可以在任務中播放的聲音檔。MiR 內建的項目只能檢視。</Hint>

        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t("utils.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Toolbar>
          <SolidButton onClick={() => setCreateOpen(true)}>
            <PlusOutlined />
            {t("utils.add")}
          </SolidButton>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState>NO SOUNDS</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id}>
                <CardTitleRow>
                  <span>{row.name}</span>
                  <Tag>{formatDuration(row.duration)}</Tag>
                </CardTitleRow>

                <CardFacts>
                  <dt>VOLUME</dt>
                  <dd>{row.volume}</dd>
                  <dt>CREATED BY</dt>
                  <dd>{row.created_by || "—"}</dd>
                  <dt>{t("peripheral_name_table.description")}</dt>
                  <dd>{row.note || "—"}</dd>
                </CardFacts>

                <Toolbar>
                  <GhostButton onClick={() => setEditing(row)}>
                    {row.created_by === "MiR" ? (
                      <EyeOutlined />
                    ) : (
                      <EditOutlined />
                    )}
                    {row.created_by === "MiR"
                      ? t("utils.detail")
                      : t("utils.edit")}
                  </GhostButton>
                </Toolbar>
              </ItemCard>
            ))}
          </CardList>
        ) : (
          <TableWrap>
            <Table<SoundRow>
              size="small"
              rowKey="id"
              dataSource={rows}
              columns={columns}
              scroll={{ x: "max-content" }}
              pagination={{
                pageSize: 12,
                showTotal: (total) => `TOTAL ${total}`,
              }}
            />
          </TableWrap>
        )}
      </Section>

      <CreateSoundModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <EditSoundModal
        open={!!editing}
        sound={editing}
        onClose={() => setEditing(null)}
      />
    </PanelShell>
  );
};

export default SoundPanel;
