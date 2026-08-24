import {
  Badge,
  Button,
  Checkbox,
  ColorPicker,
  Flex,
  Form,
  Input,
  Select,
  SelectProps,
  Space,
  Tag,
  message,
  InputNumber,
  Switch,
} from "antd";
import "../../form.css";
import { FC, memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ZoneTableData } from "../../antd";
import useAmrName from "@/api/useAmrName";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useActiveGroupResources from "@/api/useActiveGroupResources";
import useLoc, { LocWithoutArr } from "@/api/useLoc";
import {
  isUnset,
  tagFieldStyle,
  transformToNumber,
  zoneTagResetFields,
} from "../../zoneTagSetting";

type FormType = {
  id?: string;
  name: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  layer: string;
  lidar_front: boolean;
  lidar_back: boolean;
  category: string[] | undefined;

  hight_limit: number | undefined;
  speed_limit: number | undefined;
  limitNum: number | undefined;
  all_forbidden: boolean | undefined;
  view_available: string | undefined;
  forbidden: string[] | undefined;
  color: string;
};

type TagRender = SelectProps["tagRender"];
const tagRender: TagRender = (props) => {
  const { label, closable, onClose } = props;
  const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  return (
    <Tag
      color={"cyan"}
      onMouseDown={onPreventMouseDown}
      closable={closable}
      onClose={onClose}
      style={{ marginInlineEnd: 4 }}
    >
      {label}
    </Tag>
  );
};

