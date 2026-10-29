import { FC, Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Form, Popconfirm, Segmented, Select, Spin, Upload } from "antd";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { ErrorBoundary } from "react-error-boundary";
import styled from "styled-components";
import { BUILTIN_MODELS, MODEL_YAWS, ModelChoice, VehicleModel, modelOfType } from "@/components/Fleet3D/vehicleModels";
import type { OptimizeResult } from "@/components/Fleet3D/upload/optimizeModel";
import { DangerButton, FieldLabel, GhostButton, Hint, Toolbar, WarnNote } from "../../ui/primitives";
import { c, font, space } from "../../ui/tokens";

/**
 * 車型設定的「3D 模型」: 用內建的哪一個, 或上傳 glb (上傳前在瀏覽器裡先減面壓縮, 見 optimizeModel)。
 * 上傳的檔案先放著, 按儲存 / 新增時才送 (新增的車型要先有 id)。旁邊的預覽跟首頁同一個元件,
 * 箭頭是車頭, 方向不對就轉。
 */

// three.js 很大, 打開設定頁不載, 要預覽時才載
const ModelPreview = lazy(() => import("@/components/Fleet3D/ModelPreview"));

export type UploadedModelFile = { file_name: string; size: number; updated_at: string } | null;

const Wrap = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: ${space.md};
  align-items: start;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.sm};
  min-width: 0;
`;

const PreviewBox = styled.div`
  position: relative;
  height: 220px;
  border: 1px solid ${c.border};
  background: ${c.bgMuted};
  overflow: hidden;
`;

const FileNote = styled.div`
  font-size: ${font.xs};
  color: ${c.textSecondary};
  word-break: break-all;
