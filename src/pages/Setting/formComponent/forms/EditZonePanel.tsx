import { memo, useCallback, useMemo, useState } from "react";
import "./form.css";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Button,
  ColorPicker,
  Form,
  FormInstance,
  Input,
  message,
  Select,
  SelectProps,
  Space,
  Tag,
  Checkbox,
  Switch,
  Flex,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import FormHr from "../../utils/FormHr";
import { initialTagFormValue, initialZoneValue } from "./formInitValue";
import {
  isUnset,
  tagFieldStyle,
  transformToNumber,
  zoneTagResetFields,
} from "./zoneTagSetting";
import { openNotificationWithIcon } from "../../utils/notification";
import { TagSettingType, ZoneType } from "@/utils/jotai";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useActiveGroupResources from "@/api/useActiveGroupResources";
import useAmrName from "@/api/useAmrName";
import useLoc, { LocWithoutArr } from "@/api/useLoc";
import { useAtomValue, useSetAtom } from "jotai";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { initialZoneRectInfo, zoneRectInfo } from "@/utils/gloable";

type TagRender = SelectProps["tagRender"];

type ZoneFormValue = ZoneType & Partial<TagSettingType>;

type Save_Zone = {
  name: string;
  backgroundColor: string;
  category: {
    tags: string[] | [];
    forbidden_car: string[] | undefined | string;
    speed_limit: number | undefined;
    hight_limit: number | undefined;
  };
  startPoint: {
    startX: number;
    startY: number;
  };
  endPoint: {
    endX: number;
    endY: number;
  };
  map_id?: string;
};

const initialZoneFormValue = { ...initialZoneValue, ...initialTagFormValue };

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

