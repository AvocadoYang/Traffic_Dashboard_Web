import { FC, useMemo, useRef } from "react";
import {
  AutoComplete,
  Form,
  FormInstance,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  message,
} from "antd";
import type { SelectProps } from "antd";
import type { Color } from "antd/es/color-picker";
import { useTranslation } from "react-i18next";
import useAmrName from "@/api/useAmrName";
import useLoc, { LocWithoutArr } from "@/api/useLoc";
import { Field, FieldLabel, FieldGrid, Hint, Section, SectionTitle } from "./primitives";
import {
  LINK_FIELD,
  LinkKind,
  LinkMap,
  usedLinkIds,
  zonesWithLinkId,
} from "./zoneLinks";
import { c } from "./tokens";

/** 區域分類:選了才會出現對應的設定欄位 */
export const ZONE_TAGS = {
  decel: "減速區",
  height: "限高區",
  forbid: "禁止區",
  limit: "限制區",
  view: "查看區",
  elevator: "電梯區",
  splice: "拼接區",
} as const;

/** 取消勾選某個分類時,要一併清掉的欄位(沿用 v1 的行為) */
export const ZONE_TAG_RESET: Record<string, Record<string, unknown>> = {
  減速區: { speed_limit: undefined },
  限高區: { hight_limit: undefined },
  限制區: { limitNum: undefined },
  查看區: { view_available: undefined },
  電梯區: { elevator_id: undefined },
  拼接區: { splice_id: undefined },
  禁止區: { forbidden: [], all_forbidden: false },
};

export const LAYER_VALUES = ["0", "1", "2", "3"] as const;

/**
 * 顏色欄位 (Form.Item getValueFromEvent) 一律存成區域的 backgroundColor 字串,
 * 自動帶入同組區域的顏色時才能直接放進去, 送出時也不用再轉
 */
export const zoneColorFromPicker = (color: Color | string | undefined) => {
  if (color && typeof color !== "string") {
    const { r, g, b } = color.toRgb();
    return `rgba(${r}, ${g}, ${b} , 0.05)`;
  }
  return color;
};

type LinkProps = {
  /** 區域所在地圖群組的所有地圖跟區域, 用來找同 id 的區域 */
  groupMaps?: LinkMap[];
  /** 區域所在 (或要新增到) 的地圖 */
  mapId?: string | null;
  /** 編輯時是自己的 id, 找同組區域時要排除 */
  zoneId?: string;
};

/**
 * 電梯 ID / 拼接 ID 輸入框: 下拉列出群組裡已經用過的 id,
 * 填到已經有區域在用的 id 時自動帶入那個區域的顏色, 同一組的區域顏色才會一致。
 * 拼接區只能在同一張地圖, 填到別張地圖在用的 id 會跳警告, 欄位驗證也會擋下存檔
 */
const LinkIdField: FC<
  LinkProps & { form: FormInstance<unknown>; kind: LinkKind }
> = ({ form, kind, groupMaps = [], mapId, zoneId }) => {
  const { t } = useTranslation();
  const [modal, modalHolder] = Modal.useModal();
  const [messageApi, messageHolder] = message.useMessage();
  // 同一個 id 只提示一次, 不然每打一個字都跳
  const notified = useRef<string | null>(null);

  const name = LINK_FIELD[kind];
  const sameMap = groupMaps.filter((m) => m.mapId === mapId);
  const otherMaps = groupMaps.filter((m) => m.mapId !== mapId);
  // 拼接區只會跟同一張地圖的區域綁在一起, 下拉也只列同一張地圖的
  const options = usedLinkIds(kind === "splice" ? sameMap : groupMaps, kind, zoneId)
    .map((value) => ({ value }));

  const crossMapConflict = (id: string) =>
    kind === "splice" ? zonesWithLinkId(otherMaps, kind, id, zoneId)[0] : undefined;
  const conflictMessage = (id: string) => {
    const conflict = crossMapConflict(id);
    return conflict
      ? t("edit_zone_panel.waring.splice_cross_map", {
          id,
          map: conflict.map.fileName,
          zone: conflict.zone.name,
        })
      : null;
  };

  const current = (Form.useWatch(name, form) as string | undefined)?.trim();
  const conflictText = current ? conflictMessage(current) : null;

  const onChange = (value: string) => {
    const id = value?.trim();
    if (!id || notified.current === id) return;

    const conflict = conflictMessage(id);
    if (conflict) {
      notified.current = id;
      void modal.warning({
        title: t("edit_zone_panel.waring.splice_cross_map_title"),
        content: conflict,
      });
      return;
    }

    const first = zonesWithLinkId(kind === "splice" ? sameMap : groupMaps, kind, id, zoneId)[0];
    if (!first) return;
    notified.current = id;
    form.setFieldsValue({ color: first.zone.backgroundColor });
    void messageApi.info(
      t("edit_zone_panel.linked_color_applied", { zone: first.zone.name }),
    );
  };

  return (
    <Field>
      {modalHolder}
      {messageHolder}
      <FieldLabel>
        {t(`edit_zone_panel.${name}`)} ({t("edit_zone_panel.necessary")})
      </FieldLabel>
      <Form.Item
        name={name}
        noStyle
        rules={[
          {
            required: true,
            whitespace: true,
            message: t(`edit_zone_panel.placeholder.${name}`),
          },
          {
            validator: (_, value?: string) => {
              const conflict = value?.trim() ? conflictMessage(value.trim()) : null;
              return conflict ? Promise.reject(new Error(conflict)) : Promise.resolve();
            },
          },
        ]}
      >
        <AutoComplete
          allowClear
          options={options}
          onChange={onChange}
          placeholder={t(`edit_zone_panel.placeholder.${name}`)}
          filterOption={(input, option) =>
            String(option?.value ?? "").toLowerCase().includes(input.toLowerCase())
          }
        />
      </Form.Item>
      {/* noStyle 的 Form.Item 不會顯示錯誤, 衝突要讓人看得到 */}
      {conflictText && <Hint style={{ color: c.danger }}>{conflictText}</Hint>}
    </Field>
  );
};

/**
 * 「編輯區域」與「區域清單的編輯」共用的欄位。
 * 區域的設定欄位是跟著分類跑的(選了減速區才要填速限…),
 * 這段邏輯兩邊一模一樣,所以抽出來共用。
 */
const ZoneFields: FC<LinkProps & { form: FormInstance<unknown> }> = ({
  form,
  ...linkProps
}) => {
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
    // 電梯區 (跨樓層) 跟拼接區 (同地圖) 是兩種不同的關聯, 一個區域只能選一種
    {
      label: t("edit_zone_panel.elevator_zone"),
      value: ZONE_TAGS.elevator,
      disabled: category.includes(ZONE_TAGS.splice),
    },
    {
      label: t("edit_zone_panel.splice_zone"),
      value: ZONE_TAGS.splice,
      disabled: category.includes(ZONE_TAGS.elevator),
    },
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

          {/* 不同樓層的同一台電梯填一樣的 id,後端靠這個歸成同一組 */}
          {has(ZONE_TAGS.elevator) && (
            <LinkIdField form={form} kind="elevator" {...linkProps} />
          )}

          {/* 同一張地圖上要拼成一個區域的幾塊填一樣的 id */}
          {has(ZONE_TAGS.splice) && (
            <LinkIdField form={form} kind="splice" {...linkProps} />
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
