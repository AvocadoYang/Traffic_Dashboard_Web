import client from "@/api/axiosClient";
import useAmrName from "@/api/useAmrName";
import {
  DISPATCH_PAGE_QUERY_KEY,
  DispatchWidget,
  DispatchWidgetType,
  STATS_METRIC_LABEL_KEY,
  STATS_METRICS,
  StatsMetric,
  StatsRangeMode,
} from "@/api/useMissionDispatchBoard";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Checkbox,
  ColorPicker,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Radio,
  Select,
  Slider,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import React, { FC, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  AMR_STATUS_FIELD_LABEL_KEY,
  AMR_STATUS_FIELDS,
} from "./AmrStatusWidgetCard";

const { RangePicker } = DatePicker;

interface FormValues {
  title: string;
  amrId?: string;
  fontColor?: string;
  fontSize?: number;
  fontWeight?: number;
  visibleFields?: string[];
  statsMetric?: StatsMetric;
  dateRangeDays?: number;
  statsRangeMode?: StatsRangeMode;
  statsDateRange?: [Dayjs, Dayjs] | null;
}

const DATE_FORMAT = "YYYY-MM-DD";

const DEFAULT_SIZE: Record<
  DispatchWidgetType,
  { width: number; height: number }
> = {
  MISSION_LIST: { width: 420, height: 320 },
  AMR_STATUS: { width: 220, height: 180 },
  MAP_VIEW: { width: 480, height: 360 },
  TEXT: { width: 200, height: 60 },
  QUICK_MISSION: { width: 240, height: 260 },
  STATS_CHART: { width: 420, height: 320 },
};

const DEFAULT_STATS_DATE_RANGE_DAYS = 30;

