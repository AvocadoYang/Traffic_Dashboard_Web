import { FC, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dropdown,
  InputNumber,
  Popconfirm,
  Radio,
  Select,
  Skeleton,
  Switch,
  Table,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import type { MessageInstance } from "antd/es/message/interface";
import {
  AppstoreOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownOutlined,
  EnvironmentOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  SaveOutlined,
  SortAscendingOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import {
  GroupPoint,
  OFFLOAD_ORDERS,
  OffloadOrder,
  PICK_ORDERS,
  PickOrder,
  PLACEMENT_CONFIG_KEY,
  PlacementConfig,
  PlacementGroup,
  PlacementPolicy,
  groupPointsKey,
  useGroupPoints,
  usePlacementConfig,
} from "@/api/usePlacementConfig";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import HelpButton from "./GroupPickPlaceHelp";
import {
  PanelShell,
  Section,
  SectionTitle,
  FieldGrid,
  Field,
  FieldLabel,
  Toolbar,
  SolidButton,
  GhostButton,
  DangerButton,
  Hint,
  EmptyState,
  TableWrap,
  Tag,
  WarnNote,
  CountNote,
} from "../../ui/primitives";

/**
 * 群組取放規則: 群組裡放哪一格、拿哪一格, STACK 和儲位 (每一層一格) 都適用。
 *  - 取貨 / 放貨順序、疊貨 (只對 STACK)、巷道和同巷道同屬性: 改完按儲存
 *  - 點位列表: 勾選後批次停用 / 改優先度, 按了就生效, 給現場臨時換地方放
 * 原本是「輸送帶派送」底下的「群組擺放規則」, 只管 STACK。
 */
const GroupPickPlacePanel: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: config, isLoading } = usePlacementConfig();

  if (isLoading || !config) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}
      {!config.schemaReady && (
        <WarnNote>{t("group_pick_place.schema_not_ready")}</WarnNote>
      )}
      <Hint>{t("group_pick_place.intro")}</Hint>
      <GroupEditor config={config} messageApi={messageApi} />
    </PanelShell>
  );
};

// ------------------------------------------------------------------ 規則

const SLOT_TYPES = ["STACK", "STORAGE"];

type PolicyDraft = Required<PlacementPolicy>;

/**
 * 後端的規則補上預設值 (舊版後端沒有新欄位), 巷道裡已經不在群組的點位拿掉;
 * 「有沒有改過」也是比這個形狀
 */
const normalize = (
  policy: PlacementPolicy | null,
  maxLevels: number,
  memberIds: Set<string>,
): PolicyDraft => ({
  lanes: (policy?.lanes ?? [])
    .map((lane) => lane.filter((id) => memberIds.has(id)))
    .filter((lane) => lane.length > 0),
  maxLevels: policy?.maxLevels ?? maxLevels,
  heightKey: policy?.heightKey ?? null,
  maxHeight: policy?.maxHeight ?? null,
  stackMatchKeys: policy?.stackMatchKeys ?? [],
  laneMatchKeys: policy?.laneMatchKeys ?? [],
  preferStacking: policy?.preferStacking ?? true,
  pickOrder: policy?.pickOrder ?? "NEAREST",
  offloadOrder: policy?.offloadOrder ?? "NEAREST",
});

/** 樣板只填順序類的設定, 巷道和欄位還是要自己設 */
const PRESETS: {
  key: "GENERAL" | "FIFO" | "STACKING" | "RACK";
  needs?: "STACK" | "STORAGE";
  patch: Partial<PolicyDraft>;
}[] = [
  { key: "GENERAL", patch: { pickOrder: "NEAREST", offloadOrder: "NEAREST" } },
  { key: "FIFO", patch: { pickOrder: "OLDEST_FIRST" } },
  {
    key: "STACKING",
    needs: "STACK",
    patch: { preferStacking: true, pickOrder: "FEWEST_LEVELS" },
  },
  { key: "RACK", needs: "STORAGE", patch: { offloadOrder: "LOWEST_LEVEL" } },
];