const EditZonePanel: React.FC<{
  zonePanelForm: FormInstance<unknown>;
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners, zonePanelForm }) => {
  const { t } = useTranslation();
  const { data: resources } = useActiveGroupResources();
  const [layerOpt, setLayerOpt] = useState<string | undefined>();
  const { data: allAmr } = useAmrName();
  const { data: loc } = useLoc(undefined);
  const queryClient = useQueryClient();
  const currentMapId = useAtomValue(currentMapIdAtom);
  const setZoneRectInfo = useSetAtom(zoneRectInfo);

  const [messageApi, contextHolders] = message.useMessage();

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

  const layer: SelectProps["options"] = [
    { label: `${t("edit_zone_panel.layer_dis_far")}`, value: "0" },
    { label: `${t("edit_zone_panel.layer_dis_near")}`, value: "1" },
    { label: `${t("edit_zone_panel.speical_layer_cargo")}`, value: "2" },
    { label: `${t("edit_zone_panel.special_layer_charge")}`, value: "3" },
  ];

  const updateLayer = (layer: string) => {
    setLayerOpt(layer);
  };

  const AmrsID: SelectProps["options"] = allAmr?.amrs.map((amr) => {
    return { value: amr.amrId };
  });

  const category = Form.useWatch("category", zonePanelForm) as
    | string[]
    | undefined;
  const zoneTags = useMemo(() => category ?? [], [category]);
  const speedLimit = Form.useWatch("speed_limit", zonePanelForm);
  const hightLimit = Form.useWatch("hight_limit", zonePanelForm);
  const limitNum = Form.useWatch("limitNum", zonePanelForm);
  const viewAvailable = Form.useWatch("view_available", zonePanelForm);
  const allVehicleForbidden = Form.useWatch(
    "all_forbidden",
    zonePanelForm,
  ) as boolean;
  const forbiddenVehicles = Form.useWatch("forbidden", zonePanelForm) as
    | string[]
    | undefined;
  const lidarFront = Form.useWatch("lidar_front", zonePanelForm);
  const lidarBack = Form.useWatch("lidar_back", zonePanelForm);
  const layerIsHint = Boolean(layerOpt) && !lidarFront && !lidarBack;

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

  const saveZoneMutation = useMutation({
    mutationFn: (payload: Save_Zone) => {
      return client.post("api/setting/save-new-zone", payload);
    },
    onSuccess: () => {
      void messageApi.success("success");
      zonePanelForm.resetFields();
      setZoneRectInfo(initialZoneRectInfo);
      queryClient.refetchQueries({ queryKey: ["map"] });
      queryClient.refetchQueries({ queryKey: ["active-group-resources"] });
      queryClient.refetchQueries({ queryKey: ["all-groups-resources"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const save = async () => {
    if (!zonePanelForm.getFieldsValue()) return;
    const {
      name,
      color,
      category,
      startX,
      startY,
      endX,
      endY,
      layer,
      lidar_back,
      lidar_front,
      speed_limit,
      hight_limit,
      forbidden,
      limitNum,
      all_forbidden,
      view_available,
    } = zonePanelForm.getFieldsValue() as ZoneFormValue;
    if ((startX === endX && startY === endY) || !startX || !startY) {
      openNotificationWithIcon(
        "warning",
        t("edit_zone_panel.waring.invalid_frame"),
        t("edit_zone_panel.waring.invalid_frame"),
        "bottomLeft",
      );
      return;
    }
    if (!name) {
      openNotificationWithIcon(
        "warning",
        t("edit_zone_panel.waring.name_empty_error"),
        t("edit_zone_panel.waring.name_empty_error"),
        "bottomLeft",
      );
      return;
    }
    const sameMapZones =
      resources?.maps.find((m) => m.mapId === currentMapId)?.zones ?? [];
    const exists = sameMapZones.some((zone) => {
      return zone.name.trim() === name.trim();
    });
    if (exists) {
      openNotificationWithIcon(
        "warning",
        t("edit_zone_panel.waring.name_duplicated_error"),
        t("edit_zone_panel.waring.name_duplicated_error"),
        "bottomLeft",
      );
      return;
    }
    if (!color) {
      openNotificationWithIcon(
        "warning",
        t("edit_zone_panel.waring.color_error"),
        t("edit_zone_panel.waring.color_error"),
        "bottomLeft",
      );
      return;
    }
    try {
      await zonePanelForm.validateFields();
    } catch {
      return;
    }
    if (layer && !lidar_front && !lidar_back) {
      openNotificationWithIcon(
        "warning",
        t("edit_zone_panel.waring.tag_not_yet_setting"),
        t("edit_zone_panel.waring.tag_not_yet_setting"),
        "bottomLeft",
      );
      return;
    }
    if (!currentMapId) {
      void messageApi.error(t("map_manager.no_map_selected"));
      return;
    }

    let rgba = `rgba(${color.metaColor.r}, ${color.metaColor.g}, ${color.metaColor.b} , 0.05)`;
    const newZone = {
      name,
      backgroundColor: rgba,
      category: {
        tags: category || [],
        forbidden_car:
          category?.includes("禁止區") && all_forbidden
            ? ["*"]
            : forbidden || [],
        speed_limit: category?.includes("減速區")
          ? Number(speed_limit)
          : undefined,
        hight_limit: category?.includes("限高區")
          ? Number(hight_limit)
          : undefined,
        limitNum: category?.includes("限制區") ? Number(limitNum) : undefined,
        view_available: category?.includes("查看區")
          ? view_available
          : undefined,
      },
      startPoint: {
        startX,
        startY,
      },
      layer: layer ? layer : "none",
      lidar_back: layer ? lidar_back : false,
      lidar_front: layer ? lidar_front : false,
      endPoint: {
        endX,
        endY,
      },
      map_id: currentMapId,
    };

    saveZoneMutation.mutate(newZone);
  };

  const tagChangeFn = useCallback(
    (tags: string[]) => {
      const removed = zoneTags.filter((tag) => !tags.includes(tag));
      removed.forEach((tag) => {
        const fields = zoneTagResetFields[tag];
        if (fields) zonePanelForm.setFieldsValue(fields);
      });
    },
    [zoneTags, zonePanelForm],
  );

  return (
    <>
      {contextHolders}
      <div style={{ width: "23em" }}>
        <h3 className="drop_button_style" {...listeners} {...attributes}>
          {t("sider_output_form_name.zonePanel")}
        </h3>
        <FormHr></FormHr>
        <Form
          layout="vertical"
          initialValues={initialZoneFormValue}
          form={zonePanelForm}
          style={{ fontWeight: "bold" }}
        >
          <Form.Item
            label={t("edit_zone_panel.name")}
            name="name"
            style={{ marginBottom: 16 }}
          >
            <Input
              type="string"
              style={{ width: 150 }}
              placeholder={t("edit_zone_panel.placeholder.zone_name")}
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
                <Input type="number" />
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
                <Input type="number" />
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
                <Input type="number" />
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
                <Input type="number" />
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
            {layerIsHint ? (
              <p style={{ color: "red", marginTop: "-8px" }}>
                {t("edit_zone_panel.hint")}
              </p>
            ) : null}
          </div>

          <Form.Item
            label={t("edit_zone_panel.category")}
            name="category"
            style={{ marginBottom: `${zoneTags?.length ? "5px" : "20px"}` }}
          >
            <Select
              placeholder={t("edit_zone_panel.placeholder.zone_category")}
              mode="multiple"
              tagRender={tagRender}
              style={{ width: "100%" }}
              options={zoneType}
              onChange={(tags: string[]) => tagChangeFn(tags)}
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
                  <Input
                    addonAfter="m/s"
                    type="number"
                    min={0.8}
                    max={1.5}
                    step={0.1}
                    placeholder={t("edit_zone_panel.placeholder.speed_limit")}
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
                  <Input
                    addonAfter="m"
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder={t("edit_zone_panel.placeholder.hight_limit")}
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
                  <Input
                    addonAfter="car (s)"
                    type="number"
                    min={0}
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
                <div style={{ ...tagFieldStyle, marginBottom: "20px" }}>
                  <Form.Item
                    name="all_forbidden"
                    valuePropName="checked"
                    style={{ margin: "0" }}
                  >
                    <Checkbox>{`${t("edit_zone_panel.all_vehicle_forbidden")}`}</Checkbox>
                  </Form.Item>
                  <Form.Item
                    name="forbidden"
                    label={`${t("edit_zone_panel.forbidden_vehicle")}: `}
                    style={{ marginBottom: "5px" }}
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
                      placeholder={t("edit_zone_panel.placeholder.forbidden")}
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

          <Form.Item label={t("edit_zone_panel.color")} name="color">
            <ColorPicker showText />
          </Form.Item>
          <Form.Item style={{ textAlign: "center" }}>
            <Button
              icon={<SaveOutlined />}
              onClick={() => void save()}
              color="primary"
              variant="filled"
            >
              {t("edit_location_panel.save")}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </>
  );
};

export default memo(EditZonePanel);
