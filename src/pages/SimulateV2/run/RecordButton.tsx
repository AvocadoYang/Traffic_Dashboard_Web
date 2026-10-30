import { FC, RefObject, useEffect, useRef, useState } from "react";
import { Button, Tooltip, message } from "antd";
import { StopOutlined, VideoCameraOutlined } from "@ant-design/icons";
import { useAtom, useAtomValue, useStore } from "jotai";
import { useTranslation } from "react-i18next";
import { projectAtom } from "../state/editorAtoms";
import { RunOutcome, playSpeedAtom, playTimeAtom, playingAtom, replayRecordingAtom } from "../state/runAtoms";
import { fmtClock } from "./format";
import { startReplayRecording } from "./replayRecorder";

/** 檔名用的時間: 20261029-1430 */
const stamp = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

const elapsedText = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * 回放地圖角落的「錄影」: 從現在的時間開始播, 把畫面上看到的錄成影片 (見 replayRecorder);
 * 錄影中變成紅色的「停止」, 播完或按停止就存檔。
 */
const RecordButton: FC<{
  outcome: RunOutcome;
  /** 錄這個區塊裡的畫布 */
  containerRef: RefObject<HTMLElement>;
  background: string;
  is3d: boolean;
  /** 影片左下角的圖例 (熱點模式沒有) */
  legend: { color: string; label: string }[];
}> = ({ outcome, containerRef, background, is3d, legend }) => {
  const { t } = useTranslation();
  const store = useStore();
  const [recording, setRecording] = useAtom(replayRecordingAtom);
  const project = useAtomValue(projectAtom);
  const [elapsed, setElapsed] = useState(0);
  const [messageApi, contextHolder] = message.useMessage();
  // 錄影中切換 2D / 3D、換模式時圖例跟著變
  const live = useRef({ is3d, legend });
  live.current = { is3d, legend };

  // 播到最後自動停
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((performance.now() - recording.startedAt) / 1000));
      if (!store.get(playingAtom) && store.get(playTimeAtom) >= outcome.result.endSec) recording.stop();
    }, 250);
    return () => window.clearInterval(timer);
  }, [recording, store, outcome]);
  // 離開結果頁時把已經錄的存下來
  useEffect(() => () => store.get(replayRecordingAtom)?.stop(), [store]);

  const start = () => {
    const container = containerRef.current;
    if (!container) return;
    const { startClock, endSec } = outcome.result;
    const rec = startReplayRecording({
      container,
      background,
      is3d: () => live.current.is3d,
      overlay: {
        clock: () => `${fmtClock(startClock, store.get(playTimeAtom))}  ·  ${store.get(playSpeedAtom)}×`,
        legend: () => live.current.legend,
      },
      fileName: `${project?.name || "simulation"}-${stamp()}`,
      onDone: () => {
        setRecording(null);
        void messageApi.success(t("sim_v2.record.saved"));
      },
    });
    if (!rec) {
      void messageApi.error(t("sim_v2.record.unsupported"));
      return;
    }
    if (store.get(playTimeAtom) >= endSec) store.set(playTimeAtom, 0);
    store.set(playingAtom, true);
    setElapsed(0);
    setRecording(rec);
  };

  return (
    <>
      {contextHolder}
      {recording ? (
        <Button size="small" type="primary" danger icon={<StopOutlined />} onClick={() => recording.stop()} data-testid="simv2-record-stop">
          {t("sim_v2.record.stop")} {elapsedText(elapsed)}
        </Button>
      ) : (
        <Tooltip title={t("sim_v2.record.tip")}>
          <Button size="small" type="text" icon={<VideoCameraOutlined />} onClick={start} data-testid="simv2-record">
            {t("sim_v2.record.start")}
          </Button>
        </Tooltip>
      )}
    </>
  );
};

export default RecordButton;
