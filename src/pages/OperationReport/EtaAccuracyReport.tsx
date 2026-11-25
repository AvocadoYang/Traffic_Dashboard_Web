import { FC } from "react";
import { Empty, Table } from "antd";
import type { TableColumnsType } from "antd";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  EtaAccuracyReport as Report,
  EtaAccuracyRow,
  EtaAccuracyStat,
} from "@/api/useEtaAccuracyReport";
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
import { c } from "@/theme/tokens";

const FiveTiles = styled(Tiles)`
  ${mq.web} {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
`;

/** 秒數顯示: 90 -> 1m 30s; 帶正負號的誤差另外處理 */
const dur = (s: number) => {
  const abs = Math.abs(s);
  const text = abs < 60 ? `${abs.toFixed(0)}s` : `${Math.floor(abs / 60)}m ${Math.round(abs % 60)}s`;
  return s < 0 ? `-${text}` : text;
};
const signed = (s: number) => (s > 0 ? `+${dur(s)}` : dur(s));
const pct = (r: number) => `${Math.round(r * 1000) / 10}%`;

/** 誤差的顏色: 準 (1 分鐘或 20% 內) 綠, 比預估晚紅, 比預估早藍 */
const errorColor = (r: { predictedSec: number; errorSec: number }) =>
  Math.abs(r.errorSec) <= Math.max(60, r.predictedSec * 0.2)
    ? c.success
    : r.errorSec > 0
      ? c.danger
      : c.accent;

const EtaAccuracyReportBody: FC<{ report: Report }> = ({ report }) => {
  const { t } = useTranslation();
  const s = report.summary;

  if (s.count === 0) {
    return <Empty description={t("report.eta_accuracy.none")} />;
  }

  const tiles = [
    { key: "count", label: t("report.eta_accuracy.tile.count"), value: s.count },
    { key: "abs_avg", label: t("report.eta_accuracy.tile.abs_avg"), value: dur(s.absErrorAvg) },
    { key: "bias", label: t("report.eta_accuracy.tile.bias"), value: signed(s.bias) },
    { key: "p90", label: t("report.eta_accuracy.tile.p90"), value: dur(s.absErrorP90) },
    { key: "within", label: t("report.eta_accuracy.tile.within"), value: pct(s.withinRate) },
  ];

  const statColumns = <T extends EtaAccuracyStat>(): TableColumnsType<T> => {
    const col = (
      title: string,
      pick: (r: T) => number,
      render: (v: number) => string,
    ): TableColumnsType<T>[number] => ({
      title,
      align: "right",
      sorter: (a: T, b: T) => pick(a) - pick(b),
      render: (_: unknown, r: T) => render(pick(r)),
    });
    return [
      col(t("report.eta_accuracy.col.count"), (r) => r.count, String),
      col(t("report.eta_accuracy.col.predicted"), (r) => r.predictedAvg, dur),
      col(t("report.eta_accuracy.col.actual"), (r) => r.actualAvg, dur),
      col(t("report.eta_accuracy.col.abs_avg"), (r) => r.absErrorAvg, dur),
      col(t("report.eta_accuracy.col.bias"), (r) => r.bias, signed),
      col(t("report.eta_accuracy.col.within"), (r) => r.withinRate, pct),
    ];
  };

  const routeColumns: TableColumnsType<Report["routes"][number]> = [
    { title: t("report.eta_accuracy.col.route"), dataIndex: "route" },
    ...statColumns<Report["routes"][number]>(),
  ];
  const vehicleColumns: TableColumnsType<Report["vehicles"][number]> = [
    { title: t("report.eta_accuracy.col.vehicle"), dataIndex: "amrId" },
    ...statColumns<Report["vehicles"][number]>(),
  ];
  const worstColumns: TableColumnsType<EtaAccuracyRow> = [
    { title: t("report.eta_accuracy.col.mission"), dataIndex: "missionId" },
    { title: t("report.eta_accuracy.col.vehicle"), dataIndex: "amrId" },
    { title: t("report.eta_accuracy.col.route"), dataIndex: "route" },
    {
      title: t("report.eta_accuracy.col.assigned_at"),
      dataIndex: "assignedAt",
      render: (v: number) => dayjs(v).format("MM-DD HH:mm"),
    },
    { title: t("report.eta_accuracy.col.predicted"), dataIndex: "predictedSec", align: "right", render: dur },
    { title: t("report.eta_accuracy.col.actual"), dataIndex: "actualSec", align: "right", render: dur },
    {
      title: t("report.eta_accuracy.col.error"),
      dataIndex: "errorSec",
      align: "right",
      render: (_: number, r) => <span style={{ color: errorColor(r), fontWeight: 600 }}>{signed(r.errorSec)}</span>,
    },
  ];

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
          <PanelTitle>{t("report.eta_accuracy.by_route")}</PanelTitle>
          <PanelHint>{t("report.eta_accuracy.hint")}</PanelHint>
        </PanelHead>
        <PanelBody>
          <Table
            size="small"
            rowKey="route"
            pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
            dataSource={report.routes}
            columns={routeColumns}
            scroll={{ x: "max-content" }}
          />
        </PanelBody>
      </Panel>

      <TwoColumns>
        <Panel>
          <PanelHead>
            <PanelTitle>{t("report.eta_accuracy.by_vehicle")}</PanelTitle>
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
        <Panel>
          <PanelHead>
            <PanelTitle>{t("report.eta_accuracy.worst")}</PanelTitle>
            <PanelHint>{t("report.eta_accuracy.largest_first")}</PanelHint>
          </PanelHead>
          <PanelBody>
            <Table
              size="small"
              rowKey="missionId"
              pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
              dataSource={report.worst}
              columns={worstColumns}
              scroll={{ x: "max-content" }}
            />
          </PanelBody>
        </Panel>
      </TwoColumns>
    </>
  );
};

export default EtaAccuracyReportBody;