`;

const kb = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

type Props = {
  /** 編輯中的車型 id (新增時是 null) 和它已經上傳的模型 */
  typeId: string | null;
  uploaded: UploadedModelFile;
  /** 選好、處理好, 還沒送出的檔案 */
  pending: OptimizeResult | null;
  onPending: (p: OptimizeResult | null) => void;
  /** 刪掉已經上傳的模型 */
  onRemoveUploaded: () => void;
  removing: boolean;
};

const Model3dField: FC<Props> = ({ typeId, uploaded, pending, onPending, onRemoveUploaded, removing }) => {
  const { t } = useTranslation();
  const form = Form.useFormInstance();
  const choice = (Form.useWatch("model_3d", form) ?? null) as ModelChoice;
  const yaw = (Form.useWatch("model_3d_yaw", form) ?? 0) as number;
  const value = (Form.useWatch("value", form) ?? "") as string;
  const length = Number(Form.useWatch("length", form)) || 0;
  const width = Number(Form.useWatch("width", form)) || 0;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 還沒上傳的檔案給預覽用的網址; 換檔案或關掉時收回 (drei 的模型快取也清掉)
  const pendingUrl = useMemo(() => (pending ? URL.createObjectURL(pending.file) : null), [pending]);
  useEffect(
    () => () => {
      if (!pendingUrl) return;
      URL.revokeObjectURL(pendingUrl);
      void import("@react-three/drei").then(({ useGLTF }) => useGLTF.clear(pendingUrl));
    },
    [pendingUrl],
  );

  const model = useMemo<VehicleModel>(() => {
    if (choice === "custom" && pendingUrl) return { kind: "custom", url: pendingUrl, yaw, fitLength: length > 0 ? length : undefined };
    return modelOfType(
      {
        id: typeId ?? "",
        name: value,
        value,
        length,
        model_3d: choice,
        model_3d_yaw: yaw,
        model_3d_file: uploaded ? { updated_at: uploaded.updated_at } : null,
      },
      value,
    );
  }, [choice, pendingUrl, yaw, length, typeId, value, uploaded]);

  const pick = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const { optimizeModel, ModelFormatError } = await import("@/components/Fleet3D/upload/optimizeModel");
      try {
        const result = await optimizeModel(file);
        onPending(result);
        form.setFieldValue("model_3d", "custom");
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (e instanceof ModelFormatError && message === "draco") setError(t("fleet3d.model.error_draco"));
        else if (e instanceof ModelFormatError && message === "empty") setError(t("fleet3d.model.error_empty"));
        else setError(t("fleet3d.model.error_format", { message }));
      }
    } finally {
      setBusy(false);
    }
  };

  const options = [
    { value: "", label: t("fleet3d.model.default") },
    ...BUILTIN_MODELS.map((m) => ({ value: m, label: t(`fleet3d.model.${m}` as const) })),
    { value: "custom", label: t("fleet3d.model.custom"), disabled: !uploaded && !pending },
  ];

  return (
    <Wrap>
      <Column>
        <FieldLabel>{t("fleet3d.model.label")}</FieldLabel>
        {/* null (預設) 在 Select 裡用空字串表示 */}
        <Form.Item name="model_3d" noStyle getValueProps={(v) => ({ value: v ?? "" })} normalize={(v) => (v === "" ? null : v)}>
          <Select options={options} style={{ width: "100%" }} />
        </Form.Item>

        <Toolbar>
          <Upload
            accept=".glb"
            showUploadList={false}
            disabled={busy}
            beforeUpload={(file) => {
              void pick(file);
              return Upload.LIST_IGNORE;
            }}
          >
            <GhostButton type="button" disabled={busy}>
              <UploadOutlined />
              {uploaded || pending ? t("fleet3d.model.replace") : t("fleet3d.model.upload")}
            </GhostButton>
          </Upload>
          {uploaded && typeId && !pending && (
            <Popconfirm
              title={t("fleet3d.model.remove_confirm")}
              okText={t("utils.confirm")}
              cancelText={t("utils.cancel")}
              onConfirm={onRemoveUploaded}
            >
              <DangerButton type="button" disabled={removing}>
                <DeleteOutlined />
                {t("fleet3d.model.remove")}
              </DangerButton>
            </Popconfirm>
          )}
          {pending && (
            <GhostButton type="button" onClick={() => onPending(null)}>
              {t("utils.cancel")}
            </GhostButton>
          )}
        </Toolbar>
        {busy && (
          <FileNote>
            <Spin size="small" /> {t("fleet3d.model.processing")}
          </FileNote>
        )}
        {pending && (
          <FileNote>
            {t("fleet3d.model.pending", {
              name: pending.file.name,
              before: pending.trianglesBefore.toLocaleString(),
              after: pending.trianglesAfter.toLocaleString(),
              size: kb(pending.file.size),
            })}
          </FileNote>
        )}
        {!pending && uploaded && <FileNote>{t("fleet3d.model.uploaded", { name: uploaded.file_name, size: kb(uploaded.size) })}</FileNote>}
        {error && <WarnNote>{error}</WarnNote>}

        <FieldLabel>{t("fleet3d.model.rotate")}</FieldLabel>
        <Form.Item name="model_3d_yaw" noStyle>
          <Segmented options={MODEL_YAWS.map((d) => ({ value: d, label: `${d}°` }))} />
        </Form.Item>
        <Hint>{t("fleet3d.model.hint")}</Hint>
      </Column>

      <PreviewBox>
        {/* 模型讀不了 (檔案壞了、網路斷了) 只有預覽不顯示, 不影響整個設定頁 */}
        <ErrorBoundary
          resetKeys={[model.url]}
          fallback={
            <div style={{ display: "grid", placeItems: "center", height: "100%", color: c.textMuted }}>
              {t("fleet3d.model.preview_failed")}
            </div>
          }
        >
          <Suspense
            fallback={
              <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
                <Spin size="small" />
              </div>
            }
          >
            <ModelPreview key={model.url} model={model} length={length} width={width} frontLabel={t("fleet3d.model.front")} />
          </Suspense>
        </ErrorBoundary>
      </PreviewBox>
    </Wrap>
  );
};

export default Model3dField;
