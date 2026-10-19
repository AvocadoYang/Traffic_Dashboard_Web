import { FC, useMemo } from "react";
import { Button, Segmented, Select, Table, TimePicker, Tooltip } from "antd";
import type { TableColumnsType } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, ExclamationCircleFilled, PlusOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { BlurNumber } from "../editor/fields";
import { STATION_COLORS } from "../editor/hooks";
import { addDemandRow, deleteDemandRow, moveDemandRow, updateDemandRow } from "../model/setupOps";
import { DemandMode, DemandRow, SimDoc, StationType } from "../model/types";
import { Issue, validateDoc } from "../model/validate";
import { commitAtom, docAtom } from "../state/editorAtoms";
import { Card, CardTitle, Hint, Page, SummaryLine } from "./layout";

const naturalCompare = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

const toDayjs = (s: string | null): Dayjs | null => {
  if (!s) return null;
  const [h, m] = s.split(":").map(Number);
  return dayjs().hour(h).minute(m).second(0).millisecond(0);
};

const Swatch: FC<{ type?: StationType; group?: boolean }> = ({ type, group }) => (
  <i
    style={{
      display: "inline-block",
      width: 9,
      height: 9,
      marginRight: 6,
      borderRadius: group ? "50%" : 2,
      background: group ? "var(--c-text-muted)" : STATION_COLORS[type ?? "both"],
      verticalAlign: -1,
    }}
  />
);

/** 「從 / 到」下拉選單的選項: 群組在前, 再來是站點 (只列得了取貨 / 放貨的) */
function useEndpointOptions(doc: SimDoc, need: "pick" | "drop") {
  const { t } = useTranslation();
  return useMemo(() => {
    const ok = (type: StationType) => (need === "pick" ? type !== "drop" : type !== "pick");
    const stations = doc.nodes.filter((n) => n.kind === "station" && n.station && ok(n.station.type));
    const stationIds = new Set(stations.map((n) => n.id));
    const groups = doc.groups
      .map((g) => ({ g, members: g.nodeIds.filter((id) => stationIds.has(id)).length }))
      .filter((x) => x.members > 0)
      .sort((a, b) => naturalCompare(a.g.name, b.g.name));
    return [
      ...(groups.length
        ? [
            {
              label: t("sim_v2.demand.groups"),
              options: groups.map(({ g, members }) => ({
                value: g.id,
                search: g.name,
                label: (
                  <span>
                    <Swatch group />
                    {t("sim_v2.demand.group_option", { name: g.name, count: members })}
                  </span>
                ),
              })),
            },
          ]
        : []),
      {
        label: t("sim_v2.demand.stations"),
        options: stations
          .sort((a, b) => naturalCompare(a.name, b.name))
          .map((n) => ({
            value: n.id,
            search: n.name,
            label: (
              <span>
                <Swatch type={n.station!.type} />
                {n.name}
              </span>
            ),
          })),
      },
    ];
  }, [doc.nodes, doc.groups, need, t]);
}

