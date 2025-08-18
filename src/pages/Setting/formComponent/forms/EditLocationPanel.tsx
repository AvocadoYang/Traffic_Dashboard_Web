import React, { memo, useEffect } from "react";
import { LocationType } from "@/utils/jotai";
import "./form.css";
import { openNotificationWithIcon } from "../../utils/notification";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Form,
  Input,
  Radio,
  Button,
  FormInstance,
  Checkbox,
  message,
  Space,
  Tooltip,
} from "antd";
import { initialLocationFormValue } from "./formInitValue";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import FormHr from "../../utils/FormHr";
import { MinusOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import useAllAreaTypes from "@/api/useAllAreaTypes";
import { locationOption } from "../../utils/func";

const EditLocationPanel: React.FC<{
  locationPanelForm: FormInstance<unknown>;
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ locationPanelForm, attributes, listeners }) => {
  const queryClient = useQueryClient();
  const [messageApi, contextHolders] = message.useMessage();
  const { data: locGenre } = useAllAreaTypes();
  const { t } = useTranslation();

  const saveLocationMutation = useMutation({
    mutationFn: (payload: LocationType) => {
      return client.post("api/setting/save-edit-loc", payload);
    },
    onSuccess: () => {
      void messageApi.success("success");
      queryClient.refetchQueries({ queryKey: ["map"] });
      queryClient.refetchQueries({
        queryKey: ["loc-only"],
      });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });
  const savePose = () => {
    const payload = locationPanelForm.getFieldsValue() as LocationType;
    const isNegative = Number(payload.locationId) <= 0;

    if (payload.x === undefined || payload.y === undefined) {
      openNotificationWithIcon(
        "warning",
        t("edit_location_panel.save_pose_notify.empty_value"),
        t("edit_location_panel.save_pose_notify.fill_in_value"),
        "bottomLeft",
      );
      return;
    }

    if (isNegative) {
      openNotificationWithIcon(
        "warning",
        t("edit_location_panel.save_pose_notify.format_warn"),
        t("edit_location_panel.save_pose_notify.is_a_navigate"),
        "bottomLeft",
      );
      return;
    }

    const sanitizedPayload = {
      ...payload,
      locationId: payload.locationId,
      rotation: Number(payload.rotation),
      x: Number(payload.x),
      y: Number(payload.y),
    };

    saveLocationMutation.mutate(sanitizedPayload);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentId = locationPanelForm.getFieldValue("locationId") || 0;
      if (document.activeElement?.tagName === "INPUT") return; // ignore if focused on input

      if (e.key === "q" || e.key === "Q") {
        locationPanelForm.setFieldsValue({ locationId: Number(currentId) + 1 });
      } else if (e.key === "w" || e.key === "W") {
        locationPanelForm.setFieldsValue({
          locationId: Math.max(1, Number(currentId) - 1),
        });
      } else if (e.key === "e" || e.key === "E") {
        savePose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [locationPanelForm, savePose]);

  return (
    <>
      {contextHolders}
      <div style={{ width: "23em" }}>
        <h3 className="drop_button_style" {...listeners} {...attributes}>
          {t("sider_output_form_name.locationPanel")}
        </h3>
        <FormHr></FormHr>
        <Space style={{ marginBottom: 12 }}>
          <Tooltip title="Q: Increase ID">
            <PlusOutlined />
          </Tooltip>
          <Tooltip title="W: Decrease ID">
            <MinusOutlined />
          </Tooltip>
          <Tooltip title="E: Save Location">
            <SaveOutlined />
          </Tooltip>
        </Space>

        <Form
          layout="vertical"
          initialValues={initialLocationFormValue}
          form={locationPanelForm}
          style={{ fontWeight: "bold" }}
        >
          <Form.Item
            label="ID"
            name="locationId"
            style={{ marginBottom: 16 }}
            rules={[{ required: true, message: "必填" }]}
          >
            <Input type="number" />
          </Form.Item>
          <Space
            size={"large"}
            style={{
              borderBottom: "2px solid black",
              marginBottom: "15px",
              overflow: "hidden",
            }}
          >
            <Form.Item
              label="X :"
              name="x"
              style={{ marginBottom: 16 }}
              required
            >
              <Input type="number" />
            </Form.Item>

            <Form.Item
              label="Y:"
              name="y"
              style={{ marginBottom: 16 }}
              required
            >
              <Input type="number" />
            </Form.Item>
          </Space>

          <Space
            size={"large"}
            style={{
              borderBottom: "2px solid black",
              overflow: "hidden",
              marginBottom: "15px",
            }}
          >
            <Form.Item
              label="θ"
              name="rotation"
              style={{ marginBottom: 16 }}
              rules={[
                { required: true, message: t("utils.required") },
                {
                  max: 360,
                  message: t(
                    "edit_location_panel.save_pose_notify.no_more_than_360",
                  ),
                },
                {
                  min: -360,
                  message: t(
                    "edit_location_panel.save_pose_notify.cannot_be_less_than_-360",
                  ),
                },
              ]}
            >
              <Input type="number" />
            </Form.Item>
            <Form.Item
              label={t("edit_location_panel.can_rotate")}
              name="canRotate"
              valuePropName="checked"
              shouldUpdate
              style={{ marginBottom: 16 }}
            >
              <Checkbox />
            </Form.Item>
          </Space>
          <Form.Item
            label={t("edit_location_panel.areaType")}
            name="areaType"
            style={{ marginBottom: 16 }}
          >
            <Radio.Group>
              {locGenre?.map(({ value }) => (
                <Radio value={value}>{locationOption(value)}</Radio>
              ))}
            </Radio.Group>
          </Form.Item>
          <Form.Item style={{ textAlign: "center" }}>
            <Button
              icon={<SaveOutlined />}
              onClick={savePose}
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

export default memo(EditLocationPanel);
