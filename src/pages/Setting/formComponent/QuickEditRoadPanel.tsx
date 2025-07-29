import {
  Button,
  Checkbox,
  Col,
  Flex,
  Form,
  message,
  Radio,
  Row,
  Space,
  Switch,
  Tooltip,
  Typography,
} from "antd";
import { useTranslation } from "react-i18next";
import FormHr from "../utils/FormHr";
import { useEffect, useState, useCallback } from "react";
import { useAtom } from "jotai";
import { IsEditingQuickRoads, QuickRoadsArray } from "../utils/settingJotai";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";
import { QuestionCircleOutlined } from "@ant-design/icons";

type RoadFormData = {
  validYawList?: string | number[];
  disabled: boolean;
  limit: boolean;
  roadType: string;
  roadArr: string[];
  priority: number;
};

const QuickEditRoadPanel: React.FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();
  const [chooseAngle, setChooseAngle] = useState<string>("");
  const [quickRoad, setQuickRoad] = useAtom(IsEditingQuickRoads);
  const [quickRoadArr, setQuickRoadArr] = useAtom(QuickRoadsArray);
  const queryClient = useQueryClient();

  const saveRoadMutation = useMutation({
    mutationFn: (payload: RoadFormData) => {
      return client.post("api/setting/save-quick-edit-road", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      queryClient.refetchQueries({ queryKey: ["map"] });
      setQuickRoadArr([]);
      setQuickRoad(false);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleEditing = () => {
    setQuickRoad((prev) => {
      if (prev) {
        setQuickRoadArr([]);
        setQuickRoad(false);
      }
      return !prev;
    });
  };

  // Debounced submit function to prevent rapid calls
  const submit = useCallback(() => {
    const currentQuickRoadArr = [...quickRoadArr]; // Capture the current state
    console.log("Submitting with quickRoadArr:", currentQuickRoadArr);
    const formData = form.getFieldsValue();
    if (currentQuickRoadArr.length < 2) {
      void messageApi.error(t("quick_edit_road_panel.error_min_spots"));
      return;
    }

    const payload: RoadFormData = {
      ...formData,
      disabled: formData.disabled ?? false,
      limit: formData.limit ?? false,
      roadArr: currentQuickRoadArr,
    };

    saveRoadMutation.mutate(payload);
  }, [quickRoadArr, form, messageApi, t, saveRoadMutation]);

  useEffect(() => {
    form.setFieldValue("priority", 3);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log("Key pressed:", e.key);
      if (e.key.toLowerCase() === "a" && !e.repeat) {
        console.log("user has press A");
        e.preventDefault();
        handleEditing();
      }

      if (e.key.toLowerCase() === "s" && !e.repeat) {
        console.log("user has press S");
        e.preventDefault();
        submit(); // Use debounced submit
      }

      if (e.key.toLowerCase() === "escape" && !e.repeat) {
        console.log("user has press ESC");
        e.preventDefault();
        setQuickRoadArr([]);
        setQuickRoad(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [submit]); // Dependency on submit to use the latest function

  return (
    <>
      {contextHolder}
      <div
        style={{
          width: "23em",
          padding: "16px",
          background: "#fff",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Space
          className="drop_button_style"
          {...listeners}
          {...attributes}
          style={{
            margin: 0,
            padding: "8px 0",
            cursor: "grab",
            fontSize: "16px",
            color: "#1f1f1f",
            width: "100%",
            justifyContent: "space-between",
            display: "flex",
          }}
        >
          <span>{t("quick_edit_road_panel.title")}</span>
          <Tooltip
            title={
              <>
                <div>
                  <b>A</b>: Start/Stop Editing
                </div>
                <div>
                  <b>S</b>: Save
                </div>
                <div>
                  <b>ESC</b>: Cancel
                </div>
              </>
            }
            placement="left"
          >
            <QuestionCircleOutlined
              style={{ color: "#8c8c8c", fontSize: 18, cursor: "pointer" }}
            />
          </Tooltip>
        </Space>

        <FormHr />
        <Form
          form={form}
          layout="vertical"
          style={{ fontWeight: "bold" }}
          initialValues={{
            roadType: "oneWayRoad",
            disabled: false,
            limit: false,
          }}
        >
          <Form.Item
            name="roadType"
            label={<Space>{t("edit_road_panel.road")}</Space>}
            rules={[{ required: true, message: t("utils.required") }]}
          >
            <Radio.Group buttonStyle="solid">
              <Radio.Button value="oneWayRoad">
                {t("edit_road_panel.single_road")}
              </Radio.Button>
              <Radio.Button value="twoWayRoad">
                {t("edit_road_panel.two_way_road")}
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="validYawList"
            label={<Space>{t("edit_road_panel.yaw")}</Space>}
            rules={[{ required: true, message: t("utils.required") }]}
          >
            <Checkbox.Group style={{ width: "100%" }}>
              <Row gutter={[8, 8]}>
                {["*", "0", "90", "180", "270"].map((angle) => (
                  <Col span={8} key={angle}>
                    <Checkbox
                      value={angle}
                      disabled={
                        (angle === "*" &&
                          ["0", "90", "180", "270"].includes(chooseAngle)) ||
                        (angle !== "*" &&
                          (chooseAngle === "*" ||
                            (angle === "0" &&
                              ["270", "90"].includes(chooseAngle)) ||
                            (angle === "90" &&
                              ["0", "180"].includes(chooseAngle)) ||
                            (angle === "180" &&
                              ["90", "270"].includes(chooseAngle)) ||
                            (angle === "270" &&
                              ["0", "180"].includes(chooseAngle))))
                      }
                      onChange={(e) => {
                        setChooseAngle(e.target.checked ? angle : "");
                      }}
                    >
                      {angle}
                    </Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>

          <Space size="large" style={{ marginBottom: "16px", width: "100%" }}>
            <Form.Item
              name="disabled"
              label={t("edit_road_panel.disabled")}
              valuePropName="checked"
              tooltip={t("quick_edit_road_panel.disabled_tooltip")}
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="limit"
              label={t("edit_road_panel.limit")}
              valuePropName="checked"
              tooltip={t("quick_edit_road_panel.limit_tooltip")}
            >
              <Switch />
            </Form.Item>
          </Space>

          <Form.Item
            label={t("edit_road_panel.priority")}
            name="priority"
            shouldUpdate
          >
            <Radio.Group buttonStyle="solid">
              <Radio.Button value={5}>{t("edit_road_panel.low")}</Radio.Button>
              <Radio.Button value={3}>
                {t("edit_road_panel.medium")}
              </Radio.Button>
              <Radio.Button value={1}>{t("edit_road_panel.high")}</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Flex vertical gap="middle">
            <Button
              type={quickRoad ? "default" : "primary"}
              onClick={handleEditing}
              style={{ width: "100%" }}
            >
              {quickRoad
                ? t("quick_edit_road_panel.stop_editing")
                : t("quick_edit_road_panel.start_editing")}
            </Button>
            {quickRoad && (
              <Typography.Text type="secondary">
                {t("quick_edit_road_panel.click_points_prompt")}
              </Typography.Text>
            )}
            {quickRoadArr.length > 0 && (
              <Typography.Text>
                {t("quick_edit_road_panel.selected_points")}:{" "}
                {quickRoadArr.join(" → ")}
              </Typography.Text>
            )}
            {quickRoadArr.length > 0 && (
              <Button
                onClick={() => setQuickRoadArr([])}
                style={{ width: "100%", marginTop: "8px" }}
              >
                {t("quick_edit_road_panel.clear_points")}
              </Button>
            )}
          </Flex>

          <Form.Item style={{ marginTop: "16px" }}>
            <Button
              type="primary"
              onClick={() => submit()}
              loading={saveRoadMutation.isLoading}
              disabled={quickRoadArr.length < 2}
              style={{ width: "100%" }}
            >
              {t("utils.submit")}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </>
  );
};

export default QuickEditRoadPanel;