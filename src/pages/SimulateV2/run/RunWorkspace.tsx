import { FC, useEffect } from "react";
import { Button, Empty, Spin } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useAtomValue, useStore } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { fileUrl } from "../api/simV2Api";
import { projectAtom } from "../state/editorAtoms";
import {
  presentAtom,
  reportOpenAtom,
  runModeAtom,
  runProgressAtom,
  shownOutcomeAtom,
  sweepOutcomeAtom,
  sweepPickAtom,
  sweepProgressAtom,
} from "../state/runAtoms";
import { autoLoadLatest, bindQueryClient, closeSweepPick } from "./controller";
import PlaybackBar, { usePlaybackLoop } from "./PlaybackBar";
import PresentMode from "./PresentMode";
import ReplayCanvas from "./ReplayCanvas";
import ReportPreview from "./report/ReportPreview";
import ResultsPanel from "./ResultsPanel";
import RunSettingsPanel from "./RunSettingsPanel";
import SweepResults from "./SweepResults";

const Grid = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr) 400px;
  grid-template-rows: minmax(0, 1fr) auto;
  background: var(--c-bg-muted);

  > .settings {
    grid-row: 1 / 3;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  > .settings > * {
    flex: 1 1 auto;
  }
  > .map {
    position: relative;
    min-height: 0;
  }
  > .playback {
    grid-column: 2;
  }
  > .results {
    grid-column: 3;
    grid-row: 1 / 3;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  > .results > * {
    flex: 1 1 auto;
  }

  @media (max-width: 1200px) {
    grid-template-columns: 250px minmax(0, 1fr);
    grid-template-rows: minmax(360px, 1fr) auto minmax(0, auto);
    > .results {
      grid-column: 1 / -1;
      grid-row: 3;
    }
  }
  @media (max-width: 700px) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(320px, 60vh) auto auto;
    > .settings {
      grid-row: 1;
    }
    > .map {
      grid-row: 2;
    }
    > .playback {
      grid-column: 1;
      grid-row: 3;
    }
    > .results {
      grid-row: 4;
    }
  }
`;

const Placeholder = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--c-text-secondary);
  text-align: center;
`;

/** 車數掃描裡點了某一次: 地圖右上角「回到掃描結果」 */
const PickBar = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 4px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  font-size: 12px;
`;

const RunWorkspace: FC = () => {
  const { t } = useTranslation();
  const store = useStore();
  const queryClient = useQueryClient();
  const project = useAtomValue(projectAtom);
  const mode = useAtomValue(runModeAtom);
  const shown = useAtomValue(shownOutcomeAtom);
  const progress = useAtomValue(runProgressAtom);
  const sweep = useAtomValue(sweepOutcomeAtom);
  const sweepProgress = useAtomValue(sweepProgressAtom);
  const pick = useAtomValue(sweepPickAtom);
  const present = useAtomValue(presentAtom);
  const reportOpen = useAtomValue(reportOpenAtom);
  const outcome = shown && project && shown.projectId === project.id ? shown : null;
  const sweepHere = sweep && project && sweep.projectId === project.id ? sweep : null;
  usePlaybackLoop(outcome);
  const bgUrl = outcome?.doc.background && project ? fileUrl(project.id, outcome.doc.background.fileId) : null;

  useEffect(() => bindQueryClient(queryClient), [queryClient]);
  // 打開專案後第一次進來: 記憶體裡沒有結果就讀最新的紀錄
  useEffect(() => {
    if (project) void autoLoadLatest(store, project.id);
  }, [project, store]);

  // 車數掃描、沒有點某一次: 中間和右邊都給掃描結果
  const sweepView = mode === "sweep" && !pick;

  let main;
  if (sweepView) {
    main = sweepHere ? (
      <SweepResults sweep={sweepHere} />
    ) : (
      <Placeholder>
        {sweepProgress !== null ? <Spin /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />}
        <div>{t("sim_v2.sweep.no_result")}</div>
      </Placeholder>
    );
  } else if (outcome) {
    // 展示模式蓋在上面時這張先不畫 (不然兩張地圖一起跟著播放重畫)
    main = present ? null : <ReplayCanvas outcome={outcome} backgroundUrl={bgUrl} />;
  } else {
    const busy = mode === "single" ? progress !== null : !!pick && !pick.error;
    main = (
      <Placeholder>
        {busy ? <Spin /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />}
        <div>
          {mode === "sweep" && pick
            ? pick.error
              ? `${t("sim_v2.run.failed")}: ${pick.error}`
              : t("sim_v2.sweep.pick_loading", { count: pick.count, seed: pick.seed })
            : busy
              ? t("sim_v2.run.running")
              : t("sim_v2.run.no_result")}
        </div>
      </Placeholder>
    );
  }

  const full = sweepView || !outcome;
  return (
    <Grid data-testid="simv2-run-tab">
      <div className="settings">
        <RunSettingsPanel />
      </div>
      <div className="map" style={full ? { gridColumn: "2 / -1", gridRow: "1 / 3" } : undefined}>
        {main}
        {mode === "sweep" && pick && (
          <PickBar data-testid="simv2-sweep-pick">
            <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => closeSweepPick(store)} data-testid="simv2-sweep-back">
              {t("sim_v2.sweep.back")}
            </Button>
            <span>{t("sim_v2.sweep.pick_title", { type: sweepHere?.plan.typeName ?? "", count: pick.count, seed: pick.seed })}</span>
          </PickBar>
        )}
      </div>
      {!full && outcome && (
        <div className="playback">
          <PlaybackBar outcome={outcome} />
        </div>
      )}
      {!full && outcome && (
        <div className="results">
          <ResultsPanel outcome={outcome} />
        </div>
      )}
      {present && outcome && <PresentMode outcome={outcome} backgroundUrl={bgUrl} />}
      {reportOpen && <ReportPreview />}
    </Grid>
  );
};

export default RunWorkspace;
