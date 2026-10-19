/** 下載 Excel 報告 (單次執行或車數掃描) */
import { useState } from "react";
import { App } from "antd";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { downloadBlob } from "../../io/image";
import { safeFileName } from "../../io/projectFile";
import { projectAtom } from "../../state/editorAtoms";
import type { RunOutcome, SweepOutcome } from "../../state/runAtoms";
import { T, singleReport, sweepReport } from "./excelReport";
import { renderMapImage } from "./mapImage";

const stamp = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;

export function useExportReport() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const project = useAtomValue(projectAtom);
  const [busy, setBusy] = useState(false);
  const tt = t as unknown as T;

  const run = async (job: (name: string, now: Date) => Promise<{ blob: Blob; suffix: string }>) => {
    if (!project) return;
    setBusy(true);
    try {
      const now = new Date();
      const { blob, suffix } = await job(project.name, now);
      downloadBlob(blob, `${safeFileName(project.name)}-${suffix}-${stamp(now)}.xlsx`);
    } catch (err) {
      message.error(t("sim_v2.result.export_failed", { reason: err instanceof Error ? err.message : String(err) }));
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    single: (outcome: RunOutcome) =>
      run(async (name, now) => {
        const map = await renderMapImage(outcome.projectId, outcome.doc, outcome.result);
        return { blob: await singleReport(tt, { projectName: name, generatedAt: now }, outcome, map), suffix: t("sim_v2.report.file_single") };
      }),
    sweep: (sweep: SweepOutcome) =>
      run(async (name, now) => {
        const map = await renderMapImage(sweep.projectId, sweep.doc, null);
        return { blob: await sweepReport(tt, { projectName: name, generatedAt: now }, sweep, map), suffix: t("sim_v2.report.file_sweep") };
      }),
  };
}
