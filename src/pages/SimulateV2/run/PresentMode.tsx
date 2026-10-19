/**
 * 展示模式 (售前簡報用): 全螢幕, 只有回放地圖、播放列, 和疊在地圖上的即時數字
 * (到目前為止完成幾板、近一小時搬運量、在等的板數、每種狀態幾台車). Esc 或右上角離開.
 */
import { FC, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Button, Tooltip } from "antd";
import { FullscreenExitOutlined } from "@ant-design/icons";
import { atom, useAtomValue, useSetAtom, useStore } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useCanvasColors } from "../editor/hooks";
import type { SimResult } from "../engine/types";
import { View, projectAtom } from "../state/editorAtoms";
import { RunOutcome, playTimeAtom, playingAtom, presentAtom } from "../state/runAtoms";
import { STATE_ORDER, bucketOf, stateColors } from "./colors";
import { fmtClock, fmtNumber } from "./format";
import PlaybackBar from "./PlaybackBar";
import ReplayCanvas from "./ReplayCanvas";
import { posesAt } from "./replayDraw";

/** 展示模式自己的平移縮放 */
const presentViewAtom = atom<View | null>(null);

const Root = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  background: var(--c-bg);

  > .map {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
  }
`;

const Board = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(340px, calc(100% - 24px));
  padding: 14px 16px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  color: var(--c-text);
  pointer-events: none;

  .title {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 13px;
    color: var(--c-text-secondary);
  }
  .clock {
    font-size: 30px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 14px;
  }
  .label {
    font-size: 12px;
    color: var(--c-text-secondary);
  }
  .value {
    font-size: 22px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .value small {
    margin-left: 3px;
    font-size: 12px;
    font-weight: 400;
    color: var(--c-text-secondary);
  }
  .states {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 12px;
    color: var(--c-text-secondary);
  }
  .states span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .states i {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
  }
  .states b {
    color: var(--c-text);
    font-variant-numeric: tabular-nums;
  }
`;

const Exit = styled.div`
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 3;
`;

/** 排好的時間 (秒): 二分搜尋算「到 t 為止有幾筆」 */
function countUpTo(sorted: Float64Array, t: number) {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function timesOf(r: SimResult) {
  const pick = (f: (l: SimResult["loads"][number]) => number) => Float64Array.from(r.loads.map(f).filter((x) => x >= 0)).sort();
  return {
    created: pick((l) => l.created),
    pickStart: pick((l) => l.pickStart),
    pickDone: pick((l) => l.pickDone),
    dropDone: pick((l) => l.dropDone),
  };
}

const LiveBoard: FC<{ outcome: RunOutcome }> = ({ outcome }) => {
  const { t } = useTranslation();
  const time = useAtomValue(playTimeAtom);
  const project = useAtomValue(projectAtom);
  const canvas = useCanvasColors();
  const colors = stateColors(canvas.dark);
  const { result } = outcome;
  const times = useMemo(() => timesOf(result), [result]);
  const done = countUpTo(times.dropDone, time);
  const lastHour = done - countUpTo(times.dropDone, time - 3600);
  const waiting = countUpTo(times.created, time) - countUpTo(times.pickStart, time);
  const carrying = countUpTo(times.pickDone, time) - done;
  const counts = new Map<string, number>();
  if (result.trace) for (const p of posesAt(result.trace, time)) counts.set(bucketOf(p.state), (counts.get(bucketOf(p.state)) ?? 0) + 1);
  const vehicles = result.vehicles.length;
  const demand = result.kpi.demandPerHour;

  return (
    <Board data-testid="simv2-present-board">
      <div className="title">
        <span>{project?.name}</span>
        <span>{t("sim_v2.present.setup", { vehicles, demand: fmtNumber(demand) })}</span>
      </div>
      <div className="clock" data-testid="simv2-present-clock">
        {fmtClock(result.startClock, time)}
      </div>
      <div className="grid">
        <div>
          <div className="label">{t("sim_v2.present.done")}</div>
          <div className="value" data-testid="simv2-present-done">
            {done}
            <small>{t("sim_v2.present.loads")}</small>
          </div>
        </div>
        <div>
          <div className="label">{t("sim_v2.present.last_hour")}</div>
          <div className="value">
            {time >= 3600 ? lastHour : "–"}
            <small>{t("sim_v2.present.loads")}</small>
          </div>
        </div>
        <div>
          <div className="label">{t("sim_v2.present.waiting")}</div>
          <div className="value">
            {waiting}
            <small>{t("sim_v2.present.loads")}</small>
          </div>
        </div>
        <div>
          <div className="label">{t("sim_v2.present.carrying")}</div>
          <div className="value">
            {carrying}
            <small>{t("sim_v2.present.loads")}</small>
          </div>
        </div>
      </div>
      {result.trace && (
        <div className="states">
          {STATE_ORDER.filter((s) => counts.get(s)).map((s) => (
            <span key={s}>
              <i style={{ background: colors[s] }} />
              {t(`sim_v2.state.${s}`)} <b>{counts.get(s)}</b>
            </span>
          ))}
        </div>
      )}
    </Board>
  );
};

const PresentMode: FC<{ outcome: RunOutcome; backgroundUrl: string | null }> = ({ outcome, backgroundUrl }) => {
  const { t } = useTranslation();
  const store = useStore();
  const rootRef = useRef<HTMLDivElement>(null);
  const setPresent = useSetAtom(presentAtom);

  useEffect(() => {
    store.set(presentViewAtom, null);
    const el = rootRef.current;
    const exit = () => setPresent(false);
    // 瀏覽器不讓全螢幕 (例如不是使用者按的) 也沒關係, 一樣蓋滿整個視窗
    el?.requestFullscreen?.().catch(() => undefined);
    const onFullscreen = () => {
      if (!document.fullscreenElement) exit();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        exit();
      } else if (e.code === "Space") {
        e.preventDefault();
        store.set(playingAtom, !store.get(playingAtom));
      }
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("keydown", onKey, true);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    };
  }, [setPresent, store]);

  return createPortal(
    <Root ref={rootRef} data-testid="simv2-present-root">
      <div className="map">
        <ReplayCanvas outcome={outcome} backgroundUrl={backgroundUrl} present viewAtom={presentViewAtom} />
        <LiveBoard outcome={outcome} />
        <Exit>
          <Tooltip title="Esc">
            <Button icon={<FullscreenExitOutlined />} onClick={() => setPresent(false)} data-testid="simv2-present-exit">
              {t("sim_v2.present.exit")}
            </Button>
          </Tooltip>
        </Exit>
      </div>
      <PlaybackBar outcome={outcome} />
    </Root>,
    document.body,
  );
};

export default PresentMode;
