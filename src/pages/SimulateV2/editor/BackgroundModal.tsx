import { FC, useEffect, useState } from "react";
import { App, Button, InputNumber, Modal, Popconfirm, Slider, Space, Switch, Tabs, Tag, Upload } from "antd";
import { DeleteOutlined, InboxOutlined, ColumnWidthOutlined, SyncOutlined } from "@ant-design/icons";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { uploadProjectFile, apiErrorOf } from "../api/simV2Api";
import { imageSizeOf } from "../io/image";
import { PdfDocument, openPdf, renderPdfPage } from "../io/pdf";
import { boundsOf } from "../model/geometry";
import { ImageBackground } from "../model/types";
import { calibrationTargetAtom, commitAtom, docAtom, fitRequestAtom, switchToolAtom } from "../state/editorAtoms";
import CadSection from "./CadSection";

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

/** 新底圖還沒校正前先當作一個像素 5 公分 */
const DEFAULT_METERS_PER_PX = 0.05;

const BackgroundModal: FC<{ open: boolean; projectId: string; onClose: () => void }> = ({ open, projectId, onClose }) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const doc = useAtomValue(docAtom);
  const commit = useSetAtom(commitAtom);
  const switchTool = useSetAtom(switchToolAtom);
  const fit = useSetAtom(fitRequestAtom);
  const setCalTarget = useSetAtom(calibrationTargetAtom);
  const [busy, setBusy] = useState(false);
  // 只有 DXF 時打開就停在 DXF 那一頁
  const [tab, setTab] = useState<"image" | "cad">("image");
  useEffect(() => {
    if (open) setTab(doc.cad && !doc.background ? "cad" : "image");
    // 只在打開的那一下決定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const [pdf, setPdf] = useState<{ pdf: PdfDocument; name: string; page: number } | null>(null);
  const bg = doc.background;
  const [opacity, setOpacity] = useState(bg?.opacity ?? 0.6);
  useEffect(() => setOpacity(bg?.opacity ?? 0.6), [bg?.opacity]);

  const place = async (blob: Blob, fileName: string, source: ImageBackground["source"], pdfPage?: number) => {
    const size = await imageSizeOf(blob);
    const uploaded = await uploadProjectFile(projectId, blob, { kind: "image", fileName });
    const w = size.width * DEFAULT_METERS_PER_PX;
    const h = size.height * DEFAULT_METERS_PER_PX;
    // 已經有點位就把圖放在點位中間, 不然左下角對齊原點
    const b = boundsOf(doc.nodes);
    const origin = b ? { x: (b.minX + b.maxX) / 2 - w / 2, y: (b.minY + b.maxY) / 2 - h / 2 } : { x: 0, y: 0 };
    commit((d) => ({
      ...d,
      background: {
        kind: "image",
        fileId: uploaded.key,
        fileName,
        source,
        ...(pdfPage ? { pdfPage } : {}),
        widthPx: size.width,
        heightPx: size.height,
        originX: origin.x,
        originY: origin.y,
        metersPerPx: DEFAULT_METERS_PER_PX,
        opacity: 0.6,
        // 預設鎖定: 沒鎖定時在底圖上拖曳是移動底圖, 不能框選
        locked: true,
        calibrated: false,
      },
    }));
    fit((n) => n + 1);
    message.info(t("sim_v2.bg.uploaded_calibrate"));
  };

  const run = async (job: () => Promise<void>) => {
    setBusy(true);
    try {
      await job();
    } catch (err) {
      message.error(t("sim_v2.bg.failed", { reason: apiErrorOf(err).message }));
    } finally {
      setBusy(false);
    }
  };

  const usePdfPage = (p: PdfDocument, name: string, page: number) =>
    run(async () => {
      const r = await renderPdfPage(p, page);
      await place(r.blob, `${name.replace(/\.pdf$/i, "")}-p${page}.png`, "pdf", page);
      setPdf(null);
    });

  const onFile = (file: File) =>
    run(async () => {
      if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
        const p = await openPdf(file);
        if (p.numPages > 1) {
          setPdf({ pdf: p, name: file.name, page: 1 });
          return;
        }
        const r = await renderPdfPage(p, 1);
        await place(r.blob, `${file.name.replace(/\.pdf$/i, "")}.png`, "pdf", 1);
        return;
      }
      if (!file.type.startsWith("image/")) {
        message.error(t("sim_v2.bg.wrong_type"));
        return;
      }
      await place(file, file.name, "upload");
    });

  const picker = (label: string, icon = <InboxOutlined />) => (
    <Upload
      accept=".png,.jpg,.jpeg,.pdf"
      showUploadList={false}
      disabled={busy}
      beforeUpload={(file) => {
        void onFile(file);
        return false;
      }}
    >
      <Button icon={icon} loading={busy} data-testid="simv2-bg-upload">
        {label}
      </Button>
    </Upload>
  );

  const update = (patch: Partial<ImageBackground>) =>
    commit((d) => (d.background ? { ...d, background: { ...d.background, ...patch } } : d));

  const imagePane = (
    <>
      {pdf ? (
        <Space orientation="vertical">
          <span>{t("sim_v2.bg.pdf_pages", { count: pdf.pdf.numPages })}</span>
          <Space>
            <InputNumber min={1} max={pdf.pdf.numPages} precision={0} value={pdf.page} onChange={(v) => setPdf({ ...pdf, page: v ?? 1 })} />
            <Button type="primary" loading={busy} onClick={() => void usePdfPage(pdf.pdf, pdf.name, pdf.page)}>
              {t("sim_v2.bg.use_page")}
            </Button>
            <Button onClick={() => setPdf(null)}>{t("sim_v2.common.cancel")}</Button>
          </Space>
        </Space>
      ) : !bg ? (
        <Upload.Dragger
          accept=".png,.jpg,.jpeg,.pdf"
          showUploadList={false}
          disabled={busy}
          beforeUpload={(file) => {
            void onFile(file);
            return false;
          }}
        >
          <p className="ant-upload-drag-icon">{busy ? <SyncOutlined spin /> : <InboxOutlined />}</p>
          <p className="ant-upload-text">{t("sim_v2.bg.drop_here")}</p>
          <p className="ant-upload-hint">{t("sim_v2.bg.drop_hint")}</p>
        </Upload.Dragger>
      ) : (
        <>
          <Info data-testid="simv2-bg-info">
            <span>{t("sim_v2.bg.file")}</span>
            <b>{bg.fileName}</b>
            <span>{t("sim_v2.bg.size")}</span>
            <b>
              {t("sim_v2.bg.size_value", {
                w: bg.widthPx,
                h: bg.heightPx,
                mw: (bg.widthPx * bg.metersPerPx).toFixed(1),
                mh: (bg.heightPx * bg.metersPerPx).toFixed(1),
              })}
            </b>
            <span>{t("sim_v2.bg.scale")}</span>
            <b>
              {t("sim_v2.bg.scale_value", { cm: (bg.metersPerPx * 100).toFixed(2) })}{" "}
              {bg.calibrated ? <Tag color="success">{t("sim_v2.bg.calibrated")}</Tag> : <Tag color="warning">{t("sim_v2.bg.not_calibrated")}</Tag>}
            </b>
            <span>{t("sim_v2.bg.opacity")}</span>
            <Slider
              min={0.1}
              max={1}
              step={0.05}
              value={opacity}
              onChange={setOpacity}
              onChangeComplete={(v) => update({ opacity: v })}
            />
            <span>{t("sim_v2.bg.locked")}</span>
            <span>
              <Switch size="small" checked={bg.locked} onChange={(v) => update({ locked: v })} />{" "}
              <span style={{ fontSize: 12 }}>{t("sim_v2.bg.locked_tip")}</span>
            </span>
          </Info>
          <Space wrap>
            <Button
              type="primary"
              icon={<ColumnWidthOutlined />}
              data-testid="simv2-bg-calibrate"
              onClick={() => {
                setCalTarget("image");
                switchTool("calibrate");
                onClose();
              }}
            >
              {t("sim_v2.bg.calibrate")}
            </Button>
            {picker(t("sim_v2.bg.replace"), <SyncOutlined />)}
            <Popconfirm title={t("sim_v2.bg.remove_confirm")} onConfirm={() => commit((d) => ({ ...d, background: null }))}>
              <Button danger icon={<DeleteOutlined />}>
                {t("sim_v2.bg.remove")}
              </Button>
            </Popconfirm>
          </Space>
        </>
      )}
    </>
  );

  return (
    <Modal open={open} title={t("sim_v2.bg.title")} onCancel={onClose} footer={null} width={600} destroyOnHidden>
      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as "image" | "cad")}
        items={[
          { key: "image", label: t("sim_v2.bg.tab_image"), children: imagePane },
          { key: "cad", label: <span data-testid="simv2-bg-tab-cad">{t("sim_v2.bg.tab_cad")}</span>, children: <CadSection projectId={projectId} onClose={onClose} /> },
        ]}
      />
    </Modal>
  );
};

export default BackgroundModal;
