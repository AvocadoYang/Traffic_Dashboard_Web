import client from "@/api/axiosClient";
import useAmrName from "@/api/useAmrName";
import useAllMissionTitles from "@/api/useMissionTitle";
import usePeripheralName from "@/api/usePeripheralName";
import {
  DISPATCH_PAGE_QUERY_KEY,
  DispatchButton,
} from "@/api/useMissionDispatchBoard";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ColorPicker,
  Form,
  Input,
  message,
  Modal,
  Radio,
  Select,
  Slider,
} from "antd";
import React, { FC, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

enum MissionPriority {
  TRIVIAL,
  NORMAL,
  PIVOTAL,
  CRITICAL,
}

const AUTO_ASSIGN = "__auto__";

interface FormValues {
  label: string;
  color: string;
  fontColor: string;
  fontSize: number;
  fontWeight: number;
  dispatch_type: "NORMAL" | "DYNAMIC";
  amrId: string;
  missionTitleId?: string;
  ept_s?: string;
  ept_d?: string;
  priority: number;
}

const MissionTitleField: FC<{
  value?: string;
  onChange?: (id: string) => void;
}> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const { data } = useAllMissionTitles();

  return (
    <Select
      showSearch
      value={value}
      placeholder={t("mission_dispatch_board.select_mission_title")}
      optionFilterProp="label"
      options={data?.map((m) => ({ value: m.id, label: m.name }))}
      onChange={(id) => onChange?.(id)}
    />
  );
};

