import { FC, useMemo } from "react";
import { Form, FormInstance, Input, InputNumber, Select, Switch } from "antd";
import type { SelectProps } from "antd";
import { useTranslation } from "react-i18next";
import useAmrName from "@/api/useAmrName";
import useLoc, { LocWithoutArr } from "@/api/useLoc";
import { Field, FieldLabel, FieldGrid, Section, SectionTitle } from "./primitives";

/** 區域分類:選了才會出現對應的設定欄位 */
export const ZONE_TAGS = {
  decel: "減速區",
  height: "限高區",
  forbid: "禁止區",
  limit: "限制區",
  view: "查看區",
} as const;

/** 取消勾選某個分類時,要一併清掉的欄位(沿用 v1 的行為) */
export const ZONE_TAG_RESET: Record<string, Record<string, unknown>> = {
  減速區: { speed_limit: undefined },
  限高區: { hight_limit: undefined },
  限制區: { limitNum: undefined },
  查看區: { view_available: undefined },
  禁止區: { forbidden: [], all_forbidden: false },
};

export const LAYER_VALUES = ["0", "1", "2", "3"] as const;

/**
 * 「編輯區域」與「區域清單的編輯」共用的欄位。
 * 區域的設定欄位是跟著分類跑的(選了減速區才要填速限…),
 * 這段邏輯兩邊一模一樣,所以抽出來共用。
 */
