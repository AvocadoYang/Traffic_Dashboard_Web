import { FC, useEffect } from "react";
import { Button, Form, Input, Modal, Popconfirm, message } from "antd";
import {
  CheckCircleFilled,
  DeleteOutlined,
  MinusCircleOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import client from "@/api/axiosClient";
import {
  AdvantechGroupRow,
  AdvantechStateRow,
  IoSide,
  STATE_TONES,
  StateCondition,
  StateTone,
  conditionMet,
  groupSignalName,
  groupSignals,
  signalValue,
  useAdvantechIoStatus,
} from "@/api/useAdvantech";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { c, font, space } from "@/theme/tokens";
import { Field, FieldLabel, Hint } from "@/pages/SettingV3/ui/primitives";
import { toneSoft, toneSolid } from "@/components/Advantech/stateTone";

/** 表單: 選了哪些訊號 ("模組id:di:0"), 全部 ON 才算 */
type StateForm = {
  name: string;
  note: string;
  tone: StateTone;
  signals: string[];
};

const keyOf = (moduleId: string, side: IoSide, channel: number) =>
  `${moduleId}:${side}:${channel}`;

const toConditions = (keys: string[]): StateCondition[] =>
  keys.map((k) => {
    const [moduleId, side, channel] = k.split(":");
    return {
      moduleId,
      side: side as IoSide,
      channel: Number(channel),
      on: true,
    };
  });

const ToneRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${space.sm};
`;

const ToneChip = styled.button<{ $tone: StateTone; $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ $tone, $active }) => ($active ? toneSolid($tone) : c.border)};
  background: ${({ $tone, $active }) =>
    $active ? toneSoft($tone, 18) : "transparent"};
  color: ${c.text};
  font-size: ${font.sm};
  cursor: pointer;

  &::before {
    content: "";
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${({ $tone }) => toneSolid($tone)};
  }

  &:focus-visible {
    outline: 2px solid ${c.accent};
    outline-offset: 2px;
  }
`;

const SideBlock = styled.div`
  margin-bottom: ${space.md};
`;

const SideTitle = styled.div`
  margin-bottom: ${space.xs};
  font-size: ${font.sm};
  font-weight: 600;
  color: ${c.textSecondary};
`;

/** 訊號一格一顆, 點了就選; 4 個一組 (一台模組), 組跟組之間空大一點 */
const SignalGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${space.sm} ${space.lg};
`;

const ModuleSet = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ModuleSetName = styled.span`
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: ${font.xs};
  color: ${c.textMuted};
`;

const ChipRow = styled.div`
  display: flex;
  gap: ${space.xs};
`;

const SignalChip = styled.button<{ $picked: boolean; $tone: StateTone }>`
  position: relative;
  width: 60px;
  min-height: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 4px 2px;
  border-radius: 6px;
  border: 1.5px solid
    ${({ $picked, $tone }) => ($picked ? toneSolid($tone) : c.border)};
  background: ${({ $picked, $tone }) => ($picked ? toneSoft($tone, 20) : c.bg)};
  color: ${c.text};
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;

  b {
    font-family: ${font.mono};
    font-size: ${font.md};
  }

  small {
    max-width: 56px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: ${font.mono};
    font-size: 10px;
    color: ${c.textMuted};
  }

  &:hover {
    border-color: ${({ $tone }) => toneSolid($tone)};
  }

  &:focus-visible {
    outline: 2px solid ${c.accent};
    outline-offset: 2px;
  }
`;

/** 格子右上角: 現在讀到的值 */
const ChipLamp = styled.span<{ $on: boolean | null }>`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $on }) =>
    $on === null ? "transparent" : $on ? c.accent : c.bgMuted};
  border: 1px solid ${({ $on }) => ($on ? c.accent : c.borderStrong)};
`;

const Picked = styled.div`
  font-family: ${font.mono};
  font-size: ${font.md};
  color: ${c.text};
