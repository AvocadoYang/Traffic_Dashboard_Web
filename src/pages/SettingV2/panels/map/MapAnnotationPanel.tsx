import { FC, useEffect } from "react";
import {
  ColorPicker,
  Input,
  InputNumber,
  Popconfirm,
  Segmented,
  message,
} from "antd";
import {
  BorderOutlined,
  DeleteOutlined,
  FontSizeOutlined,
  SaveOutlined,
  SelectOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useMap from "@/api/useMap";
import { ErrorResponse } from "@/utils/globalType";
import { editErrorHandler, errorHandler } from "@/utils/utils";
import {
  type Annotation,
  type AnnotationDraft,
  type AnnotationStyle,
  type AnnotationTool,
  annotationDraftAtom,
  annotationStyleAtom,
  annotationToolAtom,
  isDraftDirty,
  normalizeRect,
  toDraft,
} from "@/pages/Setting/mapComponents/components/AllAnnotations/annotationAtoms";
import {
  PanelShell,
  Section,
  SectionTitle,
  FieldGrid,
  Field,
  FieldLabel,
  Toolbar,
  SolidButton,
  GhostButton,
  DangerButton,
  Hint,
  EmptyState,
  CardList,
  ItemCard,
  CardTitleRow,
  Tag,
  CountNote,
} from "../../ui/primitives";

/** 顏色選擇器: 空字串 = 透明 (可以清掉) */
const ColorField: FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  clearable?: boolean;
}> = ({ label, value, onChange, clearable }) => {
  const { t } = useTranslation();
  return (
    <Field as="div">
      <FieldLabel>{label}</FieldLabel>
      <ColorPicker
        value={value || null}
        allowClear={clearable}
        showText={(c) =>
          value ? c.toHexString() : t("map_annotation.transparent")
        }
        onChange={(c) => onChange(c.cleared ? "" : c.toHexString())}
        onClear={() => onChange("")}
      />
    </Field>
  );
};

