import { FC, useCallback, useEffect, useMemo, useState } from "react";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Skeleton,
  Tooltip,
  message,
} from "antd";
import type { FormInstance } from "antd";
import {
  CheckCircleOutlined,
  SettingOutlined,
  SwapOutlined,
  ToolOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import styled from "styled-components";
import { useMutation } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useOneTaskDetailFork from "@/api/useOneTaskDetailFork";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { controlList } from "@/pages/Setting/formComponent/forms/missionComponents/editMission/forkEditMissionSlice/params";
import {
  Action_Type,
  Select_Location_Type,
} from "@/pages/Setting/formComponent/forms/missionComponents/editMission/forkEditMissionSlice/types";
import SegmentedControl from "../../../../ui/SegmentedControl";
import { c, font, space } from "../../../../ui/tokens";
import {
  CountNote,
  Field,
  FieldGrid,
  FieldLabel,
  GhostButton,
  Hint,
  Section,
  SectionTitle,
  SolidButton,
  Tag,
  Toolbar,
} from "../../../../ui/primitives";
import useForkOptions, { YawGenre } from "./forkOptions";
import ControlSequence from "./ControlSequence";
import ControlParamFields from "./ControlParamFields";

/** 需要使用者按確認才會往下走的設備動作,它自己就是一個「停在這裡」的步驟 */
const USER_CONFIRM = "USER_CONFORM_NEXT_TASK_STEP";

/** 這些動作沒有目標地點可以設 */
const NO_LOCATION_ACTIONS = [
  "spin",
  "fork",
  "charge",
  "cargo_limit",
  "verity_cargo",
];

const PERIPHERAL_ACTIONS = [
  { label: "使用者確認", value: USER_CONFIRM },
  { label: "開啟捲門", value: "OPEN_ROLLING_DOOR" },
  { label: "關閉捲門", value: "CLOSE_ROLLING_DOOR" },
  { label: "檢查門是否開啟(維修開啟)", value: "READ_ROLLING_DOOR_OPEN" },
  { label: "檢查門是否關閉(維修關閉)", value: "READ_ROLLING_DOOR_CLOSE" },
];

/**
 * 設定完不完整的提示。灰黑白之下用「實心深底 = 可以送出、灰底虛線 = 還缺東西」
 * 表示,不用紅黃綠三色燈。
 */
const StatusNote = styled.div<{ $ok: boolean }>`
  display: flex;
  align-items: center;
  gap: ${space.sm};
  padding: ${space.sm} ${space.md};
  font-family: ${font.mono};
  font-size: ${font.xs};
  font-weight: 600;
  letter-spacing: 0.8px;
  border: 1px ${({ $ok }) => ($ok ? "solid" : "dashed")} ${c.borderStrong};
  background: ${({ $ok }) => ($ok ? c.accent : c.bgSubtle)};
  color: ${({ $ok }) => ($ok ? "#ffffff" : c.textSecondary)};
`;

const FormShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.lg};
  font-family: ${font.mono};
  color: ${c.text};

  /* 間距交給 Section / Field,antd 自己的留白會讓表單散掉 */
  .ant-form-item {
    margin-bottom: 0;
  }
`;

const ParamStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.sm};
`;

type Props = {
  editTaskKey: string;
  selectedMissionKey: string;
  form: FormInstance;
};

