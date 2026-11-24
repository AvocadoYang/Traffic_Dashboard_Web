import { FC, useState } from "react";
import { Input, Modal, Popconfirm, Skeleton, message } from "antd";
import { CameraOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { errorHandler } from "@/utils/utils";
import {
  Section,
  SectionTitle,
  CardList,
  ItemCard,
  CardTitleRow,
  CardFacts,
  Toolbar,
  SolidButton,
  GhostButton,
  DangerButton,
  Hint,
  Tag,
  WarnNote,
  EmptyState,
} from "@/pages/SettingV3/ui/primitives";

type SnapshotMeta = {
  id: string;
  name: string;
  note: string;
  kind: "manual" | "before_restore";
  createdAt: string;
  createdBy: string | null;
  tables: Record<string, number>;
  sizeBytes: number;
};

type ListResponse = {
  snapshots: SnapshotMeta[];
  lastRestore: { snapshotName: string; at: string } | null;
  pendingRestart: boolean;
  activeMissions: number;
};

type TableChange = {
  table: string;
  create: number;
  update: number;
  remove: number;
  changedColumns: string[];
};

type Preview = {
  meta: SnapshotMeta;
  totals: { create: number; update: number; remove: number };
  missingTables: string[];
  categories: { category: string; label: string; tables: TableChange[] }[];
  blockers: {
    count: number;
    sample: { id: string; amrId: string; status: string }[];
  };
};

const QUERY_KEY = ["setting-snapshots"];

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const totalRows = (tables: Record<string, number>) =>
  Object.values(tables).reduce((a, b) => a + b, 0);

/**
 * 設定快照: 建立 / 刪除 / 預覽並還原。
 * 還原後後端記憶體還是舊設定, 要重新啟動才完全生效, 所以頁面會一直顯示提醒到後端重開為止。
 */
const SnapshotSection: FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [target, setTarget] = useState<SnapshotMeta | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () =>
      (await client.get<ListResponse>("api/setting/snapshots")).data,
    refetchInterval: 15000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: async () =>
      client.post("api/setting/snapshot-create", { name, note }),
    onSuccess: () => {
      void messageApi.success(t("snapshot.created"));
      setName("");
      setNote("");
      void refresh();
    },
    onError: (e: any) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      client.post("api/setting/snapshot-delete", { id }),
    onSuccess: () => {
      void messageApi.success(t("snapshot.deleted"));
      void refresh();
    },
    onError: (e: any) => errorHandler(e, messageApi),
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) =>
      client.post("api/setting/snapshot-restore", { id }),
    onSuccess: () => {
      void messageApi.success(t("snapshot.restored"), 8);
      setTarget(null);
      setPreview(null);
      void refresh();
    },
    onError: (e: any) => errorHandler(e, messageApi),
  });

  const openRestore = async (snap: SnapshotMeta) => {
    setTarget(snap);
    setPreview(null);
    setLoadingPreview(true);
    try {
      const res = await client.get<Preview>("api/setting/snapshot-preview", {
        params: { id: snap.id },
      });
      setPreview(res.data);
    } catch (e) {
      errorHandler(e as any, messageApi);
      setTarget(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  if (!data) return <Skeleton active />;

  const nothingToRestore =
    !!preview &&
    preview.totals.create + preview.totals.update + preview.totals.remove === 0;
  const blocked = !!preview && preview.blockers.count > 0;

  return (
    <Section data-testid="snapshot-section">
      {contextHolder}
      <SectionTitle>
        <CameraOutlined />
        {t("snapshot.title")}
      </SectionTitle>

      <Hint>{t("snapshot.hint")}</Hint>

      {data.pendingRestart && data.lastRestore && (
        <WarnNote data-testid="snapshot-restart-banner">
          {t("snapshot.restart_needed", {
            name: data.lastRestore.snapshotName,
            time: new Date(data.lastRestore.at).toLocaleString(),
          })}
        </WarnNote>
      )}

      {data.activeMissions > 0 && (
        <Hint>{t("snapshot.active_missions", { count: data.activeMissions })}</Hint>
      )}

      <Toolbar>
        <Input
          style={{ width: 260 }}
          maxLength={60}
          value={name}
          placeholder={t("snapshot.name_placeholder")}
          onChange={(e) => setName(e.target.value)}
          data-testid="snapshot-name"
        />
        <Input
          style={{ width: 260 }}
          maxLength={500}
          value={note}
          placeholder={t("snapshot.note_placeholder")}
          onChange={(e) => setNote(e.target.value)}
        />
        <SolidButton
          onClick={() => createMutation.mutate()}
          disabled={!name.trim() || createMutation.isLoading}
          data-testid="snapshot-create"
        >
          <CameraOutlined />
          {t("snapshot.create")}
        </SolidButton>
      </Toolbar>

      {data.snapshots.length === 0 ? (
        <EmptyState>{t("snapshot.empty")}</EmptyState>
      ) : (
        <CardList>
          {data.snapshots.map((s) => (
            <ItemCard key={s.id} data-testid={`snapshot-card-${s.id}`}>
              <CardTitleRow>
                <span>{s.name}</span>
                <Tag>
                  {s.kind === "manual"
                    ? t("snapshot.kind_manual")
                    : t("snapshot.kind_before_restore")}
                </Tag>
              </CardTitleRow>
              <CardFacts>
                <dt>{t("snapshot.by")}</dt>
                <dd>
                  {new Date(s.createdAt).toLocaleString()}
                  {s.createdBy ? ` · ${s.createdBy}` : ""}
                </dd>
                <dt>{t("snapshot.rows")}</dt>
                <dd>
                  {totalRows(s.tables)} · {formatSize(s.sizeBytes)}
                </dd>
              </CardFacts>
              {s.note && <Hint>{s.note}</Hint>}
              <Toolbar>
                <GhostButton
                  onClick={() => void openRestore(s)}
                  data-testid={`snapshot-restore-${s.id}`}
                >
                  {t("snapshot.restore")}
                </GhostButton>
                <Popconfirm
                  title={t("snapshot.delete_confirm", { name: s.name })}
                  onConfirm={() => deleteMutation.mutate(s.id)}
                >
                  <DangerButton>{t("snapshot.delete")}</DangerButton>
                </Popconfirm>
              </Toolbar>
            </ItemCard>
          ))}
        </CardList>
      )}

      <Modal
        open={!!target}
        title={t("snapshot.restore_title", { name: target?.name ?? "" })}
        onCancel={() => {
          setTarget(null);
          setPreview(null);
        }}
        okText={t("snapshot.confirm_restore")}
        okButtonProps={{
          danger: true,
          disabled: !preview || nothingToRestore || blocked,
          loading: restoreMutation.isLoading,
        }}
        onOk={() => target && restoreMutation.mutate(target.id)}
        width={640}
        destroyOnHidden
      >
        {loadingPreview || !preview ? (
          <Skeleton active />
        ) : (
          <div data-testid="snapshot-preview">
            {blocked && (
              <WarnNote>
                {t("snapshot.blocked", { count: preview.blockers.count })}{" "}
                {preview.blockers.sample
                  .map((m) => `${m.id} (${m.amrId} ${m.status})`)
                  .join(", ")}
              </WarnNote>
            )}
            {nothingToRestore ? (
              <Hint>{t("snapshot.no_difference")}</Hint>
            ) : (
              <>
                <Hint>{t("snapshot.totals", preview.totals)}</Hint>
                {preview.categories.map((c) => (
                  <div key={c.category} style={{ marginBottom: 8 }}>
                    <strong>{c.label}</strong>
                    <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                      {c.tables.map((tb) => (
                        <li key={tb.table}>
                          {tb.table}:{" "}
                          {[
                            tb.create ? `${t("snapshot.added")} ${tb.create}` : "",
                            tb.update ? `${t("snapshot.changed")} ${tb.update}` : "",
                            tb.remove ? `${t("snapshot.removed")} ${tb.remove}` : "",
                          ]
                            .filter(Boolean)
                            .join(", ")}
                          {tb.changedColumns.length > 0 &&
                            ` (${tb.changedColumns.join(", ")})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            )}
            {preview.missingTables.length > 0 && (
              <Hint>
                {t("snapshot.missing_tables", {
                  tables: preview.missingTables.join(", "),
                })}
              </Hint>
            )}
            <Hint>{t("snapshot.restore_note")}</Hint>
          </div>
        )}
      </Modal>
    </Section>
  );
};

export default SnapshotSection;
