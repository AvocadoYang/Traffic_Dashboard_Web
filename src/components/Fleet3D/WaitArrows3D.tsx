import { FC, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { Line2 } from "three-stdlib";
import { useTranslation } from "react-i18next";
import type { TrafficWait } from "@/sockets/useTrafficWaits";
import { WAIT_COLOR } from "@/components/CanvasMap/draw";
import { LiveTracks } from "./liveTracks";

/**
 * 誰在等誰 (交管拒絕路權、車停在原地等): 從在等的車拉一條弧線虛線箭頭到擋路的車, 弧線中間寫等了多久。
 * 兩台車都畫在地圖上才畫; 車在動時每一幀跟著重算 (只有幾條, 不貴)。
 */

/** 弧線兩端的高度 (車頂上一點) */
const END_HEIGHT = 1.6;
/** 弧線中間再拱多高: 至少這麼多, 距離越遠拱越高 */
const ARCH = 0.8;
const SEGMENTS = 24;
/** 箭頭停在擋路的車前面一點 (弧線參數), 不要插進車裡 */
const END_T = 0.9;
const UP = new THREE.Vector3(0, 1, 0);

export const waitedText = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

type Pair = { key: string; from: string; to: string; since: number };

const WaitArrow: FC<{ pair: Pair; tracks: LiveTracks; now: number }> = ({ pair, tracks, now }) => {
  const { t } = useTranslation();
  const lineRef = useRef<Line2>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);
  const initial = useMemo(() => Array.from({ length: SEGMENTS + 1 }, (_, i) => [i, 0, 0] as [number, number, number]), []);
  const positions = useMemo(() => new Float32Array((SEGMENTS + 1) * 3), []);
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()), []);
  const p = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const group = groupRef.current;
    const line = lineRef.current;
    if (!group || !line) return;
    const a = tracks.isShown(pair.from) ? tracks.positionOf(pair.from) : null;
    const b = tracks.isShown(pair.to) ? tracks.positionOf(pair.to) : null;
    group.visible = !!a && !!b;
    if (!a || !b) return;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    curve.v0.set(a.x, END_HEIGHT, -a.y);
    curve.v2.set(b.x, END_HEIGHT, -b.y);
    curve.v1.set((a.x + b.x) / 2, END_HEIGHT + ARCH + dist * 0.2, -(a.y + b.y) / 2);
    for (let i = 0; i <= SEGMENTS; i++) {
      curve.getPoint((i / SEGMENTS) * END_T, p);
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    }
    line.geometry.setPositions(positions);
    line.computeLineDistances();
    const head = headRef.current;
    if (head) {
      curve.getPoint(END_T, head.position);
      head.quaternion.setFromUnitVectors(UP, curve.getTangent(END_T, p).normalize());
    }
    if (labelRef.current) curve.getPoint(0.5, labelRef.current.position);
  });

  return (
    <group ref={groupRef}>
      <Line ref={lineRef} points={initial} color={WAIT_COLOR} lineWidth={3} dashed dashSize={0.35} gapSize={0.2} />
      <mesh ref={headRef}>
        <coneGeometry args={[0.2, 0.5, 12]} />
        <meshBasicMaterial color={WAIT_COLOR} />
      </mesh>
      <group ref={labelRef}>
        <Html center style={{ pointerEvents: "none" }} zIndexRange={[25, 0]}>
          <div
            style={{
              padding: "1px 6px",
              borderRadius: 4,
              background: WAIT_COLOR,
              color: "#ffffff",
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {t("fleet3d.wait.label", { time: waitedText(now - pair.since) })}
          </div>
        </Html>
      </group>
    </group>
  );
};

const WaitArrows3D: FC<{ waits: Map<string, TrafficWait>; ids: Set<string>; tracks: LiveTracks }> = ({ waits, ids, tracks }) => {
  const invalidate = useThree((s) => s.invalidate);
  const pairs = useMemo(
    () =>
      [...waits.values()].flatMap((w) =>
        ids.has(w.amrId) ? w.blockers.filter((b) => ids.has(b)).map((b) => ({ key: `${w.amrId}>${b}`, from: w.amrId, to: b, since: w.since })) : [],
      ),
    [waits, ids],
  );
  // 等了多久每秒更新
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!pairs.length) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [pairs.length]);
  useEffect(() => invalidate(), [pairs, invalidate]);
  return (
    <>
      {pairs.map((pair) => (
        <WaitArrow key={pair.key} pair={pair} tracks={tracks} now={now} />
      ))}
    </>
  );
};

export default WaitArrows3D;
