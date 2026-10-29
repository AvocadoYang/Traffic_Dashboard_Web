import { FC, useEffect, useState } from "react";
import { Button } from "antd";
import { CloseOutlined, WarningFilled } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import type { LiveStore, WarningMessage } from "@/components/CanvasMap/liveStore";

/**
 * 3D 檢視跟著某台車時的資訊卡: 狀態、電量、速度、牙叉、貨、要去哪、在做哪個任務, 還有告警和處理方式
 * (告警清單的 debug 欄)。取代原本只有車號的「跟著 XXX」, 按 X 或 Esc 取消跟車。
 * 資料直接讀 liveStore, 有變才重畫 (一秒最多幾次)。
 */

const Card = styled.div<{ $top: string }>`
  position: absolute;
  top: ${({ $top }) => $top};
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  width: min(320px, calc(100% - 32px));
  max-height: calc(100% - ${({ $top }) => $top} - 16px);
  overflow-y: auto;
  border-radius: 8px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);
  color: var(--c-text);
  font-size: 12px;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 4px 4px 10px;
  border-bottom: 1px solid var(--c-border);
  font-weight: 600;

  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex: 0 0 auto;
  }
  .grow {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sub {
    color: var(--c-text-muted);
    font-weight: 400;
  }
`;

const Facts = styled.dl`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 3px 10px;
  margin: 0;
  padding: 8px 10px;

  dt {
    color: var(--c-text-muted);
    white-space: nowrap;
  }
  dd {
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
  }
`;

const Alerts = styled.ul`
  margin: 0;
  padding: 0 10px 8px;
  list-style: none;

  li {
    padding: 6px 8px;
    margin-top: 4px;
    border-left: 3px solid var(--c-danger, #ff4d4f);
    background: var(--c-danger-soft, rgba(255, 77, 79, 0.08));
  }
  .info {
    display: flex;
    gap: 6px;
    align-items: baseline;
    font-weight: 600;
    color: var(--c-danger, #ff4d4f);
  }
  .fix {
    margin-top: 2px;
    color: var(--c-text-secondary);
  }
`;

type Snapshot = {
  status: string;
  battery: number | null;
  charging: boolean;
  speed: number | null;
  forkHeight: number | null;
  hasCargo: boolean;
  destination: string;
  mission: string;
  stepWaitMs: number | null;
  paused: boolean;
  warnings: WarningMessage[];
};

const snapshotOf = (store: LiveStore | null, id: string): Snapshot | null => {
  const a = store?.state.amrs.get(id);
  if (!store || !a) return null;
  return {
    status: a.status,
    battery: a.battery,
    charging: a.charging,
    speed: a.speed,
    forkHeight: a.forkHeight,
    hasCargo: a.hasCargo,
    destination: a.destination ? a.destination.name || a.destination.locationId : "",
    mission: store.state.activeSubName.get(id) ?? "",
    stepWaitMs: a.stepWaitMs,
    paused: a.isPause,
    warnings: store.state.warningInfos.get(id) ?? [],
  };
};

/** 一秒最多更新幾次 */
const REFRESH_MS = 300;

const duration = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const VehicleInfoCard: FC<{
  id: string;
  color: string;
  /** 車型名稱 (查不到就空的) */
  typeName?: string;
  store: () => LiveStore | null;
  onClose: () => void;
  top?: string;
}> = ({ id, color, typeName, store, onClose, top = "10px" }) => {
  const { t } = useTranslation();
  const [snap, setSnap] = useState<Snapshot | null>(() => snapshotOf(store(), id));

  useEffect(() => {
    const s = store();
    if (!s) return;
    let key = "";
    let timer = 0;
    const update = () => {
      timer = 0;
      const next = snapshotOf(s, id);
      const k = JSON.stringify(next);
      if (k !== key) {
        key = k;
        setSnap(next);
      }
    };
    update();
    const off = s.subscribe(() => {
      if (!timer) timer = window.setTimeout(update, REFRESH_MS);
    });
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, [store, id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dash = "—";
  return (
    <Card $top={top} data-testid="fleet3d-vehicle-card">
      <Head>
        <span className="dot" style={{ background: color }} />
        <span className="grow">
          {t("map_tool.following", { id })}
          {typeName && <span className="sub"> · {typeName}</span>}
        </span>
        <Button size="small" type="text" icon={<CloseOutlined />} onClick={onClose} aria-label={t("map_tool.stop_follow")} />
      </Head>
      {snap && (
        <>
          <Facts>
            <dt>{t("fleet3d.info.status")}</dt>
            <dd>
              {snap.status || dash}
              {snap.paused && ` (${t("mode.isPause")})`}
            </dd>
            <dt>{t("fleet3d.info.battery")}</dt>
            <dd>
              {snap.battery === null ? dash : `${Math.round(snap.battery)}%`}
              {snap.charging && ` · ${t("fleet3d.info.charging")}`}
            </dd>
            <dt>{t("fleet3d.info.speed")}</dt>
            <dd>{snap.speed === null ? dash : `${Math.abs(snap.speed).toFixed(2)} m/s`}</dd>
            <dt>{t("fleet3d.info.fork")}</dt>
            <dd>{snap.forkHeight === null ? dash : `${Math.round(snap.forkHeight)} mm`}</dd>
            <dt>{t("fleet3d.info.cargo")}</dt>
            <dd>{snap.hasCargo ? t("fleet3d.info.yes") : t("fleet3d.info.no")}</dd>
            <dt>{t("fleet3d.info.destination")}</dt>
            <dd>{snap.destination || dash}</dd>
            <dt>{t("fleet3d.info.mission")}</dt>
            <dd>
              {snap.mission || dash}
              {snap.stepWaitMs !== null && snap.mission && ` · ${t("fleet3d.info.step_wait", { time: duration(snap.stepWaitMs) })}`}
            </dd>
          </Facts>
          {snap.warnings.length > 0 && (
            <Alerts>
              {snap.warnings.map((w) => (
                <li key={`${w.warningId}:${w.info}`}>
                  <div className="info">
                    <WarningFilled />
                    <span>
                      {w.info} <span style={{ fontWeight: 400, opacity: 0.75 }}>#{w.warningId}</span>
                    </span>
                  </div>
                  {w.debug && (
                    <div className="fix">
                      {t("fleet3d.info.solution")}: {w.debug}
                    </div>
                  )}
                </li>
              ))}
            </Alerts>
          )}
        </>
      )}
    </Card>
  );
};

export default VehicleInfoCard;
