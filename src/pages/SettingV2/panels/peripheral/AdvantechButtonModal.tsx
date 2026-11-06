import { FC, useEffect } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  message,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import client from "@/api/axiosClient";
import {
  AdvantechButtonRow,
  AdvantechGroupRow,
  ButtonStep,
} from "@/api/useAdvantech";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { c, font, space } from "../../ui/tokens";
import { Field, FieldLabel, GhostButton, Hint } from "../../ui/primitives";
import { IO_COUNT } from "./AdvantechIo";

type StepAction = ButtonStep["action"];

/** 表單裡一步的樣子: 模組和輸出合成一個 target ("模組id:輸出"), 一個下拉選完 */
type StepForm = { action: StepAction; target?: string; ms?: number };
type ButtonForm = { name: string; note: string; steps: StepForm[] };

const DEFAULT_PULSE_MS = 500;
const DEFAULT_WAIT_MS = 1000;

const toTarget = (moduleId: string, channel: number) =>
  `${moduleId}:${channel}`;

const toForm = (steps: ButtonStep[]): StepForm[] =>
  steps.map((s) =>
    s.action === "WAIT"
      ? { action: "WAIT", ms: s.ms }
      : { action: s.action, target: toTarget(s.moduleId, s.channel), ms: s.ms },
  );

const toSteps = (steps: StepForm[]): ButtonStep[] =>
  steps.map((s) => {
    if (s.action === "WAIT")
      return { action: "WAIT", ms: s.ms ?? DEFAULT_WAIT_MS };
    const [moduleId, channel] = (s.target ?? "").split(":");
    return s.action === "PULSE"
      ? {
          action: s.action,
          moduleId,
          channel: Number(channel),
          ms: s.ms ?? DEFAULT_PULSE_MS,
        }
      : { action: s.action, moduleId, channel: Number(channel) };
  });

const StepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.xs};
  margin-bottom: ${space.sm};
`;

/** 一步一列: 第幾步、動作、哪個輸出、時間、上移 / 下移 / 刪除 */
const StepRow = styled.div`
  display: grid;
  grid-template-columns: 20px 110px minmax(0, 1fr) 120px auto;
  gap: ${space.xs};
  align-items: start;

  .ant-form-item {
    margin: 0;
  }

  @media (max-width: 600px) {
    grid-template-columns: 20px 1fr auto;
  }
`;

const StepIndex = styled.span`
  padding-top: 6px;
  font-family: ${font.mono};
  font-size: ${font.sm};
  color: ${c.textMuted};
`;

const StepButtons = styled.span`
  display: inline-flex;
  gap: 2px;
