import { FC } from "react";
import { Empty, Spin } from "antd";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { fileUrl } from "../api/simV2Api";
import { projectAtom } from "../state/editorAtoms";
import { runOutcomeAtom, runProgressAtom } from "../state/runAtoms";
import PlaybackBar, { usePlaybackLoop } from "./PlaybackBar";
import ReplayCanvas from "./ReplayCanvas";
import ResultsPanel from "./ResultsPanel";
import RunSettingsPanel from "./RunSettingsPanel";

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

const RunWorkspace: FC = () => {
  const { t } = useTranslation();
  const project = useAtomValue(projectAtom);
  const outcomeRaw = useAtomValue(runOutcomeAtom);
  const progress = useAtomValue(runProgressAtom);
  const outcome = outcomeRaw && project && outcomeRaw.projectId === project.id ? outcomeRaw : null;
  usePlaybackLoop(outcome);
  const bgUrl = outcome?.doc.background && project ? fileUrl(project.id, outcome.doc.background.fileId) : null;

  return (
    <Grid data-testid="simv2-run-tab">
      <div className="settings">
        <RunSettingsPanel />
      </div>
      <div className="map" style={outcome ? undefined : { gridColumn: "2 / -1", gridRow: "1 / 3" }}>
        {outcome ? (
          <ReplayCanvas outcome={outcome} backgroundUrl={bgUrl} />
        ) : (
          <Placeholder>
            {progress !== null ? <Spin /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />}
            <div>{progress !== null ? t("sim_v2.run.running") : t("sim_v2.run.no_result")}</div>
          </Placeholder>
        )}
      </div>
      {outcome && (
        <div className="playback">
          <PlaybackBar outcome={outcome} />
        </div>
      )}
      {outcome && (
        <div className="results">
          <ResultsPanel outcome={outcome} />
        </div>
      )}
    </Grid>
  );
};

export default RunWorkspace;
