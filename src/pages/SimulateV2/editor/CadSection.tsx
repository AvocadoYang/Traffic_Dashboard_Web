/**
 * 底圖視窗的「CAD 圖 (DXF)」: 匯入 (讀檔 -> 選單位、圖層 -> 上傳)、換新版、單位、透明度、
 * 鎖定、吸附、圖層、校正比例、移除.
 *
 * 換新版的圖時原點 (base)、位置、比例都沿用舊的: 同一個廠區改過的圖座標通常一樣, 已經畫好的
 * 路線不用重新對.
 */
import { FC, useEffect, useState } from "react";
import { Alert, App, Button, Popconfirm, Progress, Select, Slider, Space, Switch, Tag, Upload } from "antd";
import { ColumnWidthOutlined, DeleteOutlined, InboxOutlined, SyncOutlined } from "@ant-design/icons";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { apiErrorOf, uploadProjectFile } from "../api/simV2Api";
import { CadParseError, CadStage, parseDxfBuffer, rememberCadGeometry, useCadGeometry } from "../io/dxf/cadLoader";
import type { CadGeometry } from "../io/dxf/types";
import { CAD_UNITS, CAD_UNIT_METERS, guessUnit, unitFromInsunits } from "../model/cad";
import { boundsOf } from "../model/geometry";
import type { CadBackground, CadUnit } from "../model/types";
import { calibrationTargetAtom, commitAtom, docAtom, fitRequestAtom, switchToolAtom } from "../state/editorAtoms";
import CadLayerList from "./CadLayerList";

/** 後端的上傳上限 */
const MAX_BYTES = 50 * 1024 * 1024;

const Info = styled.div`
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 8px 12px;
  align-items: center;
  margin-bottom: 16px;
  color: var(--c-text-secondary);

  b {
    color: var(--c-text);
    font-weight: 500;
    word-break: break-all;
  }
`;

const Notes = styled.ul`
  margin: 0 0 12px;
  padding-left: 18px;
  color: var(--c-text-secondary);
  font-size: 12px;
  line-height: 1.7;
`;

/** 讀好、還沒匯入的檔案 */
interface Pending {
  file: File;
  geometry: CadGeometry;
  unit: CadUnit;
  /** 單位是檔案裡寫的 (不是猜的) */
  unitFromFile: boolean;
  hidden: string[];
  /** 換掉現有的 DXF (沿用原點、位置、比例) */
  replace: boolean;
}

const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));

/** $ACADVER -> 好認的版本名稱 */
const VERSION_NAMES: Record<string, string> = {
  AC1009: "R12",
  AC1012: "R13",
  AC1014: "R14",
  AC1015: "2000",
  AC1018: "2004",
  AC1021: "2007",
  AC1024: "2010",
  AC1027: "2013",
  AC1032: "2018",
};

