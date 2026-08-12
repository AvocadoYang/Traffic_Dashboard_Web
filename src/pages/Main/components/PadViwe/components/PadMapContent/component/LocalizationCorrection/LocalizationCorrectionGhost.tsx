import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAtom, useAtomValue } from "jotai";
import { Button, Modal, Typography } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

import useMap from "@/api/useMap";
import { useLocalizationCorrection } from "@/api/useLocalizationCorrection";
import { useAmrPose } from "@/sockets/useAMRInfo";
import { useAmrPointCloud } from "@/sockets/usePointCloud";
import { localizationCorrection, Scale } from "@/utils/gloable";
import {
  amrId2ColorRainbow,
  deg2Rad,
  rosCoord2DisplayCoord,
  sanitizeDeg,
  sanitizeSignedDeg,
} from "@/utils/utils";
import { useMiRStatus } from "@/sockets/useMirStatus";
import { currentMapIdAtom } from "@/utils/mapSelection";

// Position/rotation are set as inline styles via .attrs (rather than
// interpolated into the CSS template) because they change on every drag
// mousemove — interpolating them into the template would make
// styled-components mint a brand new CSS class per frame.
const GhostWrapper = styled.div.attrs<{ left: number; top: number }>(
  ({ left, top }) => ({
    style: { left, top },
  }),
)<{ left: number; top: number }>`
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 200001;
`;

const GhostBody = styled.div.attrs<{ rotate: number; color: string }>(
  ({ rotate }) => ({
    style: { transform: `rotate(${rotate}deg)` },
  }),
)<{ rotate: number; color: string }>`
  width: 15px;
  height: 20px;
  background-color: ${(p) => p.color};
  border: 2px dashed #f50c0c;
  border-radius: 3px;
  opacity: 0.55;
  position: relative;
  transform-origin: center;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`;

const RotateHandle = styled.div`
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid #722ed1;
  cursor: alias;

  &::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    width: 1px;
    height: 12px;
    background: #ffffff;
    transform: translateX(-50%);
  }
`;

const Panel = styled.div`
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 200002;
  background: rgba(20, 20, 20, 0.88);
  color: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  min-width: 280px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  font-size: 12px;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 700;
`;

const PanelRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
  font-family: monospace;