const MapAnnotationPanel: FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: map } = useMap();
  const [tool, setTool] = useAtom(annotationToolAtom);
  const [draft, setDraft] = useAtom(annotationDraftAtom);
  const [style, setStyle] = useAtom(annotationStyleAtom);

  const saved = map?.annotations ?? [];
  const mapId = map?.mapId ?? null;
  const dirty = isDraftDirty(draft, saved);

  // 換地圖時, 上一張圖的草稿不能帶過去
  useEffect(() => {
    setDraft(null);
    setTool("select");
  }, [mapId]);

  const refetchMap = () => queryClient.refetchQueries({ queryKey: ["map"] });

  const saveMutation = useMutation({
    mutationFn: async (d: AnnotationDraft) => {
      const { id, rev, ...fields } = normalizeRect(d);
      const res = id
        ? await client.post<Annotation>("api/setting/map-annotation/edit", {
            id,
            rev,
            ...fields,
          })
        : await client.post<Annotation>("api/setting/map-annotation/create", {
            mapId,
            ...fields,
          });
      return res.data;
    },
    onSuccess: async (row) => {
      void messageApi.success(t("utils.success"));
      await refetchMap();
      // 存完繼續選著它, 可以接著調
      setDraft(toDraft(row));
    },
    onError: (e: ErrorResponse) =>
      editErrorHandler(e, messageApi, () => {
        setDraft(null);
        void refetchMap();
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client.post("api/setting/map-annotation/delete", { id }),
    onSuccess: async (_, id) => {
      void messageApi.success(t("utils.success"));
      if (draft?.id === id) setDraft(null);
      await refetchMap();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  /** 改樣式: 有選著的就改它, 也記下來給下一個新的用 */
  const patchStyle = (p: Partial<AnnotationStyle>) => {
    setStyle({ ...style, ...p });
    if (draft) setDraft({ ...draft, ...p });
  };
  const patchDraft = (p: Partial<AnnotationDraft>) => {
    if (draft) setDraft({ ...draft, ...p });
  };

  const select = (a: Annotation) => {
    if (draft?.id === a.id) return;
    if (dirty) {
      void messageApi.warning(t("map_annotation.save_or_cancel_first"));
      return;
    }
    setTool("select");
    setDraft(toDraft(a));
    setStyle({
      fontSize: a.fontSize,
      color: a.color,
      backgroundColor: a.backgroundColor,
      borderColor: a.borderColor,
      fillColor: a.fillColor,
      borderWidth: a.borderWidth,
    });
  };

  const save = () => {
    if (!draft) return;
    if (!mapId) {
      void messageApi.error(t("map_manager.no_map_selected"));
      return;
    }
    if (draft.kind === "text" && !draft.text.trim()) {
      void messageApi.warning(t("map_annotation.text_required"));
      return;
    }
    saveMutation.mutate(draft);
  };

  // 樣式欄位: 有選著的看它的, 沒有就看「下一個新的」的樣式
  const s: AnnotationStyle = draft ?? style;
  const showRectFields = draft ? draft.kind === "rect" : tool === "rect";

  return (
    <PanelShell>
      {contextHolder}
      <Section>
        <SectionTitle>
          <TagsOutlined />
          {t("toolbar.map_setting.map_annotation")}
        </SectionTitle>

        <Segmented<AnnotationTool>
          block
          value={tool}
          onChange={(v) => {
            if (v !== "select" && dirty) {
              void messageApi.warning(t("map_annotation.save_or_cancel_first"));
              return;
            }
            if (v !== "select") setDraft(null);
            setTool(v);
          }}
          options={[
            {
              value: "select",
              icon: <SelectOutlined />,
              label: t("map_annotation.tool_select"),
            },
            {
              value: "text",
              icon: <FontSizeOutlined />,
              label: t("map_annotation.tool_text"),
            },
            {
              value: "rect",
              icon: <BorderOutlined />,
              label: t("map_annotation.tool_rect"),
            },
          ]}
        />
        <Hint>
          {tool === "text"
            ? t("map_annotation.hint_text")
            : tool === "rect"
              ? t("map_annotation.hint_rect")
              : t("map_annotation.hint_select")}
        </Hint>
      </Section>

      <Section>
        <SectionTitle>
          {draft
            ? draft.id
              ? t("map_annotation.editing")
              : t("map_annotation.new")
            : t("map_annotation.style_for_new")}
          {dirty ? <CountNote>{t("map_annotation.unsaved")}</CountNote> : null}
        </SectionTitle>

        {draft ? (
          <Field as="div">
            <FieldLabel>{t("map_annotation.text")}</FieldLabel>
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 4 }}
              maxLength={200}
              value={draft.text}
              placeholder={
                draft.kind === "rect"
                  ? t("map_annotation.text_optional")
                  : undefined
              }
              onChange={(e) => patchDraft({ text: e.target.value })}
            />
          </Field>
        ) : null}

        <FieldGrid $cols={3}>
          <Field as="div">
            <FieldLabel>{t("map_annotation.font_size")}</FieldLabel>
            <InputNumber
              style={{ width: "100%" }}
              min={4}
              max={400}
              value={s.fontSize}
              onChange={(v) => v != null && patchStyle({ fontSize: v })}
            />
          </Field>
          <ColorField
            label={t("map_annotation.color")}
            value={s.color}
            onChange={(v) => patchStyle({ color: v })}
          />
          <ColorField
            label={t("map_annotation.background_color")}
            value={s.backgroundColor}
            onChange={(v) => patchStyle({ backgroundColor: v })}
            clearable
          />
        </FieldGrid>

        {showRectFields ? (
          <FieldGrid $cols={3}>
            <ColorField
              label={t("map_annotation.border_color")}
              value={s.borderColor}
              onChange={(v) => patchStyle({ borderColor: v })}
              clearable
            />
            <Field as="div">
              <FieldLabel>{t("map_annotation.border_width")}</FieldLabel>
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                max={50}
                value={s.borderWidth}
                onChange={(v) => v != null && patchStyle({ borderWidth: v })}
              />
            </Field>
            <ColorField
              label={t("map_annotation.fill_color")}
              value={s.fillColor}
              onChange={(v) => patchStyle({ fillColor: v })}
              clearable
            />
          </FieldGrid>
        ) : null}

        {draft ? (
          <FieldGrid $cols={draft.kind === "text" ? 3 : 2}>
            <Field as="div">
              <FieldLabel>X (m)</FieldLabel>
              <InputNumber
                style={{ width: "100%" }}
                step={0.1}
                value={draft.x}
                onChange={(v) => {
                  if (v == null) return;
                  const dx = v - draft.x;
                  // 框線整個一起移, 大小不變
                  patchDraft({
                    x: v,
                    x2: draft.x2 == null ? null : round(draft.x2 + dx),
                  });
                }}
              />
            </Field>
            <Field as="div">
              <FieldLabel>Y (m)</FieldLabel>
              <InputNumber
                style={{ width: "100%" }}
                step={0.1}
                value={draft.y}
                onChange={(v) => {
                  if (v == null) return;
                  const dy = v - draft.y;
                  patchDraft({
                    y: v,
                    y2: draft.y2 == null ? null : round(draft.y2 + dy),
                  });
                }}
              />
            </Field>
            {draft.kind === "text" ? (
              <Field as="div">
                <FieldLabel>{t("map_annotation.rotation")}</FieldLabel>
                <InputNumber
                  style={{ width: "100%" }}
                  min={-180}
                  max={180}
                  step={15}
                  suffix="°"
                  value={draft.rotation}
                  onChange={(v) => v != null && patchDraft({ rotation: v })}
                />
              </Field>
            ) : null}
          </FieldGrid>
        ) : null}

        {draft ? (
          <Toolbar>
            <SolidButton onClick={save} disabled={saveMutation.isLoading}>
              <SaveOutlined />
              {t("utils.save")}
            </SolidButton>
            <GhostButton onClick={() => setDraft(null)}>
              {dirty ? t("utils.cancel") : t("map_annotation.deselect")}
            </GhostButton>
            {draft.id ? (
              <Popconfirm
                title={t("map_annotation.delete_confirm")}
                onConfirm={() => deleteMutation.mutate(draft.id as string)}
              >
                <DangerButton disabled={deleteMutation.isLoading}>
                  <DeleteOutlined />
                  {t("utils.delete")}
                </DangerButton>
              </Popconfirm>
            ) : null}
          </Toolbar>
        ) : null}
      </Section>

      <Section>
        <SectionTitle>
          {t("map_annotation.list")}
          <CountNote>{saved.length}</CountNote>
        </SectionTitle>
        {saved.length === 0 ? (
          <EmptyState>{t("map_annotation.empty")}</EmptyState>
        ) : (
          <CardList>
            {saved.map((a) => (
              <ItemCard
                key={a.id}
                $selected={draft?.id === a.id}
                onClick={() => select(a)}
                style={{ cursor: "pointer" }}
              >
                <CardTitleRow>
                  <span
                    style={{
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Tag style={{ marginRight: 8 }}>
                      {a.kind === "rect"
                        ? t("map_annotation.kind_rect")
                        : t("map_annotation.kind_text")}
                    </Tag>
                    <span
                      style={{
                        color: a.color || undefined,
                        background: a.backgroundColor || undefined,
                        padding: a.backgroundColor ? "0 6px" : 0,
                        outline:
                          a.kind === "rect" && a.borderColor
                            ? `2px solid ${a.borderColor}`
                            : undefined,
                      }}
                    >
                      {a.text || t("map_annotation.no_text")}
                    </span>
                  </span>
                  <Popconfirm
                    title={t("map_annotation.delete_confirm")}
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      deleteMutation.mutate(a.id);
                    }}
                    onCancel={(e) => e?.stopPropagation()}
                  >
                    <GhostButton onClick={(e) => e.stopPropagation()}>
                      <DeleteOutlined />
                    </GhostButton>
                  </Popconfirm>
                </CardTitleRow>
              </ItemCard>
            ))}
          </CardList>
        )}
      </Section>
    </PanelShell>
  );
};

const round = (v: number) => Math.round(v * 1000) / 1000;

export default MapAnnotationPanel;