const EditZoneTable: FC<{
  setEditingKey: React.Dispatch<React.SetStateAction<string | null>>;
  editingKey: string;
  oldData: ZoneTableData | null;
  sortableId: string;
}> = ({ setEditingKey, editingKey, oldData }) => {
  const [editZoneForm] = Form.useForm();
  const [layerOpt, setLayerOpt] = useState<string | undefined>();
  const [messageApi, contextHolders] = message.useMessage();
  const { data: loc } = useLoc(undefined);
  const { data: allAmr } = useAmrName();
  const { data: resources } = useActiveGroupResources();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const viewAvailableOption = useMemo(() => {
    const info = loc as LocWithoutArr[];
    const mixData = info
      .filter((v) => v.areaType !== "STORAGE")
      .sort((a, b) => Number(a.locationId) - Number(b.locationId))
      .map((v) => ({
        label: v.locationId,
        value: v.locationId,
      }));
    return mixData;
  }, [loc, t]);

  const zoneType: SelectProps["options"] = [
    { label: `${t("edit_zone_panel.deceleration_zone")}`, value: "減速區" },
    { label: `${t("edit_zone_panel.height_limit_zone")}`, value: "限高區" },
    { label: `${t("edit_zone_panel.restricted_zone")}`, value: "禁止區" },
    { label: `${t("edit_zone_panel.controlled_zone")}`, value: "限制區" },
    { label: `${t("edit_zone_panel.view_available_zone")}`, value: "查看區" },
  ];

  const AmrsID: SelectProps["options"] = allAmr?.amrs.map((amr) => {
    return { value: amr.amrId };
  });

  const category = Form.useWatch("category", editZoneForm) as
    | string[]
    | undefined;
  const zoneTags = useMemo(() => category ?? [], [category]);
  const speedLimit = Form.useWatch("speed_limit", editZoneForm);
  const hightLimit = Form.useWatch("hight_limit", editZoneForm);
  const limitNum = Form.useWatch("limitNum", editZoneForm);
  const viewAvailable = Form.useWatch("view_available", editZoneForm);
  const allVehicleForbidden = Form.useWatch(
    "all_forbidden",
    editZoneForm,
  ) as boolean;
  const forbiddenVehicles = Form.useWatch("forbidden", editZoneForm) as
    | string[]
    | undefined;

  const isHint = useMemo(() => {
    if (!zoneTags.length) return false;
    if (
      zoneTags.includes("禁止區") &&
      !allVehicleForbidden &&
      !forbiddenVehicles?.length
    )
      return true;
    if (zoneTags.includes("減速區") && isUnset(speedLimit)) return true;
    if (zoneTags.includes("限高區") && isUnset(hightLimit)) return true;
    if (zoneTags.includes("限制區") && isUnset(limitNum)) return true;
    if (zoneTags.includes("查看區") && isUnset(viewAvailable)) return true;
    return false;
  }, [
    zoneTags,
    speedLimit,
    hightLimit,
    limitNum,
    viewAvailable,
    allVehicleForbidden,
    forbiddenVehicles,
  ]);

  const saveMutation = useMutation({
    mutationFn: (payload: FormType) => {
      return client.post("api/setting/edit-edit-zone", payload);
    },
    onSuccess: () => {
      void messageApi.success("success");
      queryClient.refetchQueries({ queryKey: ["map"] });
      queryClient.refetchQueries({ queryKey: ["active-group-resources"] });
      queryClient.refetchQueries({ queryKey: ["all-groups-resources"] });
      // setEditingKey(null);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const save = async () => {
    try {
      await editZoneForm.validateFields();
    } catch {
      return;
    }
    const data = editZoneForm.getFieldsValue() as FormType;
    const { name, startX, startY, endX, endY, color } = data;
    if (!name || name.trim() === "") {
      messageApi.warning(t("edit_zone_panel.waring.name_empty_error"));
      return;
    }
    if (!startX || !startY || !endX || !endY) {
      messageApi.warning(t("edit_zone_panel.waring.invalid_frame"));
      return;
    }
    if (!color) {
      messageApi.warning(t("edit_zone_panel.waring.color_error"));
      return;
    }
    const sameMapZones =
      resources?.maps.find((m) =>
        m.zones.some((zone) => zone.id === oldData?.id),
      )?.zones ?? [];
    const exists = sameMapZones.some((zone) => {
      return zone.name.trim() === name.trim() && oldData?.id !== zone.id;
    });
    if (exists) {
      messageApi.warning(t("edit_zone_panel.waring.name_duplicated_error"));
      return;
    }

    const forbiddenCars: string[] = data.all_forbidden
      ? ["*"]
      : (data.forbidden as string[]);

    const payload: FormType = {
      ...data,
      layer: data.layer ? data.layer : "none",
      lidar_back: data.layer ? data.lidar_back : false,
      lidar_front: data.layer ? data.lidar_front : false,
      speed_limit: data.speed_limit
        ? data.speed_limit
        : (oldData?.tagSetting.speed_limit as number),
      hight_limit: data.hight_limit
        ? data.hight_limit
        : (oldData?.tagSetting.hight_limit as number),
      limitNum: data.limitNum
        ? data.limitNum
        : (oldData?.tagSetting.limitNum as number),
      forbidden: forbiddenCars,
      view_available: data.view_available
        ? data.view_available
        : (oldData?.tagSetting.view_available as string),
      id: editingKey,
      color: data.color,
    };
    saveMutation.mutate(payload);
  };

  const updateLayer = (layer: string) => {
    setLayerOpt(layer);
  };

  const layer: SelectProps["options"] = [
    { label: `${t("edit_zone_panel.layer_dis_far")}`, value: "0" },
    { label: `${t("edit_zone_panel.layer_dis_near")}`, value: "1" },
    { label: `${t("edit_zone_panel.speical_layer_cargo")}`, value: "2" },
    { label: `${t("edit_zone_panel.special_layer_charge")}`, value: "3" },
  ];

  // 將資料庫資料寫入各個 input. 另外將資料複製一份到即將修改的表單中
  useEffect(() => {
    if (!oldData) return;
    const forbiddenCar = oldData.tagSetting.forbidden_car;
    // forbidden_car 存 ["*"] 代表存檔當下勾的是「禁止所有車輛通行」, 不是一台叫
    // "*" 的車, 要還原成 all_forbidden=true 而不是塞進 forbidden 車輛清單。
    const isAllForbidden = forbiddenCar.includes("*");

    editZoneForm.setFieldsValue({
      all_forbidden: isAllForbidden,
      forbidden: isAllForbidden ? [] : forbiddenCar,
      layer: oldData.layer == "none" ? undefined : oldData.layer,
      lidar_front: oldData.lidar.front,
      lidar_back: oldData.lidar.back,
      name: oldData.name,
      startX: oldData.startPoint.startX,
      startY: oldData.startPoint.startY,
      endX: oldData.endPoint.endX,
      endY: oldData.endPoint.endY,
      category: oldData.category,
      hight_limit: oldData.tagSetting.hight_limit,
      speed_limit: oldData.tagSetting.speed_limit,
      limitNum: oldData.tagSetting.limitNum,
      color: oldData.backgroundColor,
      view_available: oldData.tagSetting.view_available,
    });
    oldData.layer == "none"
      ? setLayerOpt(undefined)
      : setLayerOpt(oldData.layer);
  }, [oldData, editZoneForm]);

  const tagChangeFn = useCallback(
    (tags: string[]) => {
      const removed = zoneTags.filter((tag) => !tags.includes(tag));
      removed.forEach((tag) => {
        const fields = zoneTagResetFields[tag];
        if (fields) editZoneForm.setFieldsValue(fields);
      });
    },
    [zoneTags, editZoneForm],
  );

  if (!oldData) return;
  return (
    <>
      {contextHolders}
      <Flex gap="middle" justify="flex-start" align="start" vertical>
        <Space size={"middle"}>
          <Button
            color="danger"
            variant="filled"
            onClick={() => setEditingKey(null)}
          >
            {t("utils.cancel")}
          </Button>
          <Button color="primary" variant="filled" onClick={() => void save()}>
            {t("utils.save")}
          </Button>
        </Space>
        <Form
          layout="vertical"
          form={editZoneForm}
          style={{ fontWeight: "bold" }}
        >
          <Form.Item
            label={t("edit_zone_panel.name")}
            name="name"
            style={{ marginBottom: 16 }}
          >
            <Input
              // value={oldData.name}
              type="string"
              style={{ width: 150 }}
              placeholder="請輸入區域名稱"
            />
          </Form.Item>
          <Space
            size={"large"}
            style={{ marginBottom: "15px", overflow: "hidden" }}
          >
            <div>
              <Form.Item
                label={
                  <Badge
                    key={"geekblue1"}
                    color={"geekblue"}
                    text={t("edit_zone_panel.start_x")}
                  />
                }
                name="startX"
                style={{ marginBottom: 16 }}
              >
                <Input type="number" disabled />
              </Form.Item>
              <Form.Item
                label={
                  <Badge
                    key={"red1"}
                    color={"red"}
                    text={t("edit_zone_panel.end_x")}
                  />
                }
                name="endX"
                style={{ marginBottom: 16 }}
              >
                <Input type="number" disabled />
              </Form.Item>
            </div>
            <div>
              <Form.Item
                label={
                  <Badge
                    key={"geekblue2"}
                    color={"geekblue"}
                    text={t("edit_zone_panel.start_y")}
                  />
                }
                name="startY"
                style={{ marginBottom: 16 }}
              >
                <Input type="number" disabled />
              </Form.Item>

              <Form.Item
                label={
                  <Badge
                    key={"red2"}
                    color={"red"}
                    text={t("edit_zone_panel.end_y")}
                  />
                }
                name="endY"
                style={{ marginBottom: 16 }}
              >
                <Input type="number" disabled />
              </Form.Item>
            </div>
          </Space>

          <Form.Item label={t("edit_zone_panel.layer_setting")} name="layer">
            <Select
              allowClear
              placeholder={t("edit_zone_panel.layer")}
              style={{ width: "100%" }}
              onChange={(v: string) => updateLayer(v)}
              options={layer}
            />
          </Form.Item>

          <div style={{ display: `${layerOpt ? "block" : "none"}` }}>
            <Flex gap="middle">
              <Form.Item
                label={t("edit_zone_panel.lidar_front")}
                name="lidar_front"
              >
                <Switch checkedChildren="On" unCheckedChildren="Off" />
              </Form.Item>
              <Form.Item
                label={t("edit_zone_panel.lidar_back")}
                name="lidar_back"
              >
                <Switch checkedChildren="On" unCheckedChildren="Off" />
              </Form.Item>
            </Flex>
          </div>
          <Form.Item
            label={t("edit_zone_panel.category")}
            name="category"
            style={{ marginBottom: `${zoneTags?.length ? "5px" : "20px"}` }}
          >
            <Select
              // value={oldData.category}
              placeholder={"請選擇區域屬性"}
              mode="multiple"
              tagRender={tagRender}
              style={{ width: "100%" }}
              options={zoneType}
              onChange={(tags: string[]) => {
                tagChangeFn(tags);
              }}
            />
          </Form.Item>

          {zoneTags.length ? (
            <>
              <Space style={{ marginBottom: "8px" }}>
                <h3 style={{ textAlign: "left" }}>
                  {t("edit_zone_panel.tag_setting")}
                </h3>
                {isHint ? (
                  <p style={{ color: "red" }}>{t("edit_zone_panel.hint")}</p>
                ) : (
                  <p>✅</p>
                )}
              </Space>

              {zoneTags.includes("減速區") ? (
                <Form.Item
                  name="speed_limit"
                  label={`${t("edit_zone_panel.highest_speed")}: (${t("edit_zone_panel.necessary")}) `}
                  style={tagFieldStyle}
                  rules={[
                    {
                      required: true,
                      message: t("edit_zone_panel.placeholder.speed_limit"),
                    },
                    {
                      type: "number",
                      min: 0.8,
                      max: 1.5,
                      transform: transformToNumber,
                      message: t(
                        "edit_zone_panel.waring.need_to_be_within_range",
                        { min: 0.8, max: 1.5 },
                      ),
                    },
                  ]}
                >
                  <InputNumber
                    addonAfter="m/s"
                    type="number"
                    step={0.1}
                    placeholder="0.8~1.5"
                    style={{ width: "50%" }}
                  />
                </Form.Item>
              ) : null}

              {zoneTags.includes("限高區") ? (
                <Form.Item
                  name="hight_limit"
                  label={`${t("edit_zone_panel.hight_limit")}: (${t("edit_zone_panel.necessary")})`}
                  style={tagFieldStyle}
                  rules={[
                    {
                      required: true,
                      message: t("edit_zone_panel.placeholder.hight_limit"),
                    },
                    {
                      type: "number",
                      min: 0,
                      transform: transformToNumber,
                      message: t("edit_zone_panel.waring.non_negative"),
                    },
                  ]}
                >
                  <InputNumber
                    addonAfter="m"
                    type="number"
                    placeholder="請輸入高度限制"
                    style={{ width: "50%" }}
                  />
                </Form.Item>
              ) : null}

              {zoneTags.includes("限制區") ? (
                <Form.Item
                  name="limitNum"
                  label={`${t("edit_zone_panel.limit_count")}: `}
                  style={tagFieldStyle}
                  rules={[
                    {
                      required: true,
                      message: t("edit_zone_panel.placeholder.limit"),
                    },
                    {
                      type: "number",
                      min: 0,
                      transform: transformToNumber,
                      message: t("edit_zone_panel.waring.non_negative"),
                    },
                  ]}
                >
                  <InputNumber
                    addonAfter="car (s)"
                    type="number"
                    step={1}
                    placeholder={t("edit_zone_panel.placeholder.limit")}
                    style={{ width: "50%" }}
                  />
                </Form.Item>
              ) : null}

              {zoneTags.includes("查看區") ? (
                <Form.Item
                  name="view_available"
                  label={`${t("edit_zone_panel.view_available")}: (${t("edit_zone_panel.necessary")})`}
                  style={tagFieldStyle}
                  rules={[
                    {
                      required: true,
                      message: t("edit_zone_panel.necessary"),
                    },
                  ]}
                >
                  <Select
                    placeholder={t(
                      "edit_zone_panel.placeholder.view_available",
                    )}
                    style={{ width: "50%" }}
                    options={viewAvailableOption}
                  />
                </Form.Item>
              ) : null}

              {zoneTags.includes("禁止區") ? (
                <div style={{ ...tagFieldStyle, margin: "10px 0 20px 0" }}>
                  <Form.Item
                    valuePropName="checked"
                    name="all_forbidden"
                    style={{ margin: "0" }}
                  >
                    <Checkbox
                      onChange={() => {
                        editZoneForm.setFieldValue("forbidden", []);
                      }}
                    >{`${t("edit_zone_panel.all_vehicle_forbidden")}`}</Checkbox>
                  </Form.Item>
                  <Form.Item
                    name="forbidden"
                    label={`${t("edit_zone_panel.forbidden_vehicle")}: `}
                    dependencies={["all_forbidden"]}
                    rules={[
                      ({ getFieldValue }) => ({
                        validator: (_, value: string[] | undefined) => {
                          if (getFieldValue("all_forbidden") || value?.length)
                            return Promise.resolve();
                          return Promise.reject(
                            new Error(
                              t("edit_zone_panel.waring.forbidden_empty"),
                            ),
                          );
                        },
                      }),
                    ]}
                  >
                    <Select
                      placeholder={"請選擇限制進入車輛"}
                      disabled={allVehicleForbidden}
                      mode={"multiple"}
                      tagRender={tagRender}
                      style={{ width: "100%" }}
                      options={AmrsID}
                    />
                  </Form.Item>
                </div>
              ) : null}
            </>
          ) : null}

          <Form.Item
            getValueFromEvent={(color) => {
              if (color && color.toRgb) {
                const { r, g, b } = color.toRgb();
                return `rgba(${r}, ${g}, ${b}, 0.05)`;
              }
              return color;
            }}
            label={t("edit_zone_panel.color")}
            name="color"
          >
            <ColorPicker
              showText
              // onChange={(e) => {
              //   const { r, g, b } = e.toRgb();
              // }}
            />
          </Form.Item>
        </Form>
      </Flex>
    </>
  );
};

export default memo(EditZoneTable);
