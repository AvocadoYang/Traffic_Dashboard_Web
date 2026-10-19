import { CSSProperties, FC, useEffect } from "react";
import { Button, Select, Slider, Tooltip } from "antd";
import { CaretRightOutlined, PauseOutlined, StepBackwardOutlined } from "@ant-design/icons";
import { useAtom, useAtomValue, useStore } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { RunOutcome, playSpeedAtom, playTimeAtom, playingAtom } from "../state/runAtoms";
import { fmtClock, fmtDuration } from "./format";

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: var(--c-bg);
  border-top: 1px solid var(--c-border);
  font-size: 12px;
  color: var(--c-text-secondary);

  .ant-slider {
    flex: 1 1 auto;
    min-width: 120px;
    margin: 6px 8px 14px;
  }
  .time {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: var(--c-text);
  }
`;

const SPEEDS = [1, 2, 5, 10, 20, 50, 100, 200];

/** 播放中: 每一幀把時間往前推 (速度 x 經過的實際時間) */
export function usePlaybackLoop(outcome: RunOutcome | null) {
  const store = useStore();
  const playing = useAtomValue(playingAtom);
  useEffect(() => {
    if (!playing || !outcome) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      const end = outcome.result.endSec;
      const next = store.get(playTimeAtom) + dt * store.get(playSpeedAtom);
      if (next >= end) {
        store.set(playTimeAtom, end);
        store.set(playingAtom, false);
        return;
      }
      store.set(playTimeAtom, next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, outcome, store]);
}

const PlaybackBar: FC<{ outcome: RunOutcome }> = ({ outcome }) => {
  const { t } = useTranslation();
  const [time, setTime] = useAtom(playTimeAtom);
  const [playing, setPlaying] = useAtom(playingAtom);
  const [speed, setSpeed] = useAtom(playSpeedAtom);
  const { result } = outcome;
  const end = result.endSec;
  const marks: Record<number, { label: string; style?: CSSProperties }> = {};
  if (result.warmupSec > 0) marks[Math.round(result.warmupSec)] = { label: t("sim_v2.result.warmup_end"), style: { fontSize: 11 } };
  if (result.deadlock) marks[Math.round(result.deadlock.t)] = { label: t("sim_v2.result.deadlock_mark"), style: { color: "var(--c-danger)", fontSize: 11 } };

  return (
    <Bar data-testid="simv2-playback">
      <Tooltip title={t("sim_v2.result.restart")}>
        <Button size="small" type="text" icon={<StepBackwardOutlined />} onClick={() => setTime(0)} />
      </Tooltip>
      <Button
        size="small"
        type="primary"
        icon={playing ? <PauseOutlined /> : <CaretRightOutlined />}
        onClick={() => {
          if (!playing && time >= end) setTime(0);
          setPlaying(!playing);
        }}
        data-testid="simv2-play"
        aria-label={playing ? t("sim_v2.result.pause") : t("sim_v2.result.play")}
      />
      <Select
        size="small"
        value={speed}
        style={{ width: 76 }}
        options={SPEEDS.map((s) => ({ value: s, label: `${s}×` }))}
        onChange={setSpeed}
        data-testid="simv2-speed"
      />
      <Slider
        min={0}
        max={Math.max(1, Math.round(end))}
        step={1}
        value={Math.round(time)}
        marks={marks}
        tooltip={{ formatter: (v) => fmtClock(result.startClock, v ?? 0) }}
        onChange={(v) => setTime(v)}
        data-testid="simv2-timeline"
      />
      <span className="time" data-testid="simv2-play-time">
        {fmtClock(result.startClock, time)} / {fmtClock(result.startClock, end)}
      </span>
      <span style={{ whiteSpace: "nowrap" }}>({fmtDuration(time)})</span>
    </Bar>
  );
};

export default PlaybackBar;