const ForkTaskForm: FC<Props> = ({
  editTaskKey,
  selectedMissionKey,
  form,
}) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const currentMapId = useAtomValue(currentMapIdAtom);

  const { data: origin, isLoading } = useOneTaskDetailFork(editTaskKey);

  const [action, setAction] = useState<Action_Type>("move");
  const [showSpecial, setShowSpecial] = useState(false);
  const [sequence, setSequence] = useState<string[]>([]);
  const [locationType, setLocationType] =
    useState<Select_Location_Type>("custom");
  const [levelType, setLevelType] = useState<"custom" | "select">("custom");
  const [yawType, setYawType] = useState<YawGenre>();
  const [peripheral, setPeripheral] = useState("NULL");

  const values = Form.useWatch([], form);

  const {
    locationOptions,
    normalActions,
    specialActions,
    locationTypeOptions,
    levelTypeOptions,
    yawTypeOptions,
  } = useForkOptions(action);

  /* ----------------------------- 載入原本的值 ----------------------------- */

  useEffect(() => {
    if (!origin || !editTaskKey) return;

    setAction(origin.operation.type as Action_Type);
    setLocationType(
      (origin.operation.is_define_id as Select_Location_Type) || "custom",
    );
    setLevelType(
      (origin.io.fork_global?.is_define_level as "select" | "custom") ||
        "custom",
    );
    setYawType(origin.operation.is_define_yaw as YawGenre);
    setSequence(origin.operation.control ?? []);
    setPeripheral(origin.io?.peripheral_action?.type || "NULL");

    // v1 這裡包了一層 setTimeout(0)。那是為了避開「form 還沒接上 Form 元素」
    // 的警告,但這個 effect 是等 API 回來才跑的,那時候 Form 早就掛好了。
    form.setFieldsValue({
      action_type: origin.operation.type,
      locationId: origin.operation.locationId?.toString(),
      is_define_yaw: origin.operation.is_define_yaw,
      yaw: origin.operation.yaw,
      tolerance: origin.operation.tolerance,
      lookahead: origin.operation.lookahead,
      io: origin.io,
      is_define_id: origin.operation.is_define_id,
      is_define_level: origin.io.fork_global?.is_define_level || "custom",
      // 顯示的樓層是 1 起算,後端存的是 0 起算
      level: (origin.io.fork_global?.level + 1) | 0,
      peripheral_action_type: origin.io?.peripheral_action?.type || "NULL",
      peripheral_action_message: origin.io?.peripheral_action?.message || "",
      lidar_mode: origin?.io?.lidar?.mode || "auto",
      lidar_front: origin?.io?.lidar?.front || 0,
      lidar_rear: origin?.io?.lidar?.rear || 0,
    });
  }, [origin, form, editTaskKey]);

  /* --------------------------- 控制序列的增刪排序 --------------------------- */

  /**
   * io.fork 是用「控制項在序列中的位置」當 key 的物件,而且只有需要填參數的
   * 控制項才會有一筆。所以搬動或刪除之後要按舊索引 -> 新索引重新對應。
   *
   * v1 是拿 Object.keys(io.fork) 的「第幾個」去對序列的「第幾個」,
   * 兩者只有在每個控制項都有參數時才剛好一致;像 [F, tilt] 這種序列,
   * io.fork 只有 key "1",刪掉 F 會把 tilt 的參數一起清掉。
   */
  const remapForkValues = useCallback(
    (newOrderOfOldIndices: number[]) => {
      const current = (form.getFieldValue(["io", "fork"]) ?? {}) as Record<
        string,
        unknown
      >;
      const next: Record<string, unknown> = {};
      newOrderOfOldIndices.forEach((oldIndex, newIndex) => {
        const value = current[String(oldIndex)];
        if (value !== undefined) next[String(newIndex)] = value;
      });
      form.setFieldValue(["io", "fork"], next);
    },
    [form],
  );

  const addControl = (control: string) =>
    setSequence((prev) => [...prev, control]);

  const removeControl = (index: number) => {
    remapForkValues(sequence.map((_, i) => i).filter((i) => i !== index));
    setSequence((prev) => prev.filter((_, i) => i !== index));
  };

  const moveControl = (from: number, to: number) => {
    if (to < 0 || to >= sequence.length) return;
    const indices = sequence.map((_, i) => i);
    const [moved] = indices.splice(from, 1);
    indices.splice(to, 0, moved);
    remapForkValues(indices);
    setSequence((prev) => {
      const next = [...prev];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
  };

  const resetSequence = () => {
    setSequence([]);
    form.setFieldValue(["io", "fork"], {});
  };

  const changeAction = (next: Action_Type) => {
    setSequence([]);
    setAction(next);
    form.setFieldValue("locationId", 0);
    form.setFieldValue(["io", "fork"], {});
  };

  /* ------------------------------- 顯示條件 ------------------------------- */

  const needsLocation =
    !NO_LOCATION_ACTIONS.includes(action) && peripheral !== USER_CONFIRM;

  /** fork_height 選了 stack / stack_add 時,樓層是由堆疊邏輯決定的,不用再填 */
  const isStackMode = useMemo(() => {
    const fork = (values?.io?.fork ?? {}) as Record<
      string,
      { fork_height?: { is_define_height?: string } }
    >;
    return Object.values(fork).some(
      (step) =>
        step?.fork_height?.is_define_height === "stack" ||
        step?.fork_height?.is_define_height === "stack_add",
    );
  }, [values]);

  const hasWait = sequence.some((v) => v.startsWith("W"));
  const isPeripheral = action === "peripheral_action";

  const status = useMemo(() => {
    if (sequence.length === 0 && !isPeripheral) {
      return {
        ok: false,
        icon: <WarningOutlined />,
        text: t("mission.task_form_fork.validation.warning"),
      };
    }
    if (needsLocation && locationType === "custom" && !values?.locationId) {
      return {
        ok: false,
        icon: <WarningOutlined />,
        text: t("mission.task_form_fork.validation.error"),
      };
    }
    return {
      ok: true,
      icon: <CheckCircleOutlined />,
      text: t("mission.task_form_fork.validation.ok"),
    };
  }, [sequence, isPeripheral, needsLocation, locationType, values, t]);

  /* -------------------------------- 送出 -------------------------------- */

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      client.post("api/setting/update-task-fork", payload),
    onSuccess: () => void messageApi.success(t("utils.success")),
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const onFinish = () => {
    if (sequence.length === 0 && !isPeripheral) {
      void messageApi.warning(t("mission.task_table.control_warn"));
      return;
    }
    saveMutation.mutate({
      ...(form.getFieldsValue() as Record<string, unknown>),
      currentMapId,
      is_define_id: locationType,
      action_type: action,
      control: sequence,
      id: editTaskKey,
      is_define_yaw: yawType,
      missionTitleId: selectedMissionKey,
    });
  };

  if (isLoading) return <Skeleton active />;

  return (
    <FormShell>
      {contextHolder}

      <StatusNote $ok={status.ok}>
        {status.icon}
        <span>{status.text}</span>
        <span style={{ flex: 1 }} />
        <CountNote style={{ color: "inherit" }}>
          {`${t("mission.task_form_fork.steps")} ${sequence.length}`}
        </CountNote>
      </StatusNote>

      <Form form={form} autoComplete="off" layout="vertical" onFinish={onFinish}>
        <Section>
          <SectionTitle>
            <ToolOutlined />
            {t("mission.task_form_fork.action_type")}
            <span style={{ flex: 1 }} />
            <Tag>{editTaskKey.slice(0, 8) || "N/A"}</Tag>
          </SectionTitle>

          <Field>
            <FieldLabel>{t("mission.task_form_fork.select_action")}</FieldLabel>
            <Form.Item name="action_type" noStyle>
              <SegmentedControl<Action_Type>
                onChange={changeAction}
                options={showSpecial ? specialActions : normalActions}
              />
            </Form.Item>
          </Field>

          <Toolbar>
            <Tooltip
              title={
                showSpecial
                  ? t("mission.task_form_fork.switch_to_normal")
                  : t("mission.task_form_fork.switch_to_special")
              }
            >
              <GhostButton
                type="button"
                onClick={() => setShowSpecial((v) => !v)}
              >
                <SwapOutlined />
                {showSpecial
                  ? t("mission.task_form_fork.normal")
                  : t("mission.task_form_fork.special")}
              </GhostButton>
            </Tooltip>
            <Hint style={{ margin: 0 }}>
              目前是{showSpecial
                ? t("mission.task_form_fork.special")
                : t("mission.task_form_fork.normal")}
            </Hint>
          </Toolbar>
        </Section>

        {!isPeripheral && (
          <Section>
            <SectionTitle>
              <ToolOutlined />
              {t("mission.task_form_fork.control_sequence")}
            </SectionTitle>
            <ControlSequence
              available={controlList[action] ?? []}
              sequence={sequence}
              onAdd={addControl}
              onMove={moveControl}
              onRemove={removeControl}
              onReset={resetSequence}
            />
          </Section>
        )}

        {!isPeripheral && sequence.length > 0 && (
          <Section>
            <SectionTitle>
              <SettingOutlined />
              {t("mission.task_form_fork.control_params")}
            </SectionTitle>
            <ParamStack>
              <ControlParamFields
                controlSequence={sequence}
                form={form}
                locationOptions={locationOptions}
              />
            </ParamStack>
          </Section>
        )}

        {isPeripheral && (
          <Section>
            <SectionTitle>
              <SettingOutlined />
              設備控制
            </SectionTitle>

            <Field>
              <FieldLabel>選擇類別</FieldLabel>
              <Form.Item name="peripheral_action_type" noStyle>
                <Select
                  options={PERIPHERAL_ACTIONS}
                  onChange={setPeripheral}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>

            {peripheral === USER_CONFIRM && (
              <Field>
                <FieldLabel>要顯示給操作者的內容</FieldLabel>
                <Form.Item name="peripheral_action_message" noStyle>
                  <Input />
                </Form.Item>
              </Field>
            )}
          </Section>
        )}

        {needsLocation && (
          <Section>
            <SectionTitle>
              <SettingOutlined />
              {t("mission.task_form_fork.location_config")}
            </SectionTitle>

            <FieldGrid>
              <Field>
                <FieldLabel>
                  {t("mission.task_form_fork.select_location_type")}
                </FieldLabel>
                <Form.Item name="is_define_id" noStyle>
                  <Select
                    onChange={(v: Select_Location_Type) => setLocationType(v)}
                    options={locationTypeOptions}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Field>

              {locationType === "custom" && (
                <Field>
                  <FieldLabel>
                    {t("mission.task_form_fork.target_location")}
                  </FieldLabel>
                  <Form.Item
                    name="locationId"
                    rules={[
                      {
                        required: true,
                        message: t("mission.task_table.location_required"),
                      },
                    ]}
                  >
                    <Select
                      options={locationOptions}
                      style={{ width: "100%" }}
                      placeholder={t("utils.select")}
                      showSearch={{
                        filterOption: (input, option) =>
                          (option?.label ?? "")
                            .toLowerCase()
                            .includes(input.toLowerCase()),
                      }}
                    />
                  </Form.Item>
                </Field>
              )}
            </FieldGrid>
          </Section>
        )}

        {action === "spin" && (
          <Section>
            <SectionTitle>
              <SettingOutlined />
              {t("mission.task_form_fork.yaw_config")}
            </SectionTitle>

            <Field>
              <FieldLabel>
                {t("mission.task_form_fork.select_yaw_type")}
              </FieldLabel>
              <Form.Item name="is_define_yaw" noStyle>
                <SegmentedControl<YawGenre>
                  onChange={setYawType}
                  options={yawTypeOptions}
                />
              </Form.Item>
            </Field>

            {yawType === YawGenre.CUSTOM && (
              <Field>
                <FieldLabel>{t("mission.task_form_fork.yaw_angle")}</FieldLabel>
                <Form.Item
                  name="yaw"
                  rules={[
                    {
                      required: true,
                      message: t("mission.task_table.yaw_required"),
                    },
                    {
                      type: "number",
                      min: -180,
                      max: 180,
                      message: t("mission.task_table.yaw_range"),
                    },
                  ]}
                >
                  <InputNumber
                    min={-180}
                    max={180}
                    addonAfter="°"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Field>
            )}
          </Section>
        )}

        {(action === "load" || action === "offload") && !isStackMode && (
          <Section>
            <SectionTitle>
              <SettingOutlined />
              {t("mission.task_form_fork.level_config")}
            </SectionTitle>

            <FieldGrid>
              <Field>
                <FieldLabel>
                  {t("mission.task_form_fork.select_level_type")}
                </FieldLabel>
                <Form.Item name="is_define_level" noStyle>
                  <Select
                    onChange={(v: "select" | "custom") => setLevelType(v)}
                    options={levelTypeOptions}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Field>

              {levelType === "custom" && (
                <Field>
                  <FieldLabel>{t("mission.task_form_fork.level")}</FieldLabel>
                  <Form.Item
                    name="level"
                    rules={[{ required: true, message: t("utils.required") }]}
                  >
                    <InputNumber min={1} style={{ width: "100%" }} />
                  </Form.Item>
                </Field>
              )}
            </FieldGrid>
            <Hint>{t("mission.task_form_fork.level_select_warn")}</Hint>
          </Section>
        )}

        {hasWait && (
          <Section>
            <SectionTitle>
              <SettingOutlined />
              {t("mission.task_form_fork.wait_config")}
            </SectionTitle>
            <Field>
              <FieldLabel>{t("mission.task_form_fork.wait_time")}</FieldLabel>
              <Form.Item name="wait" noStyle>
                <InputNumber
                  min={1}
                  placeholder="1"
                  addonAfter="s"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Field>
          </Section>
        )}

        <Section>
          <SectionTitle>
            <SettingOutlined />
            {t("mission.task_form_fork.lidar")}
          </SectionTitle>

          <Field>
            <FieldLabel>{t("mission.task_form_fork.mode")}</FieldLabel>
            <Form.Item name="lidar_mode" noStyle>
              <SegmentedControl<string>
                options={[
                  { label: t("mission.task_form_fork.lidar_auto"), value: "auto" },
                  {
                    label: t("mission.task_form_fork.lidar_select"),
                    value: "select",
                  },
                ]}
              />
            </Form.Item>
          </Field>

          <FieldGrid>
            <Field>
              <FieldLabel>{t("mission.task_form_fork.front_lidar")}</FieldLabel>
              <Form.Item name="lidar_front" noStyle>
                <InputNumber min={1} placeholder="1" style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("mission.task_form_fork.rear_lidar")}</FieldLabel>
              <Form.Item name="lidar_rear" noStyle>
                <InputNumber min={1} placeholder="1" style={{ width: "100%" }} />
              </Form.Item>
            </Field>
          </FieldGrid>
        </Section>

        <Toolbar>
          {/* v1 這顆按鈕吃的是 editMutation.isPending,但這個專案的
              react-query 是 v4,沒有 isPending,永遠是 undefined,
              所以存檔中完全沒有提示也擋不住重複按。 */}
          <SolidButton type="submit" disabled={saveMutation.isLoading}>
            {saveMutation.isLoading
              ? t("mission.task_form_fork.saving")
              : t("mission.task_form_fork.deploy")}
          </SolidButton>
        </Toolbar>
      </Form>
    </FormShell>
  );
};

export default ForkTaskForm;
