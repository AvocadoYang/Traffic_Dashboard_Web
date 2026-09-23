import { FC } from "react";
import { Checkbox, Form, Radio, Switch, Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import { Field, FieldLabel, FieldGrid } from "./primitives";

export const YAW_OPTIONS = ["*", "0", "90", "180", "270"] as const;

/**
 * 「編輯路徑」與「快速拉路徑」兩個面板的共用欄位:
 * 單/雙向、可走角度、禁用、限制、優先度。
 * 兩邊唯一的差別是端點怎麼來(手動輸入 vs 在地圖上依序點選),
 * 所以只把這段抽出來共用,避免兩個面板各維護一份。
 */
const RoadCommonFields: FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <Field>
        <FieldLabel>{t("edit_road_panel.road")}</FieldLabel>
        <Form.Item name="roadType" noStyle>
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            options={[
              {
                label: t("edit_road_panel.single_road"),
                value: "oneWayRoad",
              },
              {
                label: t("edit_road_panel.two_way_road"),
                value: "twoWayRoad",
              },
            ]}
          />
        </Form.Item>
      </Field>

      <Field>
        <FieldLabel>{t("edit_road_panel.yaw")}</FieldLabel>
        <Form.Item name="validYawList" noStyle>
          <Checkbox.Group
            options={YAW_OPTIONS.map((v) => ({
              label: v === "*" ? "ALL" : `${v}°`,
              value: v,
            }))}
          />
        </Form.Item>
      </Field>

      <Field>
        <FieldLabel>{t("edit_road_panel.priority")}</FieldLabel>
        <Form.Item name="priority" noStyle>
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            options={[
              { label: t("edit_road_panel.high"), value: 1 },
              { label: t("edit_road_panel.medium"), value: 3 },
              { label: t("edit_road_panel.low"), value: 5 },
            ]}
          />
        </Form.Item>
      </Field>

      <FieldGrid $cols={2}>
        <Field>
          <FieldLabel>
            <Tooltip title={t("quick_edit_road_panel.disabled_tooltip")}>
              {t("edit_road_panel.disabled")}
            </Tooltip>
          </FieldLabel>
          <Form.Item name="disabled" valuePropName="checked" noStyle>
            <Switch size="small" />
          </Form.Item>
        </Field>

        <Field>
          <FieldLabel>
            <Tooltip title={t("quick_edit_road_panel.limit_tooltip")}>
              {t("edit_road_panel.limit")}
            </Tooltip>
          </FieldLabel>
          <Form.Item name="limit" valuePropName="checked" noStyle>
            <Switch size="small" />
          </Form.Item>
        </Field>
      </FieldGrid>
    </>
  );
};

export default RoadCommonFields;
