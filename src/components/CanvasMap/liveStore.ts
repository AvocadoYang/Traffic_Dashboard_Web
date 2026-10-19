import { Subscription } from "rxjs";
import { translate } from "@/i18n";
import { profiles$, type MissionDestination } from "@/sockets/useAMRInfo";
import { bboxes$ } from "@/sockets/useBBox";
import { claimedResource$ } from "@/sockets/useClaimedResources";
import { warningId$ } from "@/sockets/useWarning";
import { pointCloud$ } from "@/sockets/usePointCloud";
import { amrStatus$ } from "@/sockets/useMirStatus";
import { missionReports$, type MissionInfo } from "@/sockets/useMissions";

/**
 * 地圖上會一直動的資料 (車的位置、佔用的路線、點雲…)。
 *
 * 舊地圖是每台車十幾個 hook, 每個 socket 訊息進來各自 setState、各自重繪 DOM。
 * 這裡直接訂閱同一批 socket 串流, 收到就改這份資料, 再通知畫布「下一幀要重畫」;
 * 不經過 React state, 車再多、更新再頻繁也只有畫布在動。
 */

export type AmrLive = {
  pose: { x: number; y: number; yaw: number } | null;
  isOverdue: boolean;
  isPause: boolean;
  hasCargo: boolean;
  /** 翻譯過的 rosStatus, 跟舊地圖的提示文字一樣 */
  status: string;
  destination: MissionDestination | null;
};

export type LiveState = {
  amrs: Map<string, AmrLive>;
  bbox: Map<string, number[][]>;
  /** roadId -> 佔用的車 */
  claimedRoads: Map<string, string>;
  /** 有警告的車 */
  warnings: Set<string>;
  pointCloud: Map<string, Float32Array>;
  /** MiR 目前用的地圖 */
  mirMapId: Map<string, string>;
  /** 這台車正在做的任務的 sub_name */
  activeSubName: Map<string, string>;
};

// mission socket 會把車子佇列裡的任務 (含已結束的) 一起送來, 規則同 useActiveMission
const ACTIVE_MISSION_STATUS = ["executing", "aborting", "assigned", "pending"];

const activeSubNames = (missions: MissionInfo[]) => {
  const best = new Map<string, MissionInfo>();
  for (const m of missions) {
    if (!m.amrId) continue;
    const rank = ACTIVE_MISSION_STATUS.indexOf(m.missionStatus);
    if (rank === -1) continue;
    const cur = best.get(m.amrId);
    if (!cur) {
      best.set(m.amrId, m);
      continue;
    }
    const curRank = ACTIVE_MISSION_STATUS.indexOf(cur.missionStatus);
    if (rank < curRank || (rank === curRank && m.order < cur.order)) {
      best.set(m.amrId, m);
    }
  }
  const out = new Map<string, string>();
  best.forEach((m, amrId) => {
    if (m.sub_name) out.set(amrId, m.sub_name);
  });
  return out;
};

export type LiveStore = {
  state: LiveState;
  /** 資料變了就呼叫; 回傳取消訂閱 */
  subscribe: (listener: () => void) => () => void;
  dispose: () => void;
};

export const createLiveStore = (): LiveStore => {
  const state: LiveState = {
    amrs: new Map(),
    bbox: new Map(),
    claimedRoads: new Map(),
    warnings: new Set(),
    pointCloud: new Map(),
    mirMapId: new Map(),
    activeSubName: new Map(),
  };
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  const subs = new Subscription();

  subs.add(
    profiles$.subscribe((infos) => {
      for (const info of infos) {
        const prev = state.amrs.get(info.amrId);
        const p = info.pose;
        const pose =
          p && p.x !== undefined
            ? {
                x: Number((p.x || 0).toFixed(2)),
                y: Number((p.y || 0).toFixed(2)),
                yaw: Number((p.yaw || 0).toFixed(2)),
              }
            : (prev?.pose ?? null);
        const rosStatus = info.rosStatus;
        state.amrs.set(info.amrId, {
          pose,
          isOverdue: info.isOverdue || false,
          // 沒送 isPause 的訊息不改它 (同 useIsPause)
          isPause: info.isPause ?? prev?.isPause ?? false,
          hasCargo: info.hasCargo || false,
          status: rosStatus ? `${translate("normal", String(rosStatus))}` : "",
          destination: (info.destination as MissionDestination | null) ?? null,
        });
      }
      notify();
    }),
  );

  subs.add(
    bboxes$.subscribe((list) => {
      for (const item of list) {
        if (item) state.bbox.set(item.amrId, item.bbox);
      }
      notify();
    }),
  );

  subs.add(
    claimedResource$.subscribe(({ roads }) => {
      state.claimedRoads = new Map(roads.map(({ roadId, amrId }) => [roadId, amrId]));
      notify();
    }),
  );

  subs.add(
    warningId$.subscribe((infos) => {
      // 跟 useWarningId 一樣: 空陣列不清掉上一次的警告
      if (!infos.length) return;
      state.warnings = new Set(
        infos.filter((i) => i && i.message.length > 0).map((i) => i!.amrId),
      );
      notify();
    }),
  );

  subs.add(
    pointCloud$.subscribe((msg) => {
      state.pointCloud.set(msg.amrId, new Float32Array(msg.points));
      notify();
    }),
  );

  subs.add(
    amrStatus$.subscribe((s) => {
      state.mirMapId.set(s.amrId, s.active_map_id);
      notify();
    }),
  );

  subs.add(
    missionReports$.subscribe(({ missions }) => {
      state.activeSubName = activeSubNames(missions as MissionInfo[]);
      notify();
    }),
  );

  return {
    state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose: () => {
      subs.unsubscribe();
      listeners.clear();
    },
  };
};
