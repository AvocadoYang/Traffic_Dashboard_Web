import { FC } from "react";
import { Button, Switch, Table, Tooltip } from "antd";
import type { TableColumnsType } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { BlurNumber, BlurText } from "../editor/fields";
import { addVehicleType, deleteVehicleType, updateTraffic, updateVehicleType } from "../model/setupOps";
import { VehicleType } from "../model/types";
import { commitAtom, docAtom } from "../state/editorAtoms";
import { Card, CardTitle, Hint, Page, SummaryLine } from "./layout";

type NumKey = "count" | "length" | "width" | "speedEmpty" | "speedLoaded" | "accel" | "decel" | "turnSpeed";

/** 每個數字欄位的範圍和單位 */
const NUM_FIELDS: { key: NumKey; min: number; max: number; step: number; precision: number; unit: string; width: number }[] = [
  { key: "count", min: 0, max: 200, step: 1, precision: 0, unit: "count", width: 80 },
  { key: "length", min: 0.2, max: 30, step: 0.1, precision: 2, unit: "m", width: 90 },
  { key: "width", min: 0.2, max: 10, step: 0.1, precision: 2, unit: "m", width: 90 },
  { key: "speedEmpty", min: 0.05, max: 10, step: 0.1, precision: 2, unit: "mps", width: 100 },
  { key: "speedLoaded", min: 0.05, max: 10, step: 0.1, precision: 2, unit: "mps", width: 100 },
  { key: "accel", min: 0.01, max: 10, step: 0.05, precision: 2, unit: "mps2", width: 100 },
  { key: "decel", min: 0.01, max: 10, step: 0.05, precision: 2, unit: "mps2", width: 100 },
  { key: "turnSpeed", min: 1, max: 360, step: 5, precision: 0, unit: "degps", width: 100 },
];

const VehiclesTab: FC = () => {
  const { t } = useTranslation();
  const doc = useAtomValue(docAtom);
  const commit = useSetAtom(commitAtom);
  const types = doc.vehicleTypes;
  const total = types.reduce((s, x) => s + x.count, 0);
  const standby = doc.nodes.filter((n) => n.kind === "standby").length;
  const maxLen = Math.max(0, ...types.filter((x) => x.count > 0).map((x) => x.length));
  const cell = maxLen + doc.traffic.safetyGap;

  const columns: TableColumnsType<VehicleType> = [
    {
      title: t("sim_v2.vehicle.name"),
      dataIndex: "name",
      width: 150,
      render: (_, v) => (
        <BlurText value={v.name} maxLength={30} testId="simv2-vehicle-name" onCommit={(name) => commit((d) => updateVehicleType(d, v.id, { name }))} />
      ),
    },
    ...NUM_FIELDS.map((f) => ({
      title: (
        <Tooltip title={t(`sim_v2.vehicle.${f.key}_help`)}>
          <span>
            {t(`sim_v2.vehicle.${f.key}`)}
            {f.unit !== "count" && <small style={{ marginLeft: 4, color: "var(--c-text-muted)" }}>{t(`sim_v2.unit.${f.unit}`)}</small>}
          </span>
        </Tooltip>
      ),
      dataIndex: f.key,
      width: f.width,
      render: (_: unknown, v: VehicleType) => (
        <BlurNumber
          value={v[f.key]}
          min={f.min}
          max={f.max}
          step={f.step}
          precision={f.precision}
          testId={`simv2-vehicle-${f.key}`}
          onCommit={(x) => x !== null && commit((d) => updateVehicleType(d, v.id, { [f.key]: x } as Partial<VehicleType>))}
        />
      ),
    })),
    {
      title: (
        <Tooltip title={t("sim_v2.vehicle.canReverse_help")}>
          <span>{t("sim_v2.vehicle.canReverse")}</span>
        </Tooltip>
      ),
      dataIndex: "canReverse",
      width: 80,
      render: (_, v) => <Switch size="small" checked={v.canReverse} onChange={(on) => commit((d) => updateVehicleType(d, v.id, { canReverse: on }))} />,
    },
    {
      key: "actions",
      width: 48,
      render: (_, v) => (
        <Button
          size="small"
          type="text"
          danger
          icon={<DeleteOutlined />}
          aria-label={t("sim_v2.vehicle.delete")}
          onClick={() => commit((d) => deleteVehicleType(d, v.id))}
        />
      ),
    },
  ];

  return (
    <Page data-testid="simv2-vehicles-tab">
      <Card>
        <CardTitle>
          <span>{t("sim_v2.vehicle.title")}</span>
          <Button size="small" icon={<PlusOutlined />} onClick={() => commit((d) => addVehicleType(d))} data-testid="simv2-add-vehicle">
            {t("sim_v2.vehicle.add")}
          </Button>
        </CardTitle>
        <Table<VehicleType>
          size="small"
          rowKey="id"
          columns={columns}
          dataSource={types}
          pagination={false}
          scroll={{ x: 1100 }}
          locale={{ emptyText: t("sim_v2.vehicle.empty") }}
        />
        <SummaryLine data-testid="simv2-vehicle-summary">
          {t("sim_v2.vehicle.summary", { total, standby })}
          {total > standby && <span className="warn">{t("sim_v2.vehicle.need_standby", { need: total - standby })}</span>}
        </SummaryLine>
      </Card>
      <Card>
        <CardTitle>{t("sim_v2.traffic.title")}</CardTitle>
        <div style={{ display: "grid", gridTemplateColumns: "140px 140px minmax(0, 1fr)", gap: "12px 16px", alignItems: "center", maxWidth: 820 }}>
          <span>{t("sim_v2.traffic.safetyGap")}</span>
          <BlurNumber
            value={doc.traffic.safetyGap}
            min={0}
            max={10}
            step={0.1}
            precision={2}
            suffix={t("sim_v2.unit.m")}
            testId="simv2-safety-gap"
            onCommit={(x) => x !== null && commit((d) => updateTraffic(d, { safetyGap: x }))}
          />
          <Hint>{t("sim_v2.traffic.safetyGap_help", { cell: cell.toFixed(2) })}</Hint>
          <span>{t("sim_v2.traffic.turnThreshold")}</span>
          <BlurNumber
            value={doc.traffic.turnThresholdDeg}
            min={0}
            max={180}
            step={5}
            precision={0}
            suffix={t("sim_v2.unit.deg")}
            testId="simv2-turn-threshold"
            onCommit={(x) => x !== null && commit((d) => updateTraffic(d, { turnThresholdDeg: x }))}
          />
          <Hint>{t("sim_v2.traffic.turnThreshold_help")}</Hint>
        </div>
        <Hint style={{ marginTop: 12 }}>{t("sim_v2.traffic.two_way_note")}</Hint>
      </Card>
    </Page>
  );
};

export default VehiclesTab;
