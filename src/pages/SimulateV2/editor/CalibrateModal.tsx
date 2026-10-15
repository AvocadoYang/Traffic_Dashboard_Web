import { FC, useEffect, useState } from "react";
import { App, Checkbox, InputNumber, Modal, Space } from "antd";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { dist, formatLength, roundPoint } from "../model/geometry";
import { Point, SimDoc } from "../model/types";
import { calibrationAtom, commitAtom, docAtom, switchToolAtom, toolAtom } from "../state/editorAtoms";

/**
 * 比例校正: 在底圖上點了兩個點, 輸入它們實際相距幾公尺, 算出一個像素幾公尺.
 * 第一個點的位置不動, 圖以它為中心縮放. 校正前就畫好的點位可以選擇跟著一起縮放.
 */
export function calibrate(doc: SimDoc, a: Point, b: Point, realMeters: number, scaleNodes: boolean): SimDoc {
  const bg = doc.background;
  if (!bg) return doc;
  const pixA = { x: (a.x - bg.originX) / bg.metersPerPx, y: (a.y - bg.originY) / bg.metersPerPx };
  const pixDist = dist(a, b) / bg.metersPerPx;
  if (pixDist <= 0 || realMeters <= 0) return doc;
  const mpp = realMeters / pixDist;
  const factor = mpp / bg.metersPerPx;
  return {
    ...doc,
    background: {
      ...bg,
      metersPerPx: mpp,
      originX: a.x - pixA.x * mpp,
      originY: a.y - pixA.y * mpp,
      calibrated: true,
      locked: true,
    },
    nodes: scaleNodes
      ? doc.nodes.map((n) => ({ ...n, ...roundPoint({ x: a.x + (n.x - a.x) * factor, y: a.y + (n.y - a.y) * factor }) }))
      : doc.nodes,
  };
}

/** 兩點在圖上至少要差幾個像素, 太近量不準 */
const MIN_PIXELS = 5;

const CalibrateModal: FC = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [cal, setCal] = useAtom(calibrationAtom);
  const tool = useAtomValue(toolAtom);
  const doc = useAtomValue(docAtom);
  const commit = useSetAtom(commitAtom);
  const switchTool = useSetAtom(switchToolAtom);
  const open = tool === "calibrate" && !!cal.a && !!cal.b;
  const [meters, setMeters] = useState<number | null>(null);
  const [scaleNodes, setScaleNodes] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMeters(null);
    setScaleNodes(!!doc.background && !doc.background.calibrated && doc.nodes.length > 0);
    // 只在打開的那一下決定預設值
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!cal.a || !cal.b) return null;
  const a = cal.a;
  const b = cal.b;
  const bg = doc.background;
  const pixels = bg ? dist(a, b) / bg.metersPerPx : 0;

  const ok = () => {
    if (!bg) {
      message.error(t("sim_v2.calibrate.no_background"));
      return;
    }
    if (pixels < MIN_PIXELS) {
      message.error(t("sim_v2.calibrate.too_close"));
      return;
    }
    if (!meters || meters <= 0) {
      message.error(t("sim_v2.calibrate.need_distance"));
      return;
    }
    const next = calibrate(doc, a, b, meters, scaleNodes);
    commit(() => next);
    switchTool("select");
    message.success(t("sim_v2.calibrate.done", { cm: ((next.background?.metersPerPx ?? 0) * 100).toFixed(2) }));
  };

  return (
    <Modal
      open={open}
      title={t("sim_v2.calibrate.title")}
      okText={t("sim_v2.common.ok")}
      cancelText={t("sim_v2.common.cancel")}
      onOk={ok}
      onCancel={() => setCal({ a: null, b: null })}
      destroyOnHidden
    >
      <Space orientation="vertical" style={{ width: "100%" }}>
        <span>{t("sim_v2.calibrate.measured", { length: formatLength(dist(a, b)), pixels: Math.round(pixels) })}</span>
        <Space>
          {t("sim_v2.calibrate.real")}
          <InputNumber<number>
            autoFocus
            min={0.01}
            step={0.5}
            value={meters}
            suffix="m"
            data-testid="simv2-calibrate-meters"
            onChange={(v) => setMeters(typeof v === "number" ? v : null)}
            onPressEnter={ok}
          />
        </Space>
        {doc.nodes.length > 0 && (
          <Checkbox checked={scaleNodes} onChange={(e) => setScaleNodes(e.target.checked)}>
            {t("sim_v2.calibrate.scale_nodes", { count: doc.nodes.length })}
          </Checkbox>
        )}
      </Space>
    </Modal>
  );
};

export default CalibrateModal;