`;

type Props = {
  open: boolean;
  group: AdvantechGroupRow | null;
  /** null = 新增 */
  button: AdvantechButtonRow | null;
  onClose: () => void;
  onSaved: () => void;
};

/**
 * 自訂按鈕的編輯框: 名稱 + 依序要做的步驟。
 * 一步是「脈衝 (開一下再關) / 打開 / 關掉」某台模組的某個 Relay, 或「等待」幾毫秒。
 * 例如 到 6F = 脈衝 RL0+A (進入專屬模式) → 等 1 秒 → 脈衝 RL1+B (按鈕 6F 樓層)。
 */
const AdvantechButtonModal: FC<Props> = ({
  open,
  group,
  button,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<ButtonForm>();
  const steps = Form.useWatch("steps", form) ?? [];

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(
      button
        ? { name: button.name, note: button.note, steps: toForm(button.steps) }
        : {
            name: "",
            note: "",
            steps: [{ action: "PULSE", ms: DEFAULT_PULSE_MS }],
          },
    );
  }, [open, button, form]);

  const onError = (e: ErrorResponse) => errorHandler(e, messageApi);
  const done = () => {
    void messageApi.success(t("utils.success"));
    onSaved();
    onClose();
  };

  const saveMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      note: string;
      steps: ButtonStep[];
    }) =>
      client.post(
        button
          ? "api/setting/edit-advantech-button"
          : "api/setting/add-advantech-button",
        button
          ? { id: button.id, ...payload }
          : { groupId: group?.id, ...payload },
      ),
    onSuccess: done,
    onError,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client.post("api/setting/delete-advantech-button", { id }),
    onSuccess: done,
    onError,
  });

  const submit = async () => {
    let values: ButtonForm;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    saveMutation.mutate({
      name: values.name.trim(),
      note: (values.note ?? "").trim(),
      steps: toSteps(values.steps),
    });
  };

  // 群組裡每台模組的每個輸出, 有取名的帶上代號和名稱 (例如 「模組 A · RL2 · DOB 按鈕電梯開門」)
  const targetOptions = (group?.modules ?? []).map((m) => ({
    label: `${m.name} (${m.ip})`,
    options: Array.from({ length: IO_COUNT }, (_, ch) => {
      const l = m.ioLabels?.do[ch];
      return {
        value: toTarget(m.id, ch),
        label: [m.name, `RL${ch}`, l?.code, l?.name]
          .filter(Boolean)
          .join(" · "),
      };
    }),
  }));

  const actionOptions: { value: StepAction; label: string }[] = [
    { value: "PULSE", label: t("advantech.button.action_PULSE") },
    { value: "ON", label: t("advantech.button.action_ON") },
    { value: "OFF", label: t("advantech.button.action_OFF") },
    { value: "WAIT", label: t("advantech.button.action_WAIT") },
  ];

  return (
    <Modal
      open={open}
      title={
        button
          ? t("advantech.button.edit", { group: group?.name })
          : t("advantech.button.add", { group: group?.name })
      }
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saveMutation.isLoading}
      okText={t("utils.save")}
      cancelText={t("utils.cancel")}
      width={760}
      forceRender
      footer={(_, { OkBtn, CancelBtn }) => (
        <>
          {button && (
            <Popconfirm
              title={t("utils.delete_warn")}
              okText={t("utils.confirm")}
              cancelText={t("utils.cancel")}
              onConfirm={() => deleteMutation.mutate(button.id)}
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
        <Field>
          <FieldLabel>{t("advantech.button.name")}</FieldLabel>
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
              placeholder={t("advantech.button.name_placeholder")}
            />
          </Form.Item>
        </Field>

        <FieldLabel>{t("advantech.button.steps")}</FieldLabel>
        <Hint>{t("advantech.button.steps_hint")}</Hint>
        <Form.List
          name="steps"
          rules={[
            {
              validator: async (_, value: StepForm[] | undefined) => {
                if (!value?.length) {
                  throw new Error(t("advantech.button.need_step"));
                }
              },
            },
          ]}
        >
          {(fields, { add, remove, move }, { errors }) => (
            <>
              <StepList>
                {fields.map((field, i) => {
                  const action = steps[i]?.action;
                  const isWait = action === "WAIT";
                  const hasMs = isWait || action === "PULSE";
                  return (
                    <StepRow key={field.key}>
                      <StepIndex>{i + 1}</StepIndex>
                      <Form.Item name={[field.name, "action"]}>
                        <Select
                          options={actionOptions}
                          onChange={(next: StepAction) => {
                            // 換動作時把時間換成那個動作的預設, 免得等待沿用脈衝的 500
                            if (next === "PULSE" || next === "WAIT") {
                              form.setFieldValue(
                                ["steps", field.name, "ms"],
                                next === "PULSE"
                                  ? DEFAULT_PULSE_MS
                                  : DEFAULT_WAIT_MS,
                              );
                            }
                          }}
                        />
                      </Form.Item>
                      {isWait ? (
                        <span />
                      ) : (
                        <Form.Item
                          name={[field.name, "target"]}
                          rules={[
                            { required: true, message: t("utils.required") },
                          ]}
                        >
                          <Select
                            showSearch
                            optionFilterProp="label"
                            options={targetOptions}
                            placeholder={t("advantech.button.target")}
                          />
                        </Form.Item>
                      )}
                      {hasMs ? (
                        <Form.Item
                          name={[field.name, "ms"]}
                          rules={[
                            { required: true, message: t("utils.required") },
                          ]}
                        >
                          <InputNumber
                            min={50}
                            max={60000}
                            step={100}
                            precision={0}
                            suffix="ms"
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                      ) : (
                        <span />
                      )}
                      <StepButtons>
                        <GhostButton
                          type="button"
                          onClick={() => move(i, i - 1)}
                          disabled={i === 0}
                          aria-label="up"
                        >
                          <ArrowUpOutlined />
                        </GhostButton>
                        <GhostButton
                          type="button"
                          onClick={() => move(i, i + 1)}
                          disabled={i === fields.length - 1}
                          aria-label="down"
                        >
                          <ArrowDownOutlined />
                        </GhostButton>
                        <GhostButton
                          type="button"
                          onClick={() => remove(field.name)}
                          aria-label="remove"
                        >
                          <CloseOutlined />
                        </GhostButton>
                      </StepButtons>
                    </StepRow>
                  );
                })}
              </StepList>
              <Form.ErrorList errors={errors} />
              <GhostButton
                type="button"
                onClick={() => add({ action: "PULSE", ms: DEFAULT_PULSE_MS })}
                disabled={fields.length >= 50}
              >
                <PlusOutlined />
                {t("advantech.button.add_step")}
              </GhostButton>
            </>
          )}
        </Form.List>

        <Field style={{ marginTop: space.md }}>
          <FieldLabel>{t("advantech.button.note")}</FieldLabel>
          <Form.Item name="note">
            <Input.TextArea
              maxLength={500}
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>
        </Field>
      </Form>
    </Modal>
  );
};

export default AdvantechButtonModal;