const DispatchWidgetFormModal: FC<{
  open: boolean;
  pageId: string;
  widgetType: DispatchWidgetType;
  initialValues?: DispatchWidget | null;
  onClose: () => void;
}> = ({ open, pageId, widgetType, initialValues, onClose }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { data: amrData } = useAmrName();

  const isEdit = Boolean(initialValues);
  const effectiveType = initialValues?.widget_type ?? widgetType;

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      title: initialValues?.title ?? "",
      amrId: initialValues?.amrId ?? undefined,
      fontColor: initialValues?.fontColor ?? "#262626",
      fontSize: initialValues?.fontSize ?? 24,
      fontWeight: initialValues?.fontWeight ?? 600,
      visibleFields: initialValues?.visibleFields ?? [...AMR_STATUS_FIELDS],
      statsMetric: initialValues?.chartConfig?.metric,
      dateRangeDays:
        initialValues?.chartConfig?.dateRangeDays ??
        DEFAULT_STATS_DATE_RANGE_DAYS,
      statsRangeMode: initialValues?.chartConfig?.rangeMode ?? "relative",
    });
    form.setFieldValue(
      "statsDateRange",
      initialValues?.chartConfig?.startDate &&
        initialValues?.chartConfig?.endDate
        ? [
            dayjs(initialValues.chartConfig.startDate),
            dayjs(initialValues.chartConfig.endDate),
          ]
        : null,
    );
  }, [open, initialValues, form]);

  const statsRangeMode = Form.useWatch("statsRangeMode", form);

  const amrOptions = useMemo(() => {
    if (!amrData) return [];
    const filtered = amrData.isSim
      ? amrData.amrs.filter((a) => a.isReal === false)
      : amrData.amrs.filter((a) => a.isReal === true);
    return filtered.map((a) => ({ value: a.amrId, label: a.amrId }));
  }, [amrData]);

  const visibleFieldOptions = useMemo(
    () =>
      AMR_STATUS_FIELDS.map((field) => ({
        value: field,
        label: t(AMR_STATUS_FIELD_LABEL_KEY[field]),
      })),
    [t],
  );

  const statsMetricOptions = useMemo(
    () =>
      STATS_METRICS.map((metric) => ({
        value: metric,
        label: t(STATS_METRIC_LABEL_KEY[metric]),
      })),
    [t],
  );

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isEdit
        ? client.patch("api/setting/dispatch-widget", {
            id: initialValues?.id,
            ...payload,
          })
        : client.post("api/setting/dispatch-widget", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void queryClient.invalidateQueries({ queryKey: DISPATCH_PAGE_QUERY_KEY });
      onClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleOk = async () => {
    const values = await form.validateFields();

    const fontFields =
      effectiveType === "TEXT"
        ? {
            fontColor: values.fontColor,
            fontSize: values.fontSize,
            fontWeight: values.fontWeight,
          }
        : {};

    const amrStatusFields =
      effectiveType === "AMR_STATUS"
        ? { visibleFields: values.visibleFields }
        : {};

    const isAbsoluteRange = values.statsRangeMode === "absolute";
    const statsChartFields =
      effectiveType === "STATS_CHART"
        ? {
            chartConfig: {
              metric: values.statsMetric,
              dateRangeDays:
                values.dateRangeDays ?? DEFAULT_STATS_DATE_RANGE_DAYS,
              rangeMode: values.statsRangeMode ?? "relative",
              startDate: isAbsoluteRange
                ? values.statsDateRange?.[0].format(DATE_FORMAT)
                : null,
              endDate: isAbsoluteRange
                ? values.statsDateRange?.[1].format(DATE_FORMAT)
                : null,
            },
          }
        : {};

    if (isEdit) {
      mutation.mutate({
        title: values.title || null,
        ...(effectiveType === "AMR_STATUS" ? { amrId: values.amrId } : {}),
        ...fontFields,
        ...amrStatusFields,
        ...statsChartFields,
      });
      return;
    }

    const defaultSize = DEFAULT_SIZE[effectiveType];
    mutation.mutate({
      page_id: pageId,
      widget_type: effectiveType,
      title: values.title || null,
      amrId: effectiveType === "AMR_STATUS" ? values.amrId : null,
      width: initialValues?.width ?? defaultSize.width,
      height: initialValues?.height ?? defaultSize.height,
      ...fontFields,
      ...amrStatusFields,
      ...statsChartFields,
    });
  };

  const titlePlaceholder =
    effectiveType === "AMR_STATUS"
      ? t("mission_dispatch_board.amr_status_widget")
      : effectiveType === "MAP_VIEW"
        ? t("mission_dispatch_board.map_view_widget")
        : effectiveType === "TEXT"
          ? t("mission_dispatch_board.text_widget_placeholder")
          : effectiveType === "QUICK_MISSION"
            ? t("mission_dispatch_board.quick_mission_widget")
            : effectiveType === "STATS_CHART"
              ? t("mission_dispatch_board.stats_chart_widget")
              : t("mission_dispatch_board.mission_list_widget");

  return (
    <>
      {contextHolder}
      <Modal
        title={
          isEdit
            ? t("mission_dispatch_board.edit_widget_title")
            : t("mission_dispatch_board.create_widget_title")
        }
        open={open}
        onCancel={onClose}
        onOk={handleOk}
        confirmLoading={mutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {effectiveType === "AMR_STATUS" && (
            <>
              <Form.Item
                label={t("mission_dispatch_board.amr")}
                name="amrId"
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  options={amrOptions}
                  optionFilterProp="label"
                />
              </Form.Item>

              <Form.Item
                label={t("mission_dispatch_board.visible_fields")}
                name="visibleFields"
              >
                <Checkbox.Group options={visibleFieldOptions} />
              </Form.Item>
            </>
          )}

          <Form.Item
            label={
              effectiveType === "TEXT"
                ? t("mission_dispatch_board.text_content")
                : t("mission_dispatch_board.widget_title")
            }
            name="title"
            rules={effectiveType === "TEXT" ? [{ required: true }] : undefined}
          >
            <Input maxLength={40} placeholder={titlePlaceholder} />
          </Form.Item>

          {effectiveType === "STATS_CHART" && (
            <>
              <Form.Item
                label={t("mission_dispatch_board.stats_metric")}
                name="statsMetric"
                rules={[{ required: true }]}
              >
                <Select options={statsMetricOptions} />
              </Form.Item>

              <Form.Item
                label={t("mission_dispatch_board.stats_range_mode")}
                name="statsRangeMode"
              >
                <Radio.Group
                  options={[
                    {
                      label: t("mission_dispatch_board.stats_range_relative"),
                      value: "relative",
                    },
                    {
                      label: t("mission_dispatch_board.stats_range_absolute"),
                      value: "absolute",
                    },
                  ]}
                  optionType="button"
                />
              </Form.Item>

              {statsRangeMode === "absolute" ? (
                <Form.Item
                  label={t("mission_dispatch_board.stats_date_range")}
                  name="statsDateRange"
                  rules={[{ required: true }]}
                >
                  <RangePicker style={{ width: "100%" }} format={DATE_FORMAT} />
                </Form.Item>
              ) : (
                <Form.Item
                  label={t("mission_dispatch_board.stats_date_range")}
                  name="dateRangeDays"
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} max={365} style={{ width: "100%" }} />
                </Form.Item>
              )}
            </>
          )}

          {effectiveType === "TEXT" && (
            <>
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
            </>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default DispatchWidgetFormModal;