const CadSection: FC<{ projectId: string; onClose: () => void }> = ({ projectId, onClose }) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const doc = useAtomValue(docAtom);
  const commit = useSetAtom(commitAtom);
  const fit = useSetAtom(fitRequestAtom);
  const switchTool = useSetAtom(switchToolAtom);
  const setCalTarget = useSetAtom(calibrationTargetAtom);
  const cad = doc.cad;
  const loaded = useCadGeometry(projectId, cad);
  const [parsing, setParsing] = useState<{ stage: CadStage; fraction: number } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [opacity, setOpacity] = useState(cad?.opacity ?? 0.7);
  useEffect(() => setOpacity(cad?.opacity ?? 0.7), [cad?.opacity]);

  const update = (patch: Partial<CadBackground>) => commit((d) => (d.cad ? { ...d, cad: { ...d.cad, ...patch } } : d));

  const onFile = async (file: File) => {
    if (/\.dwg$/i.test(file.name)) {
      message.error(t("sim_v2.cad.dwg"));
      return;
    }
    if (file.size > MAX_BYTES) {
      message.error(t("sim_v2.cad.too_big", { mb: MAX_BYTES / 1024 / 1024 }));
      return;
    }
    setParsing({ stage: "decode", fraction: 0 });
    try {
      const buffer = await file.arrayBuffer();
      const replace = !!cad;
      const g = await parseDxfBuffer(buffer, cad ? { x: cad.baseX, y: cad.baseY } : null, (stage, fraction) => setParsing({ stage, fraction })).promise;
      if (!g.stats.polylines && !g.texts.length) {
        message.error(t("sim_v2.cad.empty"));
        return;
      }
      const fromFile = unitFromInsunits(g.header.insunits);
      const mb = g.mainBounds;
      const unit = replace && cad ? cad.unit : fromFile ?? guessUnit(mb.maxX - mb.minX, mb.maxY - mb.minY);
      const keepHidden = new Set(cad?.hiddenLayers ?? []);
      const hidden = g.layers.filter((l) => (replace ? keepHidden.has(l.name) : l.hiddenInFile)).map((l) => l.name);
      setPending({ file, geometry: g, unit, unitFromFile: !!fromFile, hidden, replace });
    } catch (err) {
      const code = err instanceof CadParseError ? err.code : "other";
      message.error(code === "binary" ? t("sim_v2.cad.binary") : code === "format" ? t("sim_v2.cad.not_dxf") : t("sim_v2.cad.read_failed", { reason: err instanceof Error ? err.message : String(err) }));
    } finally {
      setParsing(null);
    }
  };

  const doImport = async (p: Pending) => {
    setBusy(true);
    try {
      const uploaded = await uploadProjectFile(projectId, p.file, { kind: "dxf", fileName: p.file.name });
      const g = p.geometry;
      const mpu = p.replace && cad ? cad.metersPerUnit : CAD_UNIT_METERS[p.unit];
      const mb = g.mainBounds;
      let origin = { x: cad?.originX ?? 0, y: cad?.originY ?? 0 };
      if (!p.replace) {
        // 已經有點位: 圖的中心對到點位的中心; 不然主要範圍的左下角放在原點
        const nb = boundsOf(doc.nodes);
        if (nb) {
          origin = {
            x: (nb.minX + nb.maxX) / 2 - ((mb.minX + mb.maxX) / 2) * mpu,
            y: (nb.minY + nb.maxY) / 2 - ((mb.minY + mb.maxY) / 2) * mpu,
          };
        } else origin = { x: -mb.minX * mpu, y: -mb.minY * mpu };
      }
      const next: CadBackground = {
        kind: "dxf",
        fileId: uploaded.key,
        fileName: p.file.name,
        unit: p.unit,
        metersPerUnit: mpu,
        baseX: g.base.x,
        baseY: g.base.y,
        extent: { ...mb },
        originX: origin.x,
        originY: origin.y,
        hiddenLayers: p.hidden,
        opacity: cad?.opacity ?? 0.7,
        locked: true,
        calibrated: p.replace && cad ? cad.calibrated : false,
      };
      rememberCadGeometry(projectId, next, g);
      commit((d) => ({ ...d, cad: next }));
      setPending(null);
      if (!p.replace) fit((n) => n + 1);
      message.success(t(p.replace ? "sim_v2.cad.replaced" : "sim_v2.cad.imported", { name: p.file.name }));
    } catch (err) {
      message.error(t("sim_v2.bg.failed", { reason: apiErrorOf(err).message }));
    } finally {
      setBusy(false);
    }
  };

  const picker = (label: string) => (
    <Upload
      accept=".dxf,.dwg"
      showUploadList={false}
      disabled={!!parsing || busy}
      beforeUpload={(file) => {
        void onFile(file);
        return false;
      }}
    >
      <Button icon={<SyncOutlined />} loading={!!parsing}>
        {label}
      </Button>
    </Upload>
  );

  if (parsing) {
    return (
      <div style={{ padding: "24px 8px" }} data-testid="simv2-cad-parsing">
        <div style={{ marginBottom: 8 }}>{t(`sim_v2.cad.stage_${parsing.stage}`)}</div>
        <Progress percent={Math.round((parsing.stage === "flatten" ? 0.9 : parsing.stage === "parse" ? 0.1 + parsing.fraction * 0.8 : 0.05) * 100)} status="active" />
      </div>
    );
  }

  if (pending) {
    const g = pending.geometry;
    const mb = g.mainBounds;
    const mpu = pending.replace && cad ? cad.metersPerUnit : CAD_UNIT_METERS[pending.unit];
    const w = mb.maxX - mb.minX;
    const h = mb.maxY - mb.minY;
    const skipped = Object.entries(g.stats.skipped).sort((a, b) => b[1] - a[1]);
    return (
      <div data-testid="simv2-cad-pending">
        <Info>
          <span>{t("sim_v2.bg.file")}</span>
          <b>{pending.file.name}</b>
          <span>{t("sim_v2.cad.version")}</span>
          <b>
            {VERSION_NAMES[g.header.acadver] ?? (g.header.acadver || "?")}
            {g.header.encoding && g.header.encoding !== "utf-8" ? ` · ${g.header.encoding}` : ""}
          </b>
          <span>{t("sim_v2.cad.unit")}</span>
          <span>
            <Select<CadUnit>
              size="small"
              style={{ width: 120 }}
              value={pending.unit}
              disabled={pending.replace}
              options={CAD_UNITS.map((u) => ({ value: u, label: t(`sim_v2.cad.unit_${u}`) }))}
              onChange={(unit) => setPending({ ...pending, unit })}
              data-testid="simv2-cad-unit"
            />{" "}
            <span style={{ fontSize: 12 }}>
              {pending.replace ? t("sim_v2.cad.unit_kept") : pending.unitFromFile ? t("sim_v2.cad.unit_from_file") : t("sim_v2.cad.unit_guessed")}
            </span>
          </span>
          <span>{t("sim_v2.cad.size")}</span>
          <b data-testid="simv2-cad-size">{t("sim_v2.cad.size_value", { w: fmt(w * mpu), h: fmt(h * mpu) })}</b>
          <span>{t("sim_v2.cad.content")}</span>
          <b>{t("sim_v2.cad.content_value", { lines: g.stats.polylines, texts: g.stats.texts, blocks: g.stats.inserts })}</b>
        </Info>
        {(skipped.length > 0 || g.stats.xrefs.length > 0 || g.stats.truncated || g.stats.outliers > 0) && (
          <Notes>
            {skipped.length > 0 && (
              <li>{t("sim_v2.cad.note_skipped", { list: skipped.slice(0, 6).map(([k, n]) => `${k} ${n}`).join("、") })}</li>
            )}
            {g.stats.xrefs.length > 0 && <li>{t("sim_v2.cad.note_xref", { list: g.stats.xrefs.slice(0, 5).join("、") })}</li>}
            {g.stats.truncated && <li>{t("sim_v2.cad.note_truncated")}</li>}
            {g.stats.outliers > 0 && <li>{t("sim_v2.cad.note_outliers", { count: g.stats.outliers })}</li>}
          </Notes>
        )}
        <CadLayerList layers={g.layers} hidden={pending.hidden} onChange={(hidden) => setPending({ ...pending, hidden })} testId="simv2-cad-layers" />
        <Space style={{ marginTop: 16 }}>
          <Button type="primary" loading={busy} onClick={() => void doImport(pending)} data-testid="simv2-cad-import">
            {pending.replace ? t("sim_v2.cad.replace_confirm") : t("sim_v2.cad.import")}
          </Button>
          <Button disabled={busy} onClick={() => setPending(null)}>
            {t("sim_v2.common.cancel")}
          </Button>
        </Space>
      </div>
    );
  }

  if (!cad) {
    return (
      <Upload.Dragger
        accept=".dxf,.dwg"
        showUploadList={false}
        beforeUpload={(file) => {
          void onFile(file);
          return false;
        }}
        data-testid="simv2-cad-upload"
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">{t("sim_v2.cad.drop_here")}</p>
        <p className="ant-upload-hint">{t("sim_v2.cad.drop_hint")}</p>
      </Upload.Dragger>
    );
  }

  const ext = cad.extent;
  return (
    <div data-testid="simv2-cad-info">
      <Info>
        <span>{t("sim_v2.bg.file")}</span>
        <b>{cad.fileName}</b>
        <span>{t("sim_v2.cad.unit")}</span>
        <span>
          <Select<CadUnit>
            size="small"
            style={{ width: 120 }}
            value={cad.unit}
            options={CAD_UNITS.map((u) => ({ value: u, label: t(`sim_v2.cad.unit_${u}`) }))}
            // 換單位 = 照單位重新換算比例 (校正過的也一樣), 左下角不動
            onChange={(unit) => update({ unit, metersPerUnit: CAD_UNIT_METERS[unit], calibrated: false })}
          />{" "}
          {cad.calibrated ? <Tag color="success">{t("sim_v2.bg.calibrated")}</Tag> : null}
        </span>
        <span>{t("sim_v2.cad.size")}</span>
        <b>{t("sim_v2.cad.size_value", { w: fmt((ext.maxX - ext.minX) * cad.metersPerUnit), h: fmt((ext.maxY - ext.minY) * cad.metersPerUnit) })}</b>
        <span>{t("sim_v2.cad.scale")}</span>
        <b>{t("sim_v2.cad.scale_value", { mm: Number((cad.metersPerUnit * 1000).toPrecision(4)) })}</b>
        <span>{t("sim_v2.bg.opacity")}</span>
        <Slider min={0.1} max={1} step={0.05} value={opacity} onChange={setOpacity} onChangeComplete={(v) => update({ opacity: v })} />
        <span>{t("sim_v2.bg.locked")}</span>
        <span>
          <Switch size="small" checked={cad.locked} onChange={(v) => update({ locked: v })} /> <span style={{ fontSize: 12 }}>{t("sim_v2.bg.locked_tip")}</span>
        </span>
        <span>{t("sim_v2.cad.snap")}</span>
        <span>
          <Switch size="small" checked={doc.editor.snapCad} onChange={(v) => commit((d) => ({ ...d, editor: { ...d.editor, snapCad: v } }))} />{" "}
          <span style={{ fontSize: 12 }}>{t("sim_v2.cad.snap_tip")}</span>
        </span>
      </Info>
      {loaded.status === "loading" && <Alert type="info" showIcon title={t("sim_v2.cad.loading")} style={{ marginBottom: 12 }} />}
      {loaded.status === "error" && <Alert type="error" showIcon title={t("sim_v2.cad.load_failed", { reason: loaded.error })} style={{ marginBottom: 12 }} />}
      {loaded.geometry && (
        <div style={{ marginBottom: 16 }}>
          <CadLayerList layers={loaded.geometry.layers} hidden={cad.hiddenLayers} onChange={(hiddenLayers) => update({ hiddenLayers })} testId="simv2-cad-layers" />
        </div>
      )}
      <Space wrap>
        <Button
          type="primary"
          icon={<ColumnWidthOutlined />}
          data-testid="simv2-cad-calibrate"
          onClick={() => {
            setCalTarget("cad");
            switchTool("calibrate");
            onClose();
          }}
        >
          {t("sim_v2.bg.calibrate")}
        </Button>
        {picker(t("sim_v2.cad.replace"))}
        <Popconfirm title={t("sim_v2.cad.remove_confirm")} onConfirm={() => commit((d) => ({ ...d, cad: null }))}>
          <Button danger icon={<DeleteOutlined />}>
            {t("sim_v2.bg.remove")}
          </Button>
        </Popconfirm>
      </Space>
    </div>
  );
};

export default CadSection;
