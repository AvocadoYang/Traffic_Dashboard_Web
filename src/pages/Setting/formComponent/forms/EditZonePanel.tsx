import { memo, useCallback, useEffect, useMemo, useState } from "react";
import "./form.css";
import { useTranslation } from "react-i18next";
import { CloseOutlined } from "@ant-design/icons";
import {
  Badge,
  Button,
  ColorPicker,
  ConfigProvider,
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
import { openNotificationWithIcon } from "../../utils/notification";
import { TagSettingType, ZoneType } from "@/utils/jotai";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useMap from "@/api/useMap";
import useAmrName from "@/api/useAmrName";
import useLoc, { LocWithoutArr } from "@/api/useLoc";
import { DefaultOptionType } from "antd/es/select";

type TagRender = SelectProps["tagRender"];

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
};

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
  const { data } = useMap();
  const [layerOpt, setLayerOpt] = useState<string | undefined>();
  const { data: allAmr } = useAmrName();
  const [showTagSetting, setShowTagSetting] = useState(false);
  const { data: loc } = useLoc(undefined);
  const [tagSettingForm] = Form.useForm();
  const [isHint, setIsHint] = useState(false);
  const queryClient = useQueryClient();
  const [zoneTags, setZoneTags] = useState<string[]>([]);

  const [allVehicleForbidden, setAllVehicleForbidden] = useState(false);
  const [notVehicleForbidden, setNotVehicleForbidden] = useState(false);
  const [, setForbiddenVehicles] = useState<string[]>([]);
  const [maxSpeed, setMaxSpeed] = useState<number | undefined>(undefined);
  const [maxHight, setMaxHight] = useState<number | undefined>(undefined);
  const [limitCount, setLimitCount] = useState<number | undefined>(undefined);
  const [viewAvailable, setViewAvailable] = useState<string | undefined>(
    undefined,
  );

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
  ]


  const updateLayer = (layer: string) => {
    setLayerOpt(layer)
  }

  const AmrsID: SelectProps["options"] = allAmr?.amrs.map((amr) => {
    return { value: amr.amrId };
  });

  const saveZoneMutation = useMutation({
    mutationFn: (payload: Save_Zone) => {
      return client.post("api/setting/save-new-zone", payload);
    },
    onSuccess: () => {
      void messageApi.success("success");
      setZoneTags([]);
      setForbiddenVehicles([]);
      setAllVehicleForbidden(false);
      setNotVehicleForbidden(false);
      setMaxHight(undefined);
      setMaxSpeed(undefined);
      setLimitCount(undefined);
      setViewAvailable(undefined);
      zonePanelForm.resetFields();
      tagSettingForm.resetFields();
      queryClient.refetchQueries({ queryKey: ["map"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const save = () => {
    if (
      !zonePanelForm.getFieldsValue() ||
      (!tagSettingForm.getFieldsValue() && !zoneTags?.length)
    )
      return;
    const { name, color, category, startX, startY, endX, endY, layer, lidar_back, lidar_front } =
      zonePanelForm.getFieldsValue() as ZoneType;
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
    const exists = data!.zones.some((zone) => {
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
    if (isHint) {
      openNotificationWithIcon(
        "warning",
        t("edit_zone_panel.waring.tag_not_yet_setting"),
        t("edit_zone_panel.waring.tag_not_yet_setting"),
        "bottomLeft",
      );
      return;
    }

    const {
      speed_limit,
      hight_limit,
      forbidden,
      limitNum,
      all_forbidden,
      not_forbidden,
      view_available,
    } = tagSettingForm.getFieldsValue() as TagSettingType;

    if (
      (zoneTags.includes("減速區") && speed_limit === undefined) ||
      (zoneTags.includes("限高區") && hight_limit === undefined) ||
      (zoneTags.includes("限制區") && limitNum === undefined) ||
      (zoneTags.includes("禁止區") &&
        !all_forbidden &&
        !not_forbidden &&
        !forbidden?.length) ||
      (zoneTags.includes("查看區") && view_available === undefined)
    ) {
      openNotificationWithIcon(
        "warning",
        t("edit_zone_panel.waring.tag_not_yet_setting"),
        t("edit_zone_panel.waring.tag_not_yet_setting"),
        "bottomLeft",
      );
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
      layer : layer ? layer: "none" ,
      lidar_back: layer ? lidar_back : false,
      lidar_front: layer ? lidar_front: false,
      endPoint: {
        endX,
        endY,
      },
    };

    saveZoneMutation.mutate(newZone);
  };

  useEffect(() => {
    if (zoneTags?.length) {
      if (
        zoneTags.includes("禁止區") &&
        !(
          tagSettingForm.getFieldValue("all_forbidden") ||
          tagSettingForm.getFieldValue("not_forbidden") ||
          (tagSettingForm.getFieldValue("forbidden") &&
            tagSettingForm.getFieldValue("forbidden").length)
        )
      ) {
        setIsHint(true);
        return;
      }
      if (zoneTags.includes("減速區") && maxSpeed == undefined) {
        setIsHint(true);
        return;
      }
      if (zoneTags.includes("限高區") && maxHight == undefined) {
        setIsHint(true);
        return;
      }
      if (zoneTags.includes("限制區") && limitCount == undefined) {
        setIsHint(true);
        return;
      }
      if (zoneTags.includes("查看區") && viewAvailable == undefined) {
        setIsHint(true);
        return;
      }
    }

    setIsHint(false);
  }, [
    zoneTags,
    maxSpeed,
    maxHight,
    limitCount,
    viewAvailable,
    tagSettingForm,
    t,
  ]);


  const tagChangeFn = useCallback(
    (tags) => {
      setZoneTags((pre) => {
        pre.forEach((tag) => {
          if (!tags.includes(tag)) {
            switch (tag) {
              case "減速區":
                setMaxSpeed(undefined);
                tagSettingForm.setFieldValue("speed_limit", undefined);
                break;
              case "限高區":
                setMaxHight(undefined);
                tagSettingForm.setFieldValue("hight_limit", undefined);
                break;
              case "禁止區":
                setAllVehicleForbidden(false);
                setNotVehicleForbidden(false);
                setForbiddenVehicles([]);
                tagSettingForm.setFieldValue("forbidden", []);
                tagSettingForm.setFieldValue("all_forbidden", false);
                tagSettingForm.setFieldValue("not_forbidden", false);
                break;
              case "限制區":
                setLimitCount(undefined);
                tagSettingForm.setFieldValue("limitNum", undefined);
                break;
              case "查看區":
                setViewAvailable(undefined);
                tagSettingForm.setFieldValue("view_available", undefined);
                break;
            }
          }
        });
        return tags;
      });
    },
    [zoneTags, tagSettingForm],
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
          initialValues={initialZoneValue}
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
          <Form.Item
            label={t("edit_zone_panel.layer_setting")}
            name="layer"  
          >
          <Select
            allowClear
            placeholder={t("edit_zone_panel.layer")}
            style={{ width: "100%" }}
            onChange={(v: string) => updateLayer(v)}
            options={layer}
          />
            </Form.Item>

      
            <div style={{ display: `${layerOpt ? "block":"none"}`}}>
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
              placeholder={t("edit_zone_panel.placeholder.zone_category")}
              mode="multiple"
              tagRender={tagRender}
              style={{ width: "100%" }}
              options={zoneType}
              onChange={(tags) => tagChangeFn(tags)}
            />
          </Form.Item>
          {zoneTags?.length ? (
            <Form.Item style={{ textAlign: "right", marginBottom: "8px" }}>
              <Space>
                {isHint ? (
                  <p style={{ color: "red" }}>{t("edit_zone_panel.hint")}</p>
                ) : (
                  <p>✅</p>
                )}
                <ConfigProvider
                  theme={{
                    components: {
                      Button: {
                        defaultBorderColor: "orange",
                      },
                    },
                  }}
                >
                  <Button
                    onClick={() => setShowTagSetting(!showTagSetting)}
                    size="small"
                  >
                    {t("edit_zone_panel.tag_setting")}
                  </Button>
                </ConfigProvider>
              </Space>
            </Form.Item>
          ) : (
            []
          )}
          <Form.Item label={t("edit_zone_panel.color")} name="color">
            <ColorPicker showText />
          </Form.Item>
          <Form.Item style={{ textAlign: "center" }}>
            <Button
              icon={<SaveOutlined />}
              onClick={save}
              color="primary"
              variant="filled"
            >
              {t("edit_location_panel.save")}
            </Button>
          </Form.Item>
        </Form>
      </div>

      <div
        className={`tag-setting-wrap ${showTagSetting && zoneTags.length ? "tag-setting-wrap-show" : ""}`}
        style={{ borderTop: `5px solid #315E7D` }}
      >
        <CloseOutlined
          onClick={() => setShowTagSetting(false)}
          className="form-close-btn"
          style={{ position: "absolute", right: "1em", top: "1em" }}
        />
        <Form
          layout="vertical"
          form={tagSettingForm}
          initialValues={initialTagFormValue}
          style={{ fontWeight: "bold" }}
        >
          <h3
            style={{ width: "100%", textAlign: "left", marginBottom: "12px" }}
          >
            {t("edit_zone_panel.tag_setting")}
          </h3>

          <Form.Item
            name="speed_limit"
            label={`${t("edit_zone_panel.highest_speed")}: (${t("edit_zone_panel.necessary")}) `}
            style={{
              display: `${zoneTags?.includes("減速區") ? "" : "none"}`,
              boxShadow: "3px 3px 15px rgba(0, 0, 0, 0.05)",
              borderLeft: "4px solid #8491ea",
              padding: "10px",
              borderRadius: "5px",
            }}
          >
            <Input
              type="number"
              placeholder={t("edit_zone_panel.placeholder.speed_limit")}
              style={{ width: "50%" }}
              onChange={(e) => {
                if (!e.currentTarget.value) {
                  setMaxSpeed(undefined);
                  return;
                }
                setMaxSpeed(Number(e.currentTarget.value));
              }}
            />
          </Form.Item>

          <Form.Item
            name="hight_limit"
            label={`${t("edit_zone_panel.hight_limit")}: (${t("edit_zone_panel.necessary")})`}
            style={{
              display: `${zoneTags?.includes("限高區") ? "" : "none"}`,
              boxShadow: "3px 3px 15px rgba(0, 0, 0, 0.05)",
              borderLeft: "4px solid #8491ea",
              padding: "10px",
              borderRadius: "5px",
            }}
          >
            <Input
              type="number"
              placeholder={t("edit_zone_panel.placeholder.hight_limit")}
              style={{ width: "50%" }}
              onChange={(e) => {
                if (!e.currentTarget.value) {
                  setMaxHight(undefined);
                  return;
                }
                setMaxHight(Number(e.currentTarget.value));
              }}
            />
          </Form.Item>

          <Form.Item
            name="limitNum"
            label={`${t("edit_zone_panel.limit_count")}: `}
            style={{
              display: `${zoneTags?.includes("限制區") ? "" : "none"}`,
              boxShadow: "3px 3px 15px rgba(0, 0, 0, 0.05)",
              borderLeft: "4px solid #8491ea",
              padding: "10px",
              borderRadius: "5px",
              marginBottom: "10px",
            }}
          >
            <Input
              type="number"
              placeholder={t("edit_zone_panel.placeholder.limit")}
              onChange={(e) => {
                if (!e.currentTarget.value) {
                  setLimitCount(undefined);
                  return;
                }
                setLimitCount(Number(e.currentTarget.value));
              }}
            />
          </Form.Item>

          <Form.Item
            name="view_available"
            label={`${t("edit_zone_panel.view_available")}: (${t("edit_zone_panel.necessary")})`}
            style={{
              display: `${zoneTags?.includes("查看區") ? "" : "none"}`,
              boxShadow: "3px 3px 15px rgba(0, 0, 0, 0.05)",
              borderLeft: "4px solid #8491ea",
              padding: "10px",
              borderRadius: "5px",
              marginBottom: "10px",
            }}
            rules={[
              {
                required: zoneTags?.includes("查看區"),
                message: t("edit_zone_panel.necessary"),
              },
            ]}
          >
            <Select
              placeholder={t("edit_zone_panel.placeholder.view_available")}
              style={{ width: "50%" }}
              options={viewAvailableOption}
              onChange={(value) => {
                setViewAvailable(value || undefined);
                tagSettingForm.setFieldValue(
                  "view_available",
                  value || undefined,
                );
              }}
              value={viewAvailable}
            />
          </Form.Item>

          <div
            style={{
              boxShadow: "3px 3px 15px rgba(0, 0, 0, 0.05)",
              borderLeft: "4px solid #8491ea",
              padding: "10px",
              borderRadius: "5px",
              marginBottom: "20px",
              display: `${zoneTags?.includes("禁止區") ? "" : "none"}`,
            }}
          >
            <Space>
              <Form.Item
                name="all_forbidden"
                valuePropName="checked"
                // label={`${t('edit_zone_panel.all_vehicle_forbidden')}: `}
                style={{ margin: "0" }}
              >
                <Checkbox
                  checked={notVehicleForbidden}
                  disabled={allVehicleForbidden}
                  onChange={(e) => setNotVehicleForbidden(e.target.checked)}
                >{`${t("edit_zone_panel.not_vehicle_forbidden")}`}</Checkbox>
              </Form.Item>
              <Form.Item
                name="not_forbidden"
                valuePropName="checked"
                // label={`${t('edit_zone_panel.all_vehicle_forbidden')}: `}
                style={{ margin: "0" }}
              >
                <Checkbox
                  checked={allVehicleForbidden}
                  disabled={notVehicleForbidden}
                  onChange={(e) => setAllVehicleForbidden(e.target.checked)}
                >{`${t("edit_zone_panel.all_vehicle_forbidden")}`}</Checkbox>
              </Form.Item>
            </Space>
            <Form.Item
              name="forbidden"
              label={`${t("edit_zone_panel.forbidden_vehicle")}: `}
              style={{
                display: `${zoneTags?.includes("禁止區") ? "" : "none"}`,
                marginBottom: "5px",
              }}
            >
              <Select
                placeholder={t("edit_zone_panel.placeholder.forbidden")}
                disabled={allVehicleForbidden || notVehicleForbidden}
                mode={"multiple"}
                tagRender={tagRender}
                style={{ width: "100%" }}
                options={AmrsID}
                onChange={(select) => {
                  setForbiddenVehicles(select);
                }}
              />
            </Form.Item>
          </div>
        </Form>
      </div>
    </>
  );
};

export default memo(EditZonePanel);