const GroupEditor: FC<{
  config: PlacementConfig;
  messageApi: MessageInstance;
}> = ({ config, messageApi }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const groups = useMemo(
    () =>
      config.groups.filter((g) => g.members.some((m) => SLOT_TYPES.includes(m.type))),
    [config.groups],
  );
  const [groupId, setGroupId] = useState<string | undefined>(groups[0]?.id);

  // 群組被刪掉或換了場景就改選第一個
  useEffect(() => {
    if (!groups.some((g) => g.id === groupId)) setGroupId(groups[0]?.id);
  }, [groups, groupId]);

  const group = groups.find((g) => g.id === groupId);
  const members = useMemo(
    () => (group?.members ?? []).filter((m) => SLOT_TYPES.includes(m.type)),
    [group],
  );
  const saved = useMemo(
    () =>
      normalize(group?.policy ?? null, config.maxLevels, new Set(members.map((m) => m.id))),
    [group, members, config.maxLevels],
  );
  const savedKey = JSON.stringify(saved);
  const [draft, setDraft] = useState<PolicyDraft>(saved);

  // 換群組, 或後端的規則真的變了 (例如別人存檔) 才重設草稿; 重新讀取但內容一樣時保留還沒存的修改
  useEffect(() => {
    setDraft(JSON.parse(savedKey) as PolicyDraft);
  }, [groupId, savedKey]);

  const hasStack = members.some((m) => m.type === "STACK");
  const hasStorage = members.some((m) => m.type === "STORAGE");
  const changed = JSON.stringify(draft) !== savedKey;
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  const usedInLanes = new Set(draft.lanes.flat());
  const unassigned = members.filter((m) => !usedInLanes.has(m.id));

  const onDone = () => {
    void messageApi.success(t("utils.success"));
    void queryClient.invalidateQueries({ queryKey: PLACEMENT_CONFIG_KEY });
  };
  const onError = (e: ErrorResponse) => errorHandler(e, messageApi);

  // groupName 只是給設定變更紀錄看是哪個群組
  const saveMutation = useMutation({
    mutationFn: (policy: PolicyDraft) =>
      client.put(`/api/placement/group-policy/${groupId}`, {
        ...policy,
        lanes: policy.lanes.filter((l) => l.length > 0),
        groupName: group?.name,
      }),
    onSuccess: onDone,
    onError,
  });

  const removeMutation = useMutation({
    mutationFn: () =>
      client.delete(`/api/placement/group-policy/${groupId}`, {
        data: { groupName: group?.name },
      }),
    onSuccess: onDone,
    onError,
  });

  const patch = (next: Partial<PolicyDraft>) => setDraft((d) => ({ ...d, ...next }));
  const setLane = (i: number, ids: string[]) =>
    patch({ lanes: draft.lanes.map((l, j) => (j === i ? ids : l)) });

  const presets = PRESETS.filter(
    (p) => !p.needs || (p.needs === "STACK" ? hasStack : hasStorage),
  );
  const applyPreset = (key: string) => {
    const preset = presets.find((p) => p.key === key);
    if (!preset) return;
    patch(preset.patch);
    void messageApi.info(
      t("group_pick_place.preset_applied", {
        name: t(`group_pick_place.preset_${preset.key}`),
      }),
    );
  };

  if (groups.length === 0) {
    return <EmptyState>{t("group_pick_place.no_group")}</EmptyState>;
  }

  return (
    <>
      <Section>
        <Toolbar>
          <Select
            style={{ minWidth: 200 }}
            value={groupId}
            onChange={setGroupId}
            options={groups.map((g) => ({ label: g.name, value: g.id }))}
            showSearch={{
              filterOption: (input, option) =>
                String(option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase()),
            }}
          />
          <CountNote>
            {t("group_pick_place.member_count", {
              stack: members.filter((m) => m.type === "STACK").length,
              storage: members.filter((m) => m.type === "STORAGE").length,
            })}
          </CountNote>
          {!group?.policy && <Tag>{t("group_pick_place.no_policy")}</Tag>}
          {changed && <Tag>{t("group_pick_place.unsaved")}</Tag>}
          <Dropdown
            trigger={["click"]}
            menu={{
              items: presets.map((p) => ({
                key: p.key,
                label: t(`group_pick_place.preset_${p.key}`),
              })),
              onClick: ({ key }) => applyPreset(key),
            }}
          >
            <GhostButton type="button" style={{ marginLeft: "auto" }}>
              {t("group_pick_place.preset")}
              <DownOutlined />
            </GhostButton>
          </Dropdown>
        </Toolbar>
        <Hint>{t("group_pick_place.preset_hint")}</Hint>
      </Section>

      <Section>
        <SectionTitle>
          <SortAscendingOutlined />
          {t("group_pick_place.order_title")}
          <HelpButton topic="policy" />
        </SectionTitle>
        <Hint>{t("group_pick_place.order_hint")}</Hint>
        <FieldGrid $cols={2}>
          {/* 單選鈕不能包在 <label> 裡: 點欄位名稱會選到第一個選項 */}
          <Field as="div">
            <FieldLabel>{t("group_pick_place.pick_order")}</FieldLabel>
            <Radio.Group
              optionType="button"
              value={draft.pickOrder}
              onChange={(e) => patch({ pickOrder: e.target.value as PickOrder })}
              options={PICK_ORDERS.map((o) => ({
                label: t(`group_pick_place.pick_order_${o}`),
                value: o,
              }))}
            />
            <Hint>{t(`group_pick_place.pick_order_hint_${draft.pickOrder}`)}</Hint>
          </Field>
          {hasStorage && (
            <Field as="div">
              <FieldLabel>{t("group_pick_place.offload_order")}</FieldLabel>
              <Radio.Group
                optionType="button"
                value={draft.offloadOrder}
                onChange={(e) => patch({ offloadOrder: e.target.value as OffloadOrder })}
                options={OFFLOAD_ORDERS.map((o) => ({
                  label: t(`group_pick_place.offload_order_${o}`),
                  value: o,
                }))}
              />
              <Hint>{t(`group_pick_place.offload_order_hint_${draft.offloadOrder}`)}</Hint>
            </Field>
          )}
        </FieldGrid>
      </Section>

      {hasStack && (
        <Section>
          <SectionTitle>
            <AppstoreOutlined />
            {t("group_pick_place.stacking_title")}
          </SectionTitle>
          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>{t("group_pick_place.max_levels")}</FieldLabel>
              <InputNumber
                min={1}
                max={config.maxLevels}
                precision={0}
                value={draft.maxLevels}
                onChange={(v) => patch({ maxLevels: v ?? config.maxLevels })}
              />
            </Field>
            <Field as="div">
              <FieldLabel>{t("group_pick_place.prefer_stacking")}</FieldLabel>
              <Switch
                checked={draft.preferStacking}
                onChange={(v) => patch({ preferStacking: v })}
                style={{ alignSelf: "flex-start" }}
              />
              <Hint>{t("group_pick_place.prefer_stacking_hint")}</Hint>
            </Field>
            <Field>
              <FieldLabel>{t("group_pick_place.stack_match_keys")}</FieldLabel>
              <Select
                mode="tags"
                value={draft.stackMatchKeys}
                onChange={(v: string[]) => patch({ stackMatchKeys: v })}
                options={config.cargoKeys.map((k) => ({ label: k, value: k }))}
              />
              <Hint>{t("group_pick_place.stack_match_hint")}</Hint>
            </Field>
            <Field as="div">
              <FieldLabel>{t("group_pick_place.height_limit")}</FieldLabel>
              <Toolbar>
                <Select
                  allowClear
                  style={{ minWidth: 140 }}
                  placeholder={t("group_pick_place.height_key")}
                  value={draft.heightKey ?? undefined}
                  onChange={(v?: string) =>
                    patch({ heightKey: v ?? null, maxHeight: v ? draft.maxHeight : null })
                  }
                  options={config.cargoKeys.map((k) => ({ label: k, value: k }))}
                />
                <InputNumber
                  min={1}
                  disabled={!draft.heightKey}
                  placeholder={t("group_pick_place.max_height")}
                  value={draft.maxHeight ?? undefined}
                  onChange={(v) => patch({ maxHeight: v ?? null })}
                />
              </Toolbar>
              <Hint>{t("group_pick_place.height_hint")}</Hint>
            </Field>
          </FieldGrid>
        </Section>
      )}

      <Section>
        <SectionTitle>
          <BranchesOutlined />
          {t("group_pick_place.lanes")}
          <HelpButton topic="lanes" />
        </SectionTitle>
        <Hint>{t("group_pick_place.lanes_hint")}</Hint>
        {draft.lanes.map((lane, i) => (
          <Toolbar key={i}>
            <span style={{ minWidth: 64 }}>{t("group_pick_place.lane_n", { n: i + 1 })}</span>
            <Select
              mode="multiple"
              style={{ flex: 1, minWidth: 240 }}
              placeholder={t("group_pick_place.lane_placeholder")}
              value={lane}
              onChange={(ids: string[]) => setLane(i, ids)}
              options={members.map((m) => ({
                label: m.name,
                value: m.id,
                // 一個點位只能在一條巷道
                disabled: usedInLanes.has(m.id) && !lane.includes(m.id),
              }))}
            />
            <GhostButton
              type="button"
              onClick={() => patch({ lanes: draft.lanes.filter((_, j) => j !== i) })}
            >
              <MinusCircleOutlined />
            </GhostButton>
            {lane.length > 0 && (
              <Hint style={{ flexBasis: "100%" }}>
                {t("group_pick_place.lane_inner")} {lane.map(nameOf).join(" › ")}{" "}
                {t("group_pick_place.lane_outer")}
              </Hint>
            )}
          </Toolbar>
        ))}
        <Toolbar>
          <GhostButton type="button" onClick={() => patch({ lanes: [...draft.lanes, []] })}>
            <PlusOutlined />
            {t("group_pick_place.add_lane")}
          </GhostButton>
        </Toolbar>
        {/* 不在巷道裡的點位會被當成隨時能直接取放, 只設一部分巷道時很容易以為巷道沒作用;
            一條巷道都沒有的群組 (大多數儲位群組) 不用列 */}
        {unassigned.length > 0 && draft.lanes.some((l) => l.length > 0) && (
          <Alert
            type="warning"
            showIcon
            title={`${t("group_pick_place.unassigned")}: ${unassigned
              .map((m) => m.name)
              .join(", ")}`}
            description={t("group_pick_place.unassigned_hint")}
          />
        )}
        <Field>
          <FieldLabel>{t("group_pick_place.lane_match_keys")}</FieldLabel>
          <Select
            mode="tags"
            value={draft.laneMatchKeys}
            onChange={(v: string[]) => patch({ laneMatchKeys: v })}
            options={config.cargoKeys.map((k) => ({ label: k, value: k }))}
          />
          <Hint>{t("group_pick_place.lane_match_hint")}</Hint>
        </Field>
      </Section>

      <Toolbar>
        <SolidButton
          disabled={
            (!changed && !!group?.policy) ||
            saveMutation.isLoading ||
            (!!draft.heightKey && !draft.maxHeight)
          }
          onClick={() => saveMutation.mutate(draft)}
        >
          <SaveOutlined />
          {t("utils.save")}
        </SolidButton>
        {group?.policy && (
          <Popconfirm
            title={t("group_pick_place.remove_policy_warn")}
            okText={t("utils.confirm")}
            cancelText={t("utils.cancel")}
            onConfirm={() => removeMutation.mutate()}
          >
            <DangerButton disabled={removeMutation.isLoading}>
              <DeleteOutlined />
              {t("group_pick_place.remove_policy")}
            </DangerButton>
          </Popconfirm>
        )}
      </Toolbar>

      {group && (
        // 換群組就重新掛載: 勾選和還沒套用的優先度都不帶到別的群組
        <PointsSection
          key={group.id}
          group={group}
          lanes={draft.lanes}
          matchKeys={[...new Set([...draft.laneMatchKeys, ...draft.stackMatchKeys])]}
          messageApi={messageApi}
        />
      )}
    </>
  );
};

