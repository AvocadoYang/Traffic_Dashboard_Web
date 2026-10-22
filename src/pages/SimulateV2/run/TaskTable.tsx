import { FC, useMemo, useState } from "react";
import { App, Button, Table } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { LoadRecord } from "../engine/types";
import { downloadBlob } from "../io/image";
import { safeFileName } from "../io/projectFile";
import type { RunOutcome } from "../state/runAtoms";
import { fmtClock, fmtDuration } from "./format";
import { T, addTasksSheet } from "./report/excelReport";

const TaskTable: FC<{ outcome: RunOutcome; projectName: string }> = ({ outcome, projectName }) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const { result, doc } = outcome;
  const names = useMemo(() => new Map(doc.nodes.map((n) => [n.id, n.name])), [doc.nodes]);
  const clock = (s: number) => (s >= 0 ? fmtClock(result.startClock, s) : "–");

  const exportXlsx = async () => {
    setBusy(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      addTasksSheet(wb, t as unknown as T, outcome);
      const buf = await wb.xlsx.writeBuffer();
      downloadBlob(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `${safeFileName(projectName)}-${t("sim_v2.result.tab_tasks")}.xlsx`,
      );
    } catch (err) {
      message.error(t("sim_v2.result.export_failed", { reason: err instanceof Error ? err.message : String(err) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="simv2-task-table">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, color: "var(--c-text-secondary)", fontSize: 12 }}>
        <span>{t("sim_v2.result.task_count", { count: result.loads.length })}</span>
        <Button size="small" icon={<DownloadOutlined />} loading={busy} onClick={() => void exportXlsx()} data-testid="simv2-export-tasks">
          {t("sim_v2.result.export_xlsx")}
        </Button>
      </div>
      <Table<LoadRecord>
        size="small"
        rowKey="id"
        dataSource={result.loads}
        scroll={{ x: 360 }}
        pagination={{ pageSize: 20, size: "small", showSizeChanger: false }}
        columns={[
          { title: "#", dataIndex: "id", width: 52 },
          { title: t("sim_v2.task.created"), key: "created", width: 76, render: (_, l) => clock(l.created) },
          { title: t("sim_v2.task.wait"), key: "wait", width: 58, align: "right", render: (_, l) => (l.pickStart >= 0 ? fmtDuration(l.pickStart - l.created) : "–") },
          {
            title: t("sim_v2.task.route"),
            key: "route",
            render: (_, l) => `${l.from ? names.get(l.from) ?? "?" : "–"} → ${l.to ? names.get(l.to) ?? "?" : "–"}`,
          },
          { title: t("sim_v2.task.vehicle"), dataIndex: "vehicle", width: 76, render: (v: string | null) => v ?? "–" },
        ]}
      />
    </div>
  );
};

export default TaskTable;
