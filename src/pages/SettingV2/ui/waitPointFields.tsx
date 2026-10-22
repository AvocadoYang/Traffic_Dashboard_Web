import { FC } from "react";
import { Form, InputNumber, Select } from "antd";
import { useTranslation } from "react-i18next";
import { WAIT_POINT_AREA_TYPES, useWorkAreaConfig } from "@/api/useWorkAreas";
import { Field, FieldLabel, Hint } from "./primitives";

/** 設備點 (儲位、輸送帶…) 不能當等待點 */
export const canBeWaitPoint = (areaType?: string) =>
  !!areaType && WAIT_POINT_AREA_TYPES.includes(areaType);

/**
 * 表單送出時要帶的等待點欄位。清掉下拉選單時 antd 給的是 undefined,
 * 送出去會整個欄位不見、後端當成「不動」, 所以取消等待點要明確送 null。
 */
export const waitPointPayload = (
  areaType: string | undefined,
  values: { wait_area_id?: string | null; wait_order?: number },
) => {
  const waitAreaId = canBeWaitPoint(areaType) ? values.wait_area_id ?? null : null;
  return {
    wait_area_id: waitAreaId,
    wait_order: waitAreaId ? Number(values.wait_order ?? 0) : 0,
  };
};

/**
 * 「編輯點位」與「點位列表」的共用欄位: 這個點是不是某個作業區的等待點、排第幾個。
 * 放在 Form 裡的 FieldGrid 用, 欄位名稱是 wait_area_id / wait_order。
 */
const WaitPointFields: FC<{ areaType?: string }> = ({ areaType }) => {
  const { t } = useTranslation();
  const form = Form.useFormInstance();
  const waitAreaId = Form.useWatch("wait_area_id", form) as string | undefined;
  const { data: config } = useWorkAreaConfig();
  const areas = config?.areas ?? [];
  const allowed = canBeWaitPoint(areaType);

  // 選了作業區還沒填順序時, 先幫忙排到隊尾
  const onPickArea = (id?: string) => {
    if (!id || form.getFieldValue("wait_order")) return;
    const points = areas.find((a) => a.id === id)?.waitPoints ?? [];
    form.setFieldValue("wait_order", (points[points.length - 1]?.order ?? 0) + 1);
  };

  return (
    <>
      <Field>
        <FieldLabel>{t("edit_location_panel.wait_area")}</FieldLabel>
        <Form.Item name="wait_area_id" noStyle>
          <Select
            allowClear
            disabled={!allowed || areas.length === 0}
            placeholder={t("edit_location_panel.wait_area_placeholder")}
            options={areas.map((a) => ({ value: a.id, label: a.name }))}
            onChange={onPickArea}
          />
        </Form.Item>
        {!allowed ? (
          <Hint>{t("edit_location_panel.wait_area_not_allowed")}</Hint>
        ) : areas.length === 0 ? (
          <Hint>{t("edit_location_panel.wait_area_none")}</Hint>
        ) : null}
      </Field>

      <Field>
        <FieldLabel>{t("edit_location_panel.wait_order")}</FieldLabel>
        <Form.Item name="wait_order" noStyle>
          <InputNumber
            min={0}
            precision={0}
            disabled={!allowed || !waitAreaId}
            style={{ width: "100%" }}
          />
        </Form.Item>
        <Hint>{t("edit_location_panel.wait_order_hint")}</Hint>
      </Field>
    </>
  );
};

export default WaitPointFields;
