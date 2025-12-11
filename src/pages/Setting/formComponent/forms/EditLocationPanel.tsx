import React, { memo, useEffect } from "react";
import { LocationType } from "@/utils/jotai";
import "./form.css"; // Ensure this file is updated (see CSS below)
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

// Adjusted props to be cleaner
const EditLocationPanel: React.FC<{
  locationPanelForm: FormInstance<unknown>;
  // For Dnd-kit, keep these imports correct
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
      // Assuming 'api/setting/save-edit-loc' is the correct endpoint for PUT/POST
      return client.post("api/setting/save-edit-loc", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      // Refetch relevant queries
      queryClient.refetchQueries({ queryKey: ["map"] });
      queryClient.refetchQueries({
        queryKey: ["loc-only"],
      });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const savePose = () => {
    // ... (Your existing savePose logic remains the same for functionality)
    const payload = locationPanelForm.getFieldsValue() as LocationType;
    const isNegative = Number(payload.locationId) <= 0;

    if (payload.x === undefined || payload.y === undefined) {
      openNotificationWithIcon(
        "warning",
        t("edit_location_panel.save_pose_notify.empty_value"),
        t("edit_location_panel.save_pose_notify.fill_in_value"),
        "bottomLeft"
      );
      return;
    }

    if (isNegative) {
      openNotificationWithIcon(
        "warning",
        t("edit_location_panel.save_pose_notify.format_warn"),
        t("edit_location_panel.save_pose_notify.is_a_navigate"),
        "bottomLeft"
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
    // ... (Your existing useEffect for keyboard shortcuts remains the same)
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
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [locationPanelForm, savePose]); // Dependencies array corrected to include savePose

  return (
    <>
      {contextHolders}
      {/* Industrial style width and container */}
      <div className="industrial-panel">
        {/* Header with drag handle styles */}
        <h3 className="drop_button_style" {...listeners} {...attributes}>
          {t("sider_output_form_name.locationPanel")}
        </h3>
        <FormHr /> {/* Visually strong separator */}
        {/* Keyboard shortcut section */}
        <Space className="keyboard-shortcuts-info" size="middle">
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
          className="industrial-form"
        >
          {/* Location ID */}
          <Form.Item
            label="ID"
            name="locationId"
            className="industrial-item"
            rules={[{ required: true, message: "必填" }]}
          >
            <Input type="number" />
          </Form.Item>

          {/* Coordinate Section (X, Y) - Bolder separation */}
          <div className="industrial-section coordinate-space">
            <Space size="large">
              <Form.Item
                label="X :"
                name="x"
                className="industrial-item"
                required
              >
                <Input type="number" />
              </Form.Item>

              <Form.Item
                label="Y:"
                name="y"
                className="industrial-item"
                required
              >
                <Input type="number" />
              </Form.Item>
            </Space>
          </div>

          {/* Rotation Section (Rotation, Can Rotate) - Bolder separation */}
          <div className="industrial-section rotation-space">
            <Space size="large">
              <Form.Item
                label="θ"
                name="rotation"
                className="industrial-item"
                rules={[
                  { required: true, message: t("utils.required") },
                  {
                    max: 360,
                    message: t(
                      "edit_location_panel.save_pose_notify.no_more_than_360"
                    ),
                  },
                  {
                    min: -360,
                    message: t(
                      "edit_location_panel.save_pose_notify.cannot_be_less_than_-360"
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
                className="industrial-item-checkbox"
              >
                <Checkbox />
              </Form.Item>
            </Space>
          </div>

          {/* Area Type Radio Group */}
          <Form.Item
            label={t("edit_location_panel.areaType")}
            name="areaType"
            className="industrial-item"
          >
            <Radio.Group>
              {locGenre?.map(({ value }) => (
                // Added a key for mapping performance
                <Radio key={value} value={value}>
                  {locationOption(value)}
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>

          {/* Save Button */}
          <Form.Item className="industrial-item form-submit-center">
            <Button
              icon={<SaveOutlined />}
              onClick={savePose}
              type="primary" // Use type="primary" for a solid, primary-colored button
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
