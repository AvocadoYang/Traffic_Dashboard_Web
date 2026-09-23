import {
  DispatchWidget,
  STATS_METRIC_LABEL_KEY,
} from "@/api/useMissionDispatchBoard";
import useDispatchWidgetStats from "@/api/useDispatchWidgetStats";
import { Empty, Spin, Table } from "antd";
import React, { FC } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styled from "styled-components";
import DispatchItemFrame from "./DispatchItemFrame";
import {
  MAX_WIDGET_HEIGHT,
  MAX_WIDGET_WIDTH,
  MIN_WIDGET_HEIGHT,
  MIN_WIDGET_WIDTH,
} from "./gridConstants";
import {
  CATEGORICAL_PALETTE,
  CHART_GRID,
  CHART_TEXT_SECONDARY,
  SEQUENTIAL_BLUE,
  toPieSeries,
} from "./chartPalette";

const Card = styled.div<{
  $width: number;
  $height: number;
  $editable: boolean;
}>`
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
  border-radius: 8px;
  background: var(--c-bg);
  border: 1px solid var(--c-bg-muted);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  cursor: ${({ $editable }) => ($editable ? "grab" : "default")};
`;

const TitleBar = styled.div`
  padding: 8px 12px;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid var(--c-bg-muted);
  background: var(--c-bg-subtle);
  flex-shrink: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const ChartArea = styled.div`
  flex: 1;
  min-height: 0;
  min-width: 0;
  padding: 8px;
`;

const TableScroll = styled.div`
  height: 100%;
  overflow: auto;
`;

const CenterFill = styled.div`
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StatsChartWidgetCard: FC<{
  widget: DispatchWidget;
  editMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onResizeEnd: (width: number, height: number) => void;
}> = ({ widget, editMode, onEdit, onDelete, onResizeEnd }) => {
  const { t } = useTranslation();
  const metric = widget.chartConfig?.metric;
  const { data: result, isLoading } = useDispatchWidgetStats(
    widget.chartConfig ?? undefined,
  );

  const title =
    widget.title ||
    (metric
      ? t(STATS_METRIC_LABEL_KEY[metric])
      : t("mission_dispatch_board.stats_chart_widget"));

  const renderBody = () => {
    if (!metric) {
      return (
        <CenterFill>
          <Empty
            description={t("mission_dispatch_board.stats_metric_not_set")}
          />
        </CenterFill>
      );
    }
    if (isLoading) {
      return (
        <CenterFill>
          <Spin />
        </CenterFill>
      );
    }
    const isEmpty =
      !result ||
      (result.chartType === "table"
        ? result.rows.length === 0
        : result.data.length === 0);
    if (!result || isEmpty) {
      return (
        <CenterFill>
          <Empty
            description={t("mission_dispatch_board.stats_no_data")}
          />
        </CenterFill>
      );
    }

    if (result.chartType === "table") {
      return (
        <TableScroll>
          <Table
            size="small"
            pagination={false}
            rowKey={(_, index) => String(index)}
            columns={result.columns.map((col) => ({
              key: col.key,
              dataIndex: col.key,
              title: col.label,
            }))}
            dataSource={result.rows}
          />
        </TableScroll>
      );
    }

    if (result.chartType === "pie") {
      const series = toPieSeries(result.data);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={series}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius="70%"
              label={({ label, percent }) =>
                `${label} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
            >
              {series.map((entry, index) => (
                <Cell
                  key={entry.label}
                  fill={CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `${value} ${result.unit}`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (result.chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={result.data} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid stroke={CHART_GRID} horizontal={false} />
            <XAxis type="number" stroke={CHART_TEXT_SECONDARY} fontSize={11} />
            <YAxis
              type="category"
              dataKey="label"
              stroke={CHART_TEXT_SECONDARY}
              fontSize={11}
              width={80}
            />
            <Tooltip formatter={(value: number) => `${value} ${result.unit}`} />
            <Bar dataKey="value" fill={SEQUENTIAL_BLUE} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // line
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={result.data} margin={{ left: 4, right: 12 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            stroke={CHART_TEXT_SECONDARY}
            fontSize={11}
          />
          <YAxis stroke={CHART_TEXT_SECONDARY} fontSize={11} />
          <Tooltip formatter={(value: number) => `${value} ${result.unit}`} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={SEQUENTIAL_BLUE}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <DispatchItemFrame
      id={widget.id}
      x={widget.x}
      y={widget.y}
      width={widget.width}
      height={widget.height}
      editMode={editMode}
      minWidth={MIN_WIDGET_WIDTH}
      maxWidth={MAX_WIDGET_WIDTH}
      minHeight={MIN_WIDGET_HEIGHT}
      maxHeight={MAX_WIDGET_HEIGHT}
      onEdit={onEdit}
      onDelete={onDelete}
      onResizeEnd={onResizeEnd}
    >
      {({ width, height }) => (
        <Card $width={width} $height={height} $editable={editMode}>
          <TitleBar title={title}>{title}</TitleBar>
          <ChartArea>{renderBody()}</ChartArea>
        </Card>
      )}
    </DispatchItemFrame>
  );
};

export default StatsChartWidgetCard;