// ------------------------------------------------------------------ 點位

const byName = (a: GroupPoint, b: GroupPoint) =>
  a.name.localeCompare(b.name, undefined, { numeric: true });

type PointsChange = { loadPriority?: number; offloadPriority?: number; disable?: boolean };

const PointsSection: FC<{
  group: PlacementGroup;
  lanes: string[][];
  /** 貨欄要列出值的欄位: 同巷道、疊貨比對用的 */
  matchKeys: string[];
  messageApi: MessageInstance;
}> = ({ group, lanes, matchKeys, messageApi }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: points, isLoading } = useGroupPoints(group.id);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadPriority, setLoadPriority] = useState<number | null>(null);
  const [offloadPriority, setOffloadPriority] = useState<number | null>(null);

  const rows = useMemo(() => [...(points ?? [])].sort(byName), [points]);
  // 選好之後點位被移出群組, 就不要再送出去
  const selectedIds = selected.filter((id) => rows.some((r) => r.id === id));
  const count = selectedIds.length;

  const lanePos = useMemo(() => {
    const pos = new Map<string, { lane: number; pos: number }>();
    lanes.forEach((lane, i) => lane.forEach((id, j) => pos.set(id, { lane: i + 1, pos: j + 1 })));
    return pos;
  }, [lanes]);
  const multiLevel = rows.some((r) => r.type === "STORAGE" && (r.level ?? 0) > 0);

  const mutation = useMutation({
    mutationFn: (change: PointsChange) =>
      client.post("/api/placement/points", {
        ids: selectedIds,
        groupName: group.name,
        ...change,
      }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void queryClient.invalidateQueries({ queryKey: groupPointsKey(group.id) });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const toggleRow = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // 欄位名稱放在表頭, 格子裡只放值, 例如「1 筆 · Empty」
  const cargoText = (p: GroupPoint) => {
    if (p.cargo.length === 0) return "—";
    const n = t("group_pick_place.cargo_n", { n: p.cargo.length });
    const values = matchKeys.map((k) =>
      [
        ...new Set(
          p.cargo
            .map((c) => c[k])
            .filter((v) => v !== undefined && v !== null && v !== "")
            .map(String),
        ),
      ].join("/") || "—",
    );
    return values.length > 0 ? `${n} · ${values.join(" · ")}` : n;
  };

  // 設定面板只有六百多 px 寬: 狀態併進點位名稱, 取 / 放優先度一欄, 可能很長的貨物資料放最後
  const columns: TableColumnsType<GroupPoint> = [
    {
      title: t("group_pick_place.col_name"),
      key: "name",
      width: 130,
      fixed: "left",
      sorter: byName,
      render: (_, p) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {p.name}
          {p.disable ? (
            <Tag>{t("group_pick_place.state_disabled")}</Tag>
          ) : (
            p.booked && <Tag>{t("group_pick_place.state_booked")}</Tag>
          )}
        </span>
      ),
    },
    {
      title: t("group_pick_place.col_type"),
      key: "type",
      width: 90,
      render: (_, p) =>
        p.type === "STACK"
          ? t("group_pick_place.type_STACK")
          : multiLevel && p.level !== null
            ? t("group_pick_place.type_STORAGE_level", { n: p.level + 1 })
            : t("group_pick_place.type_STORAGE"),
    },
    {
      title: t("group_pick_place.col_lane"),
      key: "lane",
      width: 110,
      render: (_, p) => {
        const at = lanePos.get(p.id);
        return at ? t("group_pick_place.lane_pos", at) : "—";
      },
    },
    {
      title: t("group_pick_place.col_priority"),
      key: "priority",
      width: 90,
      render: (_, p) => `${p.loadPriority} / ${p.offloadPriority}`,
    },
    {
      title:
        matchKeys.length > 0
          ? `${t("group_pick_place.col_cargo")}（${matchKeys.join("、")}）`
          : t("group_pick_place.col_cargo"),
      key: "cargo",
      render: (_, p) => cargoText(p),
    },
  ];

  const busy = count === 0 || mutation.isLoading;

  const priorityControl = (
    field: "loadPriority" | "offloadPriority",
    value: number | null,
    setValue: (v: number | null) => void,
  ) => {
    const label = t(
      field === "loadPriority"
        ? "group_pick_place.load_priority"
        : "group_pick_place.offload_priority",
    );
    return (
      <>
        <CountNote>{label}</CountNote>
        <InputNumber
          min={0}
          precision={0}
          value={value}
          onChange={(v) => setValue(v ?? null)}
          style={{ width: 90 }}
        />
        <Popconfirm
          title={t("group_pick_place.priority_confirm", { count, field: label, value })}
          okText={t("utils.confirm")}
          cancelText={t("utils.cancel")}
          disabled={busy || value === null}
          onConfirm={() =>
            mutation.mutate(
              field === "loadPriority"
                ? { loadPriority: value ?? undefined }
                : { offloadPriority: value ?? undefined },
            )
          }
        >
          <GhostButton type="button" disabled={busy || value === null}>
            {t("group_pick_place.apply")}
          </GhostButton>
        </Popconfirm>
      </>
    );
  };

  return (
    <Section>
      <SectionTitle>
        <EnvironmentOutlined />
        {t("group_pick_place.points_title")}
        <HelpButton topic="points" />
      </SectionTitle>
      <Hint>{t("group_pick_place.points_hint")}</Hint>

      <Toolbar>
        <CountNote>{t("group_pick_place.selected", { count })}</CountNote>
        <Popconfirm
          title={t("group_pick_place.disable_confirm", { count })}
          okText={t("utils.confirm")}
          cancelText={t("utils.cancel")}
          disabled={busy}
          onConfirm={() => mutation.mutate({ disable: true })}
        >
          <GhostButton type="button" disabled={busy}>
            <StopOutlined />
            {t("group_pick_place.disable")}
          </GhostButton>
        </Popconfirm>
        <Popconfirm
          title={t("group_pick_place.enable_confirm", { count })}
          okText={t("utils.confirm")}
          cancelText={t("utils.cancel")}
          disabled={busy}
          onConfirm={() => mutation.mutate({ disable: false })}
        >
          <GhostButton type="button" disabled={busy}>
            <CheckCircleOutlined />
            {t("group_pick_place.enable")}
          </GhostButton>
        </Popconfirm>
      </Toolbar>
      <Toolbar>{priorityControl("loadPriority", loadPriority, setLoadPriority)}</Toolbar>
      <Toolbar>{priorityControl("offloadPriority", offloadPriority, setOffloadPriority)}</Toolbar>

      {isLoading ? (
        <Skeleton active />
      ) : rows.length === 0 ? (
        <EmptyState>{t("group_pick_place.no_points")}</EmptyState>
      ) : (
        <TableWrap>
          <Table<GroupPoint>
            size="small"
            rowKey="id"
            dataSource={rows}
            columns={columns}
            // 面板放得下就不捲; 窄螢幕在表格裡橫向捲動
            scroll={{ x: 600 }}
            pagination={false}
            rowSelection={{
              // 名稱欄 fixed:left, 勾選欄不固定的話會被蓋住
              fixed: true,
              selectedRowKeys: selectedIds,
              onChange: (keys) => setSelected(keys as string[]),
            }}
            // 點整列也能切換選取, 不用精準點到勾選框
            onRow={(r) => ({
              onClick: () => toggleRow(r.id),
              style: { cursor: "pointer" },
            })}
          />
        </TableWrap>
      )}
    </Section>
  );
};

export default GroupPickPlacePanel;
