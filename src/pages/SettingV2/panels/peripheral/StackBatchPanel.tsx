import { FC, useMemo, useState } from "react";
import {
  Checkbox,
  Input,
  InputNumber,
  Popconfirm,
  Radio,
  Select,
  Switch,
  Table,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import { AppstoreOutlined, CheckOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useAllMissionTitles from "@/api/useMissionTitle";
import useStackSocket from "@/sockets/useStackSocket";
import { Stack_Info } from "@/types/peripheral";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import {
  PanelShell,
  Section,
  SectionTitle,
  FieldGrid,
  Field,
  FieldLabel,
  Toolbar,
  SolidButton,
  Hint,
  EmptyState,
  TableWrap,
  Tag,
  WarnNote,
  CountNote,
} from "../../ui/primitives";

/** 跟後端 isValidName 同一條規則 */
const VALID_NAME = /^[a-zA-Z0-9_]+$/;

type RenameMode = "seq" | "loc";
type RenameOrder = "location" | "name";

type BatchPayload = {
  items: { stationId: string; name?: string }[];
  loadMissionId?: string | null;
  offloadMissionId?: string | null;
  loadPriority?: number;
  offloadPriority?: number;
  disable?: boolean;
};

const byLocationId = (a: Stack_Info, b: Stack_Info) =>
  Number(a.locationId) - Number(b.locationId) ||
  a.locationId.localeCompare(b.locationId);

const StackBatchPanel: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const stackMap = useStackSocket();
  const { data: misTitle } = useAllMissionTitles();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 每個欄位要勾「修改」才會送出,沒勾的保持原值
  const [editLoad, setEditLoad] = useState(false);
  const [loadMissionId, setLoadMissionId] = useState<string | null>(null);
  const [editOffload, setEditOffload] = useState(false);
  const [offloadMissionId, setOffloadMissionId] = useState<string | null>(
    null,
  );
  const [editLoadPriority, setEditLoadPriority] = useState(false);
  const [loadPriority, setLoadPriority] = useState(0);
  const [editOffloadPriority, setEditOffloadPriority] = useState(false);
  const [offloadPriority, setOffloadPriority] = useState(0);
  const [editDisable, setEditDisable] = useState(false);
  const [disable, setDisable] = useState(false);

  const [rename, setRename] = useState(false);
  const [mode, setMode] = useState<RenameMode>("seq");
  const [prefix, setPrefix] = useState("STK_");
  const [start, setStart] = useState(1);
  const [digits, setDigits] = useState(2);
  const [order, setOrder] = useState<RenameOrder>("location");

  const rows = useMemo(
    () => Object.values(stackMap ?? {}).sort(byLocationId),
    [stackMap],
  );

  const missionOptions = useMemo(
    () =>
      misTitle
        ?.filter((g) =>
          g.MissionTitleBridgeCategory.some(
            (s) => s.Category?.tagName === "dynamic-mission",
          ),
        )
        .map((v) => ({ value: v.id, label: v.name ?? `Mission ${v.id}` })) ??
      [],
    [misTitle],
  );
  const missionLabel = useMemo(
    () => new Map(missionOptions.map((o) => [o.value, o.label])),
    [missionOptions],
  );

  const prefixValid = prefix === "" || VALID_NAME.test(prefix);

  /** 已選的 stack → 自動產生的新名稱 */
  const newNames = useMemo(() => {
    const result = new Map<string, string>();
    if (!rename) return result;
    const selected = rows.filter((r) => selectedIds.includes(r.locationId));
    const ordered =
      order === "name"
        ? [...selected].sort(
            (a, b) =>
              (a.name ?? "").localeCompare(b.name ?? "", undefined, {
                numeric: true,
              }) || byLocationId(a, b),
          )
        : selected;
    ordered.forEach((r, i) => {
      const suffix =
        mode === "seq"
          ? String(start + i).padStart(digits, "0")
          : r.locationId;
      result.set(r.locationId, `${prefix}${suffix}`);
    });
    return result;
  }, [rename, rows, selectedIds, order, mode, prefix, start, digits]);

  const toggleRow = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const invalidNames = [...newNames.values()].filter(
    (n) => !VALID_NAME.test(n),
  );

  const mutation = useMutation({
    mutationFn: (payload: BatchPayload) =>
      client.post("/api/setting/batch-update-stack-config", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      setSelectedIds([]);
      setRename(false);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const hasFieldChange =
    editLoad ||
    editOffload ||
    editLoadPriority ||
    editOffloadPriority ||
    editDisable ||
    rename;

  const apply = () => {
    if (selectedIds.length === 0) {
      void messageApi.warning(t("stack_batch.no_selection"));
      return;
    }
    if (!hasFieldChange) {
      void messageApi.warning(t("stack_batch.nothing_to_apply"));
      return;
    }
    const payload: BatchPayload = {
      items: rows
        .filter((r) => selectedIds.includes(r.locationId))
        .map((r) => ({
          stationId: r.locationId,
          ...(rename && { name: newNames.get(r.locationId) }),
        })),
      ...(editLoad && { loadMissionId }),
      ...(editOffload && { offloadMissionId }),
      ...(editLoadPriority && { loadPriority }),
      ...(editOffloadPriority && { offloadPriority }),
      ...(editDisable && { disable }),
    };
    mutation.mutate(payload);
  };

  const columns: TableColumnsType<Stack_Info> = [
    {
      title: t("stack_batch.location_id"),
      dataIndex: "locationId",
      key: "locationId",
      width: 100,
      fixed: "left",
      sorter: byLocationId,
    },
    {
      title: t("stack_batch.name"),
      dataIndex: "name",
      key: "name",
      width: 140,
      render: (v: string) => v || "—",
    },
    ...(rename
      ? [
          {
            title: t("stack_batch.new_name"),
            key: "newName",
            width: 140,
            render: (_: unknown, r: Stack_Info) => {
              const n = newNames.get(r.locationId);
              if (!n) return "—";
              return VALID_NAME.test(n) ? <Tag>{n}</Tag> : <WarnNote>{n}</WarnNote>;
            },
          },
        ]
      : []),
    {
      title: t("stack_batch.load_mission"),
      dataIndex: "loadMissionId",
      key: "loadMissionId",
      width: 180,
      render: (v: string | null) => (v ? missionLabel.get(v) ?? v : "—"),
    },
    {
      title: t("stack_batch.offload_mission"),
      dataIndex: "offloadMissionId",
      key: "offloadMissionId",
      width: 180,
      render: (v: string | null) => (v ? missionLabel.get(v) ?? v : "—"),
    },
    {
      title: t("stack_batch.load_priority"),
      dataIndex: "loadPriority",
      key: "loadPriority",
      width: 90,
    },
    {
      title: t("stack_batch.offload_priority"),
      dataIndex: "offloadPriority",
      key: "offloadPriority",
      width: 90,
    },
    {
      title: t("stack_batch.disable"),
      dataIndex: "disable",
      key: "disable",
      width: 80,
      render: (v: boolean) => (v ? <Tag>OFF</Tag> : "—"),
    },
    {
      title: t("stack_batch.cargo"),
      key: "cargo",
      width: 70,
      render: (_, r) => r.cargo?.length ?? 0,
    },
  ];

  const missionSelect = (
    value: string | null,
    onChange: (v: string | null) => void,
    enabled: boolean,
  ) => (
    <Select
      allowClear
      disabled={!enabled}
      value={value ?? undefined}
      onChange={(v) => onChange(v ?? null)}
      options={missionOptions}
      placeholder={t("stack_batch.clear_mission")}
      showSearch={{
        filterOption: (input, option) =>
          (option?.label ?? "").toLowerCase().includes(input.toLowerCase()),
      }}
      style={{ width: "100%" }}
    />
  );

  const toggle = (checked: boolean, onChange: (v: boolean) => void) => (
    <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)}>
      {t("stack_batch.change")}
    </Checkbox>
  );

  return (
    <PanelShell>
      {contextHolder}

      <Section>
        <SectionTitle>
          <AppstoreOutlined />
          {t("stack_batch.title")}
        </SectionTitle>
        <Hint>{t("stack_batch.hint")}</Hint>

        <FieldGrid $cols={2}>
          <Field>
            <FieldLabel>
              {t("stack_batch.load_mission")} {toggle(editLoad, setEditLoad)}
            </FieldLabel>
            {missionSelect(loadMissionId, setLoadMissionId, editLoad)}
          </Field>
          <Field>
            <FieldLabel>
              {t("stack_batch.offload_mission")}{" "}
              {toggle(editOffload, setEditOffload)}
            </FieldLabel>
            {missionSelect(offloadMissionId, setOffloadMissionId, editOffload)}
          </Field>
          <Field>
            <FieldLabel>
              {t("stack_batch.load_priority")}{" "}
              {toggle(editLoadPriority, setEditLoadPriority)}
            </FieldLabel>
            <InputNumber
              min={0}
              precision={0}
              disabled={!editLoadPriority}
              value={loadPriority}
              onChange={(v) => setLoadPriority(v ?? 0)}
              style={{ width: "100%" }}
            />
          </Field>
          <Field>
            <FieldLabel>
              {t("stack_batch.offload_priority")}{" "}
              {toggle(editOffloadPriority, setEditOffloadPriority)}
            </FieldLabel>
            <InputNumber
              min={0}
              precision={0}
              disabled={!editOffloadPriority}
              value={offloadPriority}
              onChange={(v) => setOffloadPriority(v ?? 0)}
              style={{ width: "100%" }}
            />
          </Field>
          <Field>
            <FieldLabel>
              {t("stack_batch.disable")} {toggle(editDisable, setEditDisable)}
            </FieldLabel>
            <Switch
              disabled={!editDisable}
              checked={disable}
              onChange={setDisable}
            />
          </Field>
        </FieldGrid>
      </Section>

      <Section>
        <SectionTitle>
          <Switch size="small" checked={rename} onChange={setRename} />
          {t("stack_batch.rename")}
        </SectionTitle>

        {rename && (
          <>
            <Radio.Group
              value={mode}
              onChange={(e) => setMode(e.target.value as RenameMode)}
              optionType="button"
              options={[
                { value: "seq", label: t("stack_batch.mode_seq") },
                { value: "loc", label: t("stack_batch.mode_loc") },
              ]}
            />
            <FieldGrid $cols={2}>
              <Field>
                <FieldLabel>{t("stack_batch.prefix")}</FieldLabel>
                <Input
                  value={prefix}
                  status={prefixValid ? undefined : "error"}
                  onChange={(e) => setPrefix(e.target.value)}
                />
              </Field>
              {mode === "seq" && (
                <>
                  <Field>
                    <FieldLabel>{t("stack_batch.start")}</FieldLabel>
                    <InputNumber
                      min={0}
                      precision={0}
                      value={start}
                      onChange={(v) => setStart(v ?? 0)}
                      style={{ width: "100%" }}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>{t("stack_batch.digits")}</FieldLabel>
                    <InputNumber
                      min={1}
                      max={6}
                      precision={0}
                      value={digits}
                      onChange={(v) => setDigits(v ?? 1)}
                      style={{ width: "100%" }}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>{t("stack_batch.order")}</FieldLabel>
                    <Radio.Group
                      value={order}
                      onChange={(e) => setOrder(e.target.value as RenameOrder)}
                      options={[
                        {
                          value: "location",
                          label: t("stack_batch.order_location"),
                        },
                        { value: "name", label: t("stack_batch.order_name") },
                      ]}
                    />
                  </Field>
                </>
              )}
            </FieldGrid>
            {!prefixValid && <WarnNote>{t("stack_batch.invalid_prefix")}</WarnNote>}
            {newNames.size > 0 && (
              <Hint>
                {t("stack_batch.preview", {
                  first: [...newNames.values()][0],
                  last: [...newNames.values()][newNames.size - 1],
                })}
              </Hint>
            )}
          </>
        )}
      </Section>

      <Section>
        <Toolbar>
          <CountNote>
            {t("stack_batch.selected", { count: selectedIds.length })}
          </CountNote>
          <Popconfirm
            title={t("stack_batch.confirm", { count: selectedIds.length })}
            okText={t("utils.confirm")}
            cancelText={t("utils.cancel")}
            onConfirm={apply}
            disabled={
              selectedIds.length === 0 ||
              !hasFieldChange ||
              invalidNames.length > 0
            }
          >
            <SolidButton
              disabled={
                mutation.isPending ||
                selectedIds.length === 0 ||
                !hasFieldChange ||
                invalidNames.length > 0
              }
            >
              <CheckOutlined />
              {t("stack_batch.apply")}
            </SolidButton>
          </Popconfirm>
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState>{t("stack_batch.no_stack")}</EmptyState>
        ) : (
          <TableWrap>
            <Table<Stack_Info>
              size="small"
              rowKey="locationId"
              dataSource={rows}
              columns={columns}
              scroll={{ x: "max-content" }}
              pagination={false}
              rowSelection={{
                // 其他欄有 fixed:left,勾選欄不固定的話會被蓋住/捲走
                fixed: true,
                selectedRowKeys: selectedIds,
                onChange: (keys) => setSelectedIds(keys as string[]),
              }}
              // 點整列也能切換選取,不用精準點到勾選框
              onRow={(r) => ({
                onClick: () => toggleRow(r.locationId),
                style: { cursor: "pointer" },
              })}
            />
          </TableWrap>
        )}
      </Section>
    </PanelShell>
  );
};

export default StackBatchPanel;