const DemandTab: FC = () => {
  const { t } = useTranslation();
  const doc = useAtomValue(docAtom);
  const commit = useSetAtom(commitAtom);
  const fromOptions = useEndpointOptions(doc, "pick");
  const toOptions = useEndpointOptions(doc, "drop");
  const issues = useMemo(() => validateDoc(doc), [doc]);
  const rowIssues = useMemo(() => {
    const map = new Map<number, Issue[]>();
    for (const x of issues) {
      const row = typeof x.params?.row === "number" ? x.params.row : null;
      if (row === null) continue;
      map.set(row, [...(map.get(row) ?? []), x]);
    }
    return map;
  }, [issues]);
  const known = useMemo(() => new Set([...doc.nodes.map((n) => n.id), ...doc.groups.map((g) => g.id)]), [doc.nodes, doc.groups]);
  const total = doc.demand.reduce((s, d) => s + (d.perHour > 0 ? d.perHour : 0), 0);
  const windowed = doc.demand.some((d) => d.start && d.end);
  const update = (id: string, patch: Partial<DemandRow>) => commit((d) => updateDemandRow(d, id, patch));

  const endpointSelect = (row: DemandRow, side: "from" | "to") => {
    const value = row[side] || undefined;
    const options = side === "from" ? fromOptions : toOptions;
    const missing = value && !known.has(value) ? [{ label: t("sim_v2.demand.deleted"), options: [{ value, search: "", label: <span style={{ color: "var(--c-danger)" }}>{t("sim_v2.demand.missing")}</span> }] }] : [];
    return (
      <Select
        size="small"
        showSearch
        style={{ width: "100%" }}
        placeholder={t(`sim_v2.demand.pick_${side}`)}
        value={value}
        options={[...missing, ...options]}
        filterOption={(input, option) => String((option as { search?: string })?.search ?? "").toLowerCase().includes(input.toLowerCase())}
        onChange={(v: string) => update(row.id, { [side]: v })}
        data-testid={`simv2-demand-${side}`}
        popupMatchSelectWidth={false}
      />
    );
  };

  const columns: TableColumnsType<DemandRow> = [
    {
      title: "#",
      key: "index",
      width: 48,
      render: (_, row, i) => {
        const list = rowIssues.get(i + 1) ?? [];
        const errors = list.filter((x) => x.level === "error");
        return (
          <span style={{ whiteSpace: "nowrap" }}>
            {i + 1}
            {list.length > 0 && (
              <Tooltip title={list.map((x) => t(`sim_v2.check.${x.code}`, x.params)).join("\n")}>
                <ExclamationCircleFilled style={{ marginLeft: 6, color: errors.length ? "var(--c-danger)" : "var(--c-warning)" }} data-testid="simv2-demand-issue" />
              </Tooltip>
            )}
          </span>
        );
      },
    },
    { title: t("sim_v2.demand.from"), key: "from", width: 200, render: (_, row) => endpointSelect(row, "from") },
    { title: t("sim_v2.demand.to"), key: "to", width: 200, render: (_, row) => endpointSelect(row, "to") },
    {
      title: t("sim_v2.demand.perHour"),
      key: "perHour",
      width: 110,
      render: (_, row) => (
        <BlurNumber
          value={row.perHour}
          min={0}
          max={100000}
          step={1}
          testId="simv2-demand-rate"
          onCommit={(v) => v !== null && update(row.id, { perHour: v })}
        />
      ),
    },
    {
      title: (
        <Tooltip title={t("sim_v2.demand.mode_help")}>
          <span>{t("sim_v2.demand.mode")}</span>
        </Tooltip>
      ),
      key: "mode",
      width: 150,
      render: (_, row) => (
        <Segmented<DemandMode>
          size="small"
          value={row.mode}
          options={(["fixed", "random"] as DemandMode[]).map((m) => ({ value: m, label: t(`sim_v2.demand.mode_${m}`) }))}
          onChange={(m) => update(row.id, { mode: m })}
        />
      ),
    },
    {
      title: (
        <Tooltip title={t("sim_v2.demand.window_help")}>
          <span>{t("sim_v2.demand.window")}</span>
        </Tooltip>
      ),
      key: "window",
      width: 210,
      render: (_, row) => (
        <TimePicker.RangePicker
          size="small"
          format="HH:mm"
          order={false}
          minuteStep={5}
          needConfirm={false}
          placeholder={[t("sim_v2.demand.all_day"), ""]}
          value={row.start && row.end ? [toDayjs(row.start), toDayjs(row.end)] : null}
          onChange={(v) => {
            const [a, b] = v ?? [null, null];
            if (a && b) update(row.id, { start: a.format("HH:mm"), end: b.format("HH:mm") });
            else update(row.id, { start: null, end: null });
          }}
          data-testid="simv2-demand-window"
        />
      ),
    },
    {
      title: (
        <Tooltip title={t("sim_v2.demand.priority_help")}>
          <span>{t("sim_v2.demand.priority")}</span>
        </Tooltip>
      ),
      key: "priority",
      width: 80,
      render: (_, row) => (
        <BlurNumber value={row.priority} min={-1000} max={1000} step={1} precision={0} onCommit={(v) => v !== null && update(row.id, { priority: v })} />
      ),
    },
    {
      key: "actions",
      width: 96,
      render: (_, row, i) => (
        <span style={{ whiteSpace: "nowrap" }}>
          <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={i === 0} aria-label={t("sim_v2.demand.up")} onClick={() => commit((d) => moveDemandRow(d, row.id, -1))} />
          <Button
            size="small"
            type="text"
            icon={<ArrowDownOutlined />}
            disabled={i === doc.demand.length - 1}
            aria-label={t("sim_v2.demand.down")}
            onClick={() => commit((d) => moveDemandRow(d, row.id, 1))}
          />
          <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label={t("sim_v2.demand.delete")} onClick={() => commit((d) => deleteDemandRow(d, row.id))} />
        </span>
      ),
    },
  ];

  return (
    <Page data-testid="simv2-demand-tab">
      <Card>
        <CardTitle>
          <span>{t("sim_v2.demand.title")}</span>
          <Button size="small" icon={<PlusOutlined />} onClick={() => commit((d) => addDemandRow(d))} data-testid="simv2-add-demand">
            {t("sim_v2.demand.add")}
          </Button>
        </CardTitle>
        <Table<DemandRow>
          size="small"
          rowKey="id"
          columns={columns}
          dataSource={doc.demand}
          pagination={false}
          scroll={{ x: 1060 }}
          locale={{ emptyText: t("sim_v2.demand.empty") }}
        />
        <SummaryLine data-testid="simv2-demand-total">
          <span>{t("sim_v2.demand.total", { total: Math.round(total * 10) / 10 })}</span>
          {windowed && <span>{t("sim_v2.demand.total_window_note")}</span>}
        </SummaryLine>
      </Card>
      <Card>
        <CardTitle>{t("sim_v2.demand.how_title")}</CardTitle>
        <Hint>
          {t("sim_v2.demand.how_1")}
          <br />
          {t("sim_v2.demand.how_2")}
          <br />
          {t("sim_v2.demand.how_3")}
        </Hint>
      </Card>
    </Page>
  );
};

export default DemandTab;