`;

/** 給 Form.Item 包的: 吃掉它塞進來的 value / onChange, 只顯示選了哪些 */
const PickedText: FC<{ text: string; value?: unknown; onChange?: unknown }> = ({
  text,
}) => <Picked>{text}</Picked>;

/** 對話框最下面: 照現在的 IO 會不會顯示 */
const LivePreview = styled.div<{ $tone: StateTone; $met: boolean }>`
  display: flex;
  align-items: center;
  gap: ${space.sm};
  margin-top: ${space.md};
  padding: ${space.sm} ${space.md};
  border-radius: 6px;
  border-left: 4px solid
    ${({ $tone, $met }) => ($met ? toneSolid($tone) : c.borderStrong)};
  background: ${({ $tone, $met }) => ($met ? toneSoft($tone) : c.bgSubtle)};
  font-size: ${font.md};
  color: ${c.text};
`;

type Props = {
  open: boolean;
  group: AdvantechGroupRow | null;
  /** null = 新增 */
  state: AdvantechStateRow | null;
  onClose: () => void;
  onSaved: () => void;
};

/**
 * 訊號意義的編輯框: 選一個或好幾個訊號 (群組接續編號, 第 2 台模組是 DO4–7), 全部 ON 時代表什麼。
 * 例如 DO0 + DO1 = 專屬模式啟動、DO2 = 按下開門、DI0 = 電梯故障。
 */
const AdvantechStateModal: FC<Props> = ({
  open,
  group,
  state,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<StateForm>();
  const tone: StateTone = Form.useWatch("tone", form) ?? "blue";
  const picked: string[] = Form.useWatch("signals", form) ?? [];
  const name: string = Form.useWatch("name", form) ?? "";
  const { data: status } = useAdvantechIoStatus();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(
      state
        ? {
            name: state.name,
            note: state.note,
            tone: state.tone,
            signals: state.conditions.map((x) =>
              keyOf(x.moduleId, x.side, x.channel),
            ),
          }
        : { name: "", note: "", tone: "blue", signals: [] },
    );
  }, [open, state, form]);

  const onError = (e: ErrorResponse) => errorHandler(e, messageApi);
  const done = () => {
    void messageApi.success(t("utils.success"));
    onSaved();
    onClose();
  };

  const saveMutation = useMutation({
    mutationFn: (
      payload: Omit<AdvantechStateRow, "id" | "groupId" | "sortOrder">,
    ) =>
      client.post(
        state
          ? "api/setting/edit-advantech-state"
          : "api/setting/add-advantech-state",
        state
          ? { id: state.id, ...payload }
          : { groupId: group?.id, ...payload },
      ),
    onSuccess: done,
    onError,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client.post("api/setting/delete-advantech-state", { id }),
    onSuccess: done,
    onError,
  });

  const submit = async () => {
    let values: StateForm;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    saveMutation.mutate({
      name: values.name.trim(),
      note: (values.note ?? "").trim(),
      tone: values.tone,
      conditions: toConditions(values.signals ?? []),
    });
  };

  const toggle = (key: string) => {
    const next = picked.includes(key)
      ? picked.filter((k) => k !== key)
      : [...picked, key];
    form.setFieldValue("signals", next);
    void form.validateFields(["signals"]).catch(() => undefined);
  };

  const modules = group?.modules ?? [];
  const all = group
    ? [...groupSignals(group, "do"), ...groupSignals(group, "di")]
    : [];
  const pickedNames = all
    .filter((s) => picked.includes(keyOf(s.moduleId, s.side, s.channel)))
    .map((s) => groupSignalName(s.side, s.index));

  const conds = toConditions(picked);
  const ready = !!status && modules.length > 0;
  const liveMet =
    ready &&
    conds.length > 0 &&
    modules.every((m) => status?.get(m.id)?.connected) &&
    conds.every((x) => conditionMet(x, status));

  const renderSide = (side: IoSide) => {
    if (!group) return null;
    const signals = groupSignals(group, side);
    return (
      <SideBlock>
        <SideTitle>
          {side === "do" ? t("advantech.outputs") : t("advantech.inputs")}
        </SideTitle>
        <SignalGrid>
          {modules.map((m) => (
            <ModuleSet key={m.id}>
              {modules.length > 1 && (
                <ModuleSetName title={m.name}>{m.name}</ModuleSetName>
              )}
              <ChipRow>
                {signals
                  .filter((s) => s.moduleId === m.id)
                  .map((s) => {
                    const key = keyOf(s.moduleId, s.side, s.channel);
                    const on = signalValue(
                      status,
                      s.moduleId,
                      s.side,
                      s.channel,
                    );
                    const isPicked = picked.includes(key);
                    return (
                      <SignalChip
                        key={key}
                        type="button"
                        $picked={isPicked}
                        $tone={tone}
                        aria-pressed={isPicked}
                        title={[s.label?.code, s.label?.name]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => toggle(key)}
                      >
                        <ChipLamp $on={on} />
                        <b>{groupSignalName(s.side, s.index)}</b>
                        <small>{s.label?.code || " "}</small>
                      </SignalChip>
                    );
                  })}
              </ChipRow>
            </ModuleSet>
          ))}
        </SignalGrid>
      </SideBlock>
    );
  };

  return (
    <Modal
      open={open}
      title={
        state
          ? t("advantech.state.edit", { group: group?.name })
          : t("advantech.state.add", { group: group?.name })
      }
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saveMutation.isLoading}
      okText={t("utils.save")}
      cancelText={t("utils.cancel")}
      width={720}
      forceRender
      footer={(_, { OkBtn, CancelBtn }) => (
        <>
          {state && (
            <Popconfirm
              title={t("utils.delete_warn")}
              okText={t("utils.confirm")}
              cancelText={t("utils.cancel")}
              onConfirm={() => deleteMutation.mutate(state.id)}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                style={{ float: "left" }}
                loading={deleteMutation.isLoading}
              >
                {t("utils.delete")}
              </Button>
            </Popconfirm>
          )}
          <CancelBtn />
          <OkBtn />
        </>
      )}
    >
      {contextHolder}
      <Form form={form} layout="vertical" autoComplete="off">
        <FieldLabel>{t("advantech.state.signals")}</FieldLabel>
        <Hint>{t("advantech.state.signals_hint")}</Hint>
        {/* 值由下面的格子改, 這個欄位只負責驗證和顯示錯誤 */}
        <Form.Item
          name="signals"
          rules={[
            {
              validator: async (_, v: string[] | undefined) => {
                if (!v?.length) {
                  throw new Error(t("advantech.state.need_signal"));
                }
              },
            },
          ]}
          style={{ marginBottom: space.sm }}
        >
          <PickedText
            text={
              pickedNames.length
                ? pickedNames.join(" + ")
                : t("advantech.state.none_picked")
            }
          />
        </Form.Item>
        {renderSide("do")}
        {renderSide("di")}

        <Field>
          <FieldLabel>{t("advantech.state.name")}</FieldLabel>
          <Form.Item
            name="name"
            rules={[
              {
                required: true,
                whitespace: true,
                message: t("utils.required"),
              },
            ]}
          >
            <Input
              maxLength={100}
              placeholder={t("advantech.state.name_placeholder")}
            />
          </Form.Item>
        </Field>

        <Field as="div">
          <FieldLabel>{t("advantech.state.tone")}</FieldLabel>
          <Form.Item name="tone" hidden>
            <Input />
          </Form.Item>
          <ToneRow role="radiogroup">
            {STATE_TONES.map((x) => (
              <ToneChip
                key={x}
                type="button"
                role="radio"
                aria-checked={tone === x}
                $tone={x}
                $active={tone === x}
                onClick={() => form.setFieldValue("tone", x)}
              >
                {t(`advantech.state.tone_${x}`)}
              </ToneChip>
            ))}
          </ToneRow>
        </Field>

        <Field style={{ marginTop: space.md }}>
          <FieldLabel>{t("advantech.state.note")}</FieldLabel>
          <Form.Item name="note">
            <Input.TextArea
              maxLength={500}
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder={t("advantech.state.note_placeholder")}
            />
          </Form.Item>
        </Field>
      </Form>

      {ready && conds.length > 0 && (
        <LivePreview $tone={tone} $met={liveMet}>
          {liveMet ? (
            <CheckCircleFilled style={{ color: toneSolid(tone) }} />
          ) : (
            <MinusCircleOutlined style={{ color: c.textMuted }} />
          )}
          {liveMet
            ? t("advantech.state.live_met", { name: name || "—" })
            : t("advantech.state.live_not_met")}
        </LivePreview>
      )}
    </Modal>
  );
};

export default AdvantechStateModal;