const DispatchButtonFormModal: FC<{
  open: boolean;
  pageId: string;
  initialValues?: DispatchButton | null;
  onClose: () => void;
}> = ({ open, pageId, initialValues, onClose }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const dispatchType = Form.useWatch("dispatch_type", form);
  const { data: amrData } = useAmrName();
  const { data: peripheralData } = usePeripheralName();

  const isEdit = Boolean(initialValues);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      label: initialValues?.label ?? "",
      color: initialValues?.color ?? "#1890ff",
      fontColor: initialValues?.fontColor ?? "#ffffff",
      fontSize: initialValues?.fontSize ?? 16,
      fontWeight: initialValues?.fontWeight ?? 600,
      dispatch_type: initialValues?.dispatch_type ?? "NORMAL",
      amrId: initialValues?.amrId ?? AUTO_ASSIGN,
      missionTitleId: initialValues?.missionTitleId ?? undefined,
      ept_s: initialValues?.ept_s ?? undefined,
      ept_d: initialValues?.ept_d ?? undefined,
      priority: initialValues?.priority ?? MissionPriority.NORMAL,
    });
  }, [open, initialValues, form]);

  const amrOptions = useMemo(() => {
    if (!amrData) return [{ value: AUTO_ASSIGN, label: t("utils.random") }];
    const filtered = amrData.isSim
      ? amrData.amrs.filter((a) => a.isReal === false)
      : amrData.amrs.filter((a) => a.isReal === true);
    return [
      { value: AUTO_ASSIGN, label: t("utils.random") },
      ...filtered.map((a) => ({ value: a.amrId, label: a.amrId })),
    ];
  }, [amrData, t]);

  const peripheralOptions = useMemo(() => {
    const names = new Set<string>();
    peripheralData?.forEach((p) => {
      if (p.name) names.add(p.name);
    });
    return [...names].map((name) => ({ value: name, label: name }));
  }, [peripheralData]);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isEdit
        ? client.patch("api/setting/dispatch-button", {
            id: initialValues?.id,
            ...payload,
          })
        : client.post("api/setting/dispatch-button", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void queryClient.invalidateQueries({ queryKey: DISPATCH_PAGE_QUERY_KEY });
      onClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleOk = async () => {
    const values = await form.validateFields();

    if (
      values.dispatch_type === "DYNAMIC" &&
      !values.ept_s &&
      !values.ept_d
    ) {
      void messageApi.error(t("mission_dispatch_board.dynamic_hint"));
      return;
    }

    mutation.mutate({
      page_id: pageId,
      label: values.label,
      color: values.color,
      fontColor: values.fontColor,
      fontSize: values.fontSize,
      fontWeight: values.fontWeight,
      width: initialValues?.width ?? 128,
      height: initialValues?.height ?? 128,
      dispatch_type: values.dispatch_type,
      amrId: values.amrId === AUTO_ASSIGN ? null : values.amrId,
      missionTitleId:
        values.dispatch_type === "NORMAL" ? values.missionTitleId : null,
      ept_s: values.dispatch_type === "DYNAMIC" ? values.ept_s ?? null : null,
      ept_d: values.dispatch_type === "DYNAMIC" ? values.ept_d ?? null : null,
      priority: values.priority,
    });
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={
          isEdit
            ? t("mission_dispatch_board.edit_button_title")
            : t("mission_dispatch_board.create_button_title")
        }
        open={open}
        onCancel={onClose}
        onOk={handleOk}
        confirmLoading={mutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label={t("mission_dispatch_board.label")}
            name="label"
            rules={[{ required: true }]}
          >
            <Input maxLength={20} />
          </Form.Item>

          <Form.Item
            label={t("mission_dispatch_board.color")}
            name="color"
            getValueFromEvent={(color) =>
              typeof color === "string" ? color : color.toHexString()
            }
          >
            <ColorPicker format="hex" showText />
          </Form.Item>

          <Form.Item
            label={t("mission_dispatch_board.font_color")}
            name="fontColor"
            getValueFromEvent={(color) =>
              typeof color === "string" ? color : color.toHexString()
            }
          >
            <ColorPicker format="hex" showText />
          </Form.Item>

          <Form.Item
            label={t("mission_dispatch_board.font_size")}
            name="fontSize"
          >
            <Slider min={10} max={48} step={1} />
          </Form.Item>

          <Form.Item
            label={t("mission_dispatch_board.font_weight")}
            name="fontWeight"
          >
            <Slider min={100} max={900} step={100} />
          </Form.Item>

          <Form.Item
            label={t("mission_dispatch_board.dispatch_type")}
            name="dispatch_type"
          >
            <Radio.Group
              options={[
                {
                  value: "NORMAL",
                  label: t("mission_dispatch_board.type_normal"),
                },
                {
                  value: "DYNAMIC",
                  label: t("mission_dispatch_board.type_dynamic"),
                },
              ]}
              optionType="button"
            />
          </Form.Item>

          <Form.Item label={t("mission_dispatch_board.amr")} name="amrId">
            <Select options={amrOptions} />
          </Form.Item>

          {dispatchType === "DYNAMIC" ? (
            <>
              <Form.Item
                label={t("mission_dispatch_board.pickup_point")}
                name="ept_s"
              >
                <Select
                  allowClear
                  showSearch
                  options={peripheralOptions}
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item
                label={t("mission_dispatch_board.dropoff_point")}
                name="ept_d"
              >
                <Select
                  allowClear
                  showSearch
                  options={peripheralOptions}
                  optionFilterProp="label"
                />
              </Form.Item>
            </>
          ) : (
            <Form.Item
              label={t("mission_dispatch_board.mission_title")}
              name="missionTitleId"
              rules={[{ required: true }]}
            >
              <MissionTitleField />
            </Form.Item>
          )}

          <Form.Item
            label={t("mission_dispatch_board.priority")}
            name="priority"
          >
            <Select
              options={[
                {
                  value: MissionPriority.TRIVIAL,
                  label: t("main.mission_modal.dialog_mission.priority.TRIVIAL"),
                },
                {
                  value: MissionPriority.NORMAL,
                  label: t("main.mission_modal.dialog_mission.priority.NORMAL"),
                },
                {
                  value: MissionPriority.PIVOTAL,
                  label: t("main.mission_modal.dialog_mission.priority.PIVOTAL"),
                },
                {
                  value: MissionPriority.CRITICAL,
                  label: t("main.mission_modal.dialog_mission.priority.CRITICAL"),
                },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default DispatchButtonFormModal;
