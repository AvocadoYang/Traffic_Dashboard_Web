import { FC, useEffect, useState } from "react";
import { App, Checkbox, InputNumber, Modal, Space } from "antd";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { dist, formatLength } from "../model/geometry";
import { calibrate } from "./calibrate";
import { calibrationAtom, calibrationTargetAtom, commitAtom, docAtom, switchToolAtom, toolAtom } from "../state/editorAtoms";

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
  const target = useAtomValue(calibrationTargetAtom);
  const open = tool === "calibrate" && !!cal.a && !!cal.b;
  const [meters, setMeters] = useState<number | null>(null);
  const [scaleNodes, setScaleNodes] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMeters(null);
    const subject = target === "cad" ? doc.cad : doc.background;
    setScaleNodes(!!subject && !subject.calibrated && doc.nodes.length > 0);
    // 只在打開的那一下決定預設值
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!cal.a || !cal.b) return null;
  const a = cal.a;
  const b = cal.b;
  const bg = doc.background;
  const cad = doc.cad;
  const pixels = bg ? dist(a, b) / bg.metersPerPx : 0;
  const units = cad ? dist(a, b) / cad.metersPerUnit : 0;

  const ok = () => {
    if (target === "cad" ? !cad : !bg) {
      message.error(t("sim_v2.calibrate.no_background"));
      return;
    }
    if (target === "cad" ? !(units > 0) : pixels < MIN_PIXELS) {
      message.error(t("sim_v2.calibrate.too_close"));
      return;
    }
    if (!meters || meters <= 0) {
      message.error(t("sim_v2.calibrate.need_distance"));
      return;
    }
    const next = calibrate(doc, a, b, meters, scaleNodes, target);
    commit(() => next);
    switchTool("select");
    if (target === "cad") message.success(t("sim_v2.calibrate.done_cad", { mm: ((next.cad?.metersPerUnit ?? 0) * 1000).toPrecision(4) }));
    else message.success(t("sim_v2.calibrate.done", { cm: ((next.background?.metersPerPx ?? 0) * 100).toFixed(2) }));
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
        <span>
          {target === "cad"
            ? t("sim_v2.calibrate.measured_cad", { length: formatLength(dist(a, b)), units: Number(units.toPrecision(6)), unit: cad?.unit ?? "" })
            : t("sim_v2.calibrate.measured", { length: formatLength(dist(a, b)), pixels: Math.round(pixels) })}
        </span>
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