`;

const PanelActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

// A single mutable ref keeps the mousemove/mouseup listeners stable across
// renders (they're attached once) while still reading up-to-date pose/map/
// scale values, avoiding constantly tearing down and re-adding document
// listeners every time the AMR's live pose ticks in over the socket.
type DragState = {
  mode: "translate" | "rotate" | null;
  startClientX: number;
  startClientY: number;
  startDx: number;
  startDy: number;
  centerClientX: number;
  centerClientY: number;
};

const LocalizationCorrectionGhost = () => {
  const { t } = useTranslation();
  const [correction, setCorrection] = useAtom(localizationCorrection);
  const { data: map } = useMap();
  const scale = useAtomValue(Scale);
  const { pose } = useAmrPose(correction?.amrId ?? "");
  const points = useAmrPointCloud(correction?.amrId ?? "");
  const MiR_Status_IO = useMiRStatus(correction?.amrId ?? "");
  const mapId = useAtomValue(currentMapIdAtom);
  const {
    mutateAsync: submitCorrection,
    isLoading: isSubmitting,
    contextHolder,
  } = useLocalizationCorrection();

  const bodyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragState = useRef<DragState>({
    mode: null,
    startClientX: 0,
    startClientY: 0,
    startDx: 0,
    startDy: 0,
    centerClientX: 0,
    centerClientY: 0,
  });

  const latest = useRef({ correction, pose, map, scale });
  latest.current = { correction, pose, map, scale };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const drag = dragState.current;
      if (drag.mode === null) return;
      const { correction: c, pose: p, map: m, scale: s } = latest.current;
      if (!c || !p || !m) return;

      if (drag.mode === "translate") {
        const deltaDisplayX = (e.clientX - drag.startClientX) / s;
        const deltaDisplayY = (e.clientY - drag.startClientY) / s;
        const deltaRosX = deltaDisplayX * m.mapResolution;
        const deltaRosY = -deltaDisplayY * m.mapResolution;
        setCorrection({
          ...c,
          dx: drag.startDx + deltaRosX,
          dy: drag.startDy + deltaRosY,
        });
      } else {
        const screenAngleDeg =
          (Math.atan2(
            e.clientY - drag.centerClientY,
            e.clientX - drag.centerClientX,
          ) *
            180) /
          Math.PI;
        const targetYaw = sanitizeDeg(-screenAngleDeg);
        setCorrection({ ...c, dYaw: sanitizeDeg(targetYaw - p.yaw) });
      }
    };

    const handleMouseUp = () => {
      dragState.current.mode = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setCorrection]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map || !pose || !correction) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { mapResolution, mapOriginX, mapOriginY, mapHeight } = map;
    const { dx, dy, dYaw } = correction;
    const cos = Math.cos(deg2Rad(dYaw));
    const sin = Math.sin(deg2Rad(dYaw));

    const frame = requestAnimationFrame(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!points.length) return;

      const path = new Path2D();
      for (let i = 0; i < points.length; i += 2) {
        const relX = points[i] - pose.x;
        const relY = points[i + 1] - pose.y;
        const rotX = relX * cos - relY * sin;
        const rotY = relX * sin + relY * cos;
        const newX = pose.x + dx + rotX;
        const newY = pose.y + dy + rotY;
        const displayX = (newX - mapOriginX) / mapResolution;
        const displayY = mapHeight - (newY - mapOriginY) / mapResolution;
        path.rect(displayX - 1, displayY - 1, 2, 2);
      }
      ctx.fillStyle = "rgba(243, 0, 0, 0.733)";
      ctx.fill(path);
    });

    return () => cancelAnimationFrame(frame);
  }, [points, map, pose, correction]);

  if (!correction || !map || !pose) return null;
  if (MiR_Status_IO.active_map_id !== mapId) return null;

  const { amrId, dx, dy, dYaw } = correction;
  const ghostX = pose.x + dx;
  const ghostY = pose.y + dy;
  // ROS reports yaw in (-180, 180], matching atan2's range, rather than
  // the [0, 360) range used internally for rotation math.
  const ghostYaw = sanitizeSignedDeg(pose.yaw + dYaw);

  const [left, top] = rosCoord2DisplayCoord({
    x: ghostX,
    y: ghostY,
    mapResolution: map.mapResolution,
    mapOriginX: map.mapOriginX,
    mapOriginY: map.mapOriginY,
    mapHeight: map.mapHeight,
  });

  const startTranslateDrag = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragState.current = {
      ...dragState.current,
      mode: "translate",
      startClientX: e.clientX,
      startClientY: e.clientY,
      startDx: dx,
      startDy: dy,
    };
  };

  const startRotateDrag = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = bodyRef.current?.getBoundingClientRect();
    dragState.current = {
      ...dragState.current,
      mode: "rotate",
      centerClientX: rect ? rect.left + rect.width / 2 : e.clientX,
      centerClientY: rect ? rect.top + rect.height / 2 : e.clientY,
    };
  };

  const reset = () => setCorrection({ amrId, dx: 0, dy: 0, dYaw: 0 });
  const cancel = () => setCorrection(null);
  const confirm = async () => {
    try {
      await submitCorrection({ amrId, x: ghostX, y: ghostY, yaw: ghostYaw });
    } catch {
      return;
    }
    Modal.info({
      title: t("amr_card.localization_correction_result_title"),
      content: (
        <Typography.Paragraph copyable={{ text: `${ghostX.toFixed(3)}, ${ghostY.toFixed(3)}, ${ghostYaw.toFixed(1)}` }}>
          x: {ghostX.toFixed(3)}
          <br />
          y: {ghostY.toFixed(3)}
          <br />
          yaw: {ghostYaw.toFixed(1)}°
        </Typography.Paragraph>
      ),
      onOk: cancel,
    });
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        width={map.mapWidth}
        height={map.mapHeight}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          color: 'red',
          pointerEvents: "none",
          zIndex: 200000,
        }}
      />
      <GhostWrapper left={left} top={top}>
        <GhostBody
          ref={bodyRef}
          rotate={90 - ghostYaw}
          color={amrId2ColorRainbow(amrId)}
          onMouseDown={startTranslateDrag}
          onClick={(e) => e.stopPropagation()}
        >
          <RotateHandle onMouseDown={startRotateDrag} />
        </GhostBody>
      </GhostWrapper>
      {createPortal(
        <Panel onClick={(e) => e.stopPropagation()}>
          <PanelHeader>
            <span>{`${t("amr_card.localization_correction")} - ${amrId}`}</span>
            <CloseOutlined onClick={cancel} style={{ cursor: "pointer" }} />
          </PanelHeader>
          <div style={{ marginBottom: 8, opacity: 0.75 }}>
            {t("amr_card.localization_correction_hint")}
          </div>
          <PanelRow>
            <span>x: {ghostX.toFixed(3)}</span>
            <span>y: {ghostY.toFixed(3)}</span>
            <span>yaw: {ghostYaw.toFixed(1)}°</span>
          </PanelRow>
          <PanelActions>
            <Button size="small" onClick={reset} disabled={isSubmitting}>
              {t("amr_card.localization_correction_reset")}
            </Button>
            <Button size="small" onClick={cancel} disabled={isSubmitting}>
              {t("amr_card.localization_correction_cancel")}
            </Button>
            <Button
              size="small"
              type="primary"
              onClick={confirm}
              loading={isSubmitting}
            >
              {t("amr_card.localization_correction_confirm")}
            </Button>
          </PanelActions>
        </Panel>,
        document.body,
      )}
      {contextHolder}
    </>
  );
};

export default LocalizationCorrectionGhost;
