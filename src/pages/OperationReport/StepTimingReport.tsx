import { FC } from "react";
import { Empty, Table, Tag } from "antd";
import type { TableColumnsType } from "antd";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import {
  StepLocationRow,
  StepStat,
  StepStatRow,
  StepTimingReport as Report,
  StepTypeRow,
  StepVehicleRow,
} from "@/api/useStepTimingReport";
import {
  Panel,
  PanelBody,
  PanelHead,
  PanelHint,
  PanelTitle,
  Tile,
  TileLabel,
  TileValue,
  Tiles,
  TwoColumns,
} from "./reportParts";
import { mq } from "@/styles/responsive";

const FiveTiles = styled(Tiles)`
  ${mq.web} {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
`;

/** 毫秒 -> 秒, 一位小數 */
const sec = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

const StepTimingReportBody: FC<{ report: Report }> = ({ report }) => {
  const { t } = useTranslation();
  const s = report.summary;

  const typeNames: Record<string, string> = {
    move: t("report.step_timing.type.move"),
    load: t("report.step_timing.type.load"),
    offload: t("report.step_timing.type.offload"),
    charge: t("report.step_timing.type.charge"),
    upper_control: t("report.step_timing.type.upper_control"),
    spin: t("report.step_timing.type.spin"),
    fork: t("report.step_timing.type.fork"),
  };
  const typeName = (type: string) => typeNames[type] ?? type;

  const tiles = [
    { key: "steps", label: t("report.step_timing.tile.steps"), value: s.steps },
    { key: "gap_avg", label: t("report.step_timing.tile.gap_avg"), value: sec(s.gap.avg) },
    { key: "gap_p90", label: t("report.step_timing.tile.gap_p90"), value: sec(s.gap.p90) },
    { key: "run_avg", label: t("report.step_timing.tile.run_avg"), value: sec(s.run.avg) },
    { key: "run_p90", label: t("report.step_timing.tile.run_p90"), value: sec(s.run.p90) },
  ];

  /** 每個維度共用的統計欄位; 欄位名稱固定, 排序用數字 */
  const statColumns = <T extends StepStatRow>(): TableColumnsType<T> => {
    const col = (
      title: string,
      pick: (r: T) => number,
      render: (v: number) => string = sec,
    ): TableColumnsType<T>[number] => ({
      title,
      align: "right",
      sorter: (a: T, b: T) => pick(a) - pick(b),
      render: (_: unknown, r: T) => render(pick(r)),
    });
    const stat = (k: "gap" | "run", f: keyof StepStat) => (r: T) => r[k][f];
    return [
      col(t("report.step_timing.col.count"), (r) => r.count, String),
      {
        title: t("report.step_timing.col.gap"),
        children: [
          col(t("report.step_timing.col.avg"), stat("gap", "avg")),
          col(t("report.step_timing.col.p90"), stat("gap", "p90")),
          col(t("report.step_timing.col.max"), stat("gap", "max")),
        ],
      },
      {
        title: t("report.step_timing.col.run"),
        children: [
          col(t("report.step_timing.col.avg"), stat("run", "avg")),
          col(t("report.step_timing.col.p90"), stat("run", "p90")),
          col(t("report.step_timing.col.max"), stat("run", "max")),
        ],
      },
    ];
  };

  const typeColumns: TableColumnsType<StepTypeRow> = [
    {
      title: t("report.step_timing.col.type"),
      dataIndex: "type",
      render: (v: string) => <Tag>{typeName(v)}</Tag>,
    },
    ...statColumns<StepTypeRow>(),
  ];
  const locationColumns: TableColumnsType<StepLocationRow> = [
    { title: t("report.step_timing.col.location"), dataIndex: "locationId" },
    ...statColumns<StepLocationRow>(),
  ];
  const vehicleColumns: TableColumnsType<StepVehicleRow> = [
    { title: t("report.step_timing.col.vehicle"), dataIndex: "amrId" },
    ...statColumns<StepVehicleRow>(),
  ];

  if (s.steps === 0) {
    return <Empty description={t("report.step_timing.none")} />;
  }

  return (
    <>
      <FiveTiles>
        {tiles.map((tile) => (
          <Tile key={tile.key}>
            <TileLabel>{tile.label}</TileLabel>
            <TileValue>{tile.value}</TileValue>
          </Tile>
        ))}
      </FiveTiles>

      <Panel>
        <PanelHead>
          <PanelTitle>{t("report.step_timing.by_type")}</PanelTitle>
          <PanelHint>{t("report.step_timing.hint")}</PanelHint>
        </PanelHead>
        <PanelBody>
          <Table
            size="small"
            rowKey="type"
            pagination={false}
            dataSource={report.types}
            columns={typeColumns}
            scroll={{ x: "max-content" }}
          />
        </PanelBody>
      </Panel>

      <TwoColumns>
        <Panel>
          <PanelHead>
            <PanelTitle>{t("report.step_timing.by_location")}</PanelTitle>
            <PanelHint>{t("report.step_timing.slowest_first")}</PanelHint>
          </PanelHead>
          <PanelBody>
            <Table
              size="small"
              rowKey="locationId"
              pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
              dataSource={report.locations}
              columns={locationColumns}
              scroll={{ x: "max-content" }}
            />
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHead>
            <PanelTitle>{t("report.step_timing.by_vehicle")}</PanelTitle>
          </PanelHead>
          <PanelBody>
            <Table
              size="small"
              rowKey="amrId"
              pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
              dataSource={report.vehicles}
              columns={vehicleColumns}
              scroll={{ x: "max-content" }}
            />
          </PanelBody>
        </Panel>
      </TwoColumns>
    </>
  );
};

export default StepTimingReportBody;