const ZoneFields: FC<{ form: FormInstance<unknown> }> = ({ form }) => {
  const { t } = useTranslation();
  const { data: allAmr } = useAmrName();
  const { data: loc } = useLoc(undefined);

  const category = (Form.useWatch("category", form) ?? []) as string[];
  const layer = Form.useWatch("layer", form) as string | undefined;
  const allForbidden = Form.useWatch("all_forbidden", form) as
    | boolean
    | undefined;

  const zoneTypeOptions: SelectProps["options"] = [
    { label: t("edit_zone_panel.deceleration_zone"), value: ZONE_TAGS.decel },
    { label: t("edit_zone_panel.height_limit_zone"), value: ZONE_TAGS.height },
    { label: t("edit_zone_panel.restricted_zone"), value: ZONE_TAGS.forbid },
    { label: t("edit_zone_panel.controlled_zone"), value: ZONE_TAGS.limit },
    { label: t("edit_zone_panel.view_available_zone"), value: ZONE_TAGS.view },
  ];

  const layerOptions: SelectProps["options"] = [
    { label: t("edit_zone_panel.layer_dis_far"), value: "0" },
    { label: t("edit_zone_panel.layer_dis_near"), value: "1" },
    { label: t("edit_zone_panel.speical_layer_cargo"), value: "2" },
    { label: t("edit_zone_panel.special_layer_charge"), value: "3" },
  ];

  const amrOptions: SelectProps["options"] = allAmr?.amrs.map((a) => ({
    value: a.amrId,
  }));

  const viewAvailableOptions = useMemo(() => {
    const info = (loc ?? []) as LocWithoutArr[];
    return info
      .filter((v) => v.areaType !== "STORAGE")
      .sort((a, b) => Number(a.locationId) - Number(b.locationId))
      .map((v) => ({ label: v.locationId, value: v.locationId }));
  }, [loc]);

  /** 取消某個分類時把它的設定欄位清掉,避免送出殘留的舊值 */
  const onCategoryChange = (tags: string[]) => {
    category
      .filter((tag) => !tags.includes(tag))
      .forEach((tag) => {
        const reset = ZONE_TAG_RESET[tag];
        if (reset) form.setFieldsValue(reset);
      });
  };

  const has = (tag: string) => category.includes(tag);

  return (
    <>
      <Field>
        <FieldLabel>{t("zone_table_form.zone_name")}</FieldLabel>
        <Form.Item
          name="name"
          noStyle
          rules={[{ required: true, message: t("edit_zone_panel.waring.name_empty_error") }]}
        >
          <Input />
        </Form.Item>
      </Field>

      <Field>
        <FieldLabel>{t("edit_zone_panel.layer_setting")}</FieldLabel>
        <Form.Item name="layer" noStyle>
          <Select
            allowClear
            placeholder={t("edit_zone_panel.layer")}
            options={layerOptions}
          />
        </Form.Item>
      </Field>

      {layer ? (
        <FieldGrid $cols={2}>
          <Field>
            <FieldLabel>{t("edit_zone_panel.lidar_front")}</FieldLabel>
            <Form.Item name="lidar_front" valuePropName="checked" noStyle>
              <Switch size="small" />
            </Form.Item>
          </Field>
          <Field>
            <FieldLabel>{t("edit_zone_panel.lidar_back")}</FieldLabel>
            <Form.Item name="lidar_back" valuePropName="checked" noStyle>
              <Switch size="small" />
            </Form.Item>
          </Field>
        </FieldGrid>
      ) : null}

      <Field>
        <FieldLabel>{t("edit_zone_panel.category")}</FieldLabel>
        <Form.Item name="category" noStyle>
          <Select
            mode="multiple"
            allowClear
            placeholder={t("edit_zone_panel.placeholder.zone_category")}
            options={zoneTypeOptions}
            onChange={onCategoryChange}
          />
        </Form.Item>
      </Field>

      {category.length > 0 && (
        <Section style={{ padding: 12 }}>
          <SectionTitle>{t("edit_zone_panel.tag_setting")}</SectionTitle>

          {has(ZONE_TAGS.decel) && (
            <Field>
              <FieldLabel>
                {t("edit_zone_panel.highest_speed")} ({t("edit_zone_panel.necessary")})
              </FieldLabel>
              <Form.Item
                name="speed_limit"
                noStyle
                rules={[
                  {
                    required: true,
                    message: t("edit_zone_panel.placeholder.speed_limit"),
                  },
                ]}
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder={t("edit_zone_panel.placeholder.speed_limit")}
                />
              </Form.Item>
            </Field>
          )}

          {has(ZONE_TAGS.height) && (
            <Field>
              <FieldLabel>
                {t("edit_zone_panel.hight_limit")} ({t("edit_zone_panel.necessary")})
              </FieldLabel>
              <Form.Item
                name="hight_limit"
                noStyle
                rules={[
                  {
                    required: true,
                    message: t("edit_zone_panel.placeholder.hight_limit"),
                  },
                ]}
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder={t("edit_zone_panel.placeholder.hight_limit")}
                />
              </Form.Item>
            </Field>
          )}

          {has(ZONE_TAGS.limit) && (
            <Field>
              <FieldLabel>{t("edit_zone_panel.controlled_zone")}</FieldLabel>
              <Form.Item name="limitNum" noStyle>
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Field>
          )}

          {has(ZONE_TAGS.view) && (
            <Field>
              <FieldLabel>{t("edit_zone_panel.view_available_zone")}</FieldLabel>
              <Form.Item name="view_available" noStyle>
                <Select allowClear options={viewAvailableOptions} />
              </Form.Item>
            </Field>
          )}

          {has(ZONE_TAGS.forbid) && (
            <>
              <Field>
                <FieldLabel>{t("edit_zone_panel.restricted_zone")} (ALL)</FieldLabel>
                <Form.Item name="all_forbidden" valuePropName="checked" noStyle>
                  <Switch size="small" />
                </Form.Item>
              </Field>
              {!allForbidden && (
                <Field>
                  <FieldLabel>AMR</FieldLabel>
                  <Form.Item name="forbidden" noStyle>
                    <Select mode="multiple" allowClear options={amrOptions} />
                  </Form.Item>
                </Field>
              )}
            </>
          )}
        </Section>
      )}
    </>
  );
};

export default ZoneFields;
