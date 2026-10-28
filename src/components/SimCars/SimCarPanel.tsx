import { FC, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import {
  Alert,
  Button,
  Empty,
  Flex,
  Form,
  InputNumber,
  message,
  Modal,
  Select,
  Switch,
  Tooltip,
  Typography,
} from "antd";
import { CloseOutlined, PlusOutlined, SwapOutlined } from "@ant-design/icons";
import { useAtom } from "jotai";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useScriptRobot from "@/api/useScriptRobot";
import useAMRsample from "@/api/useAMRsample";
import useSimulateScript from "@/api/useSimulateScript";
import { useMockInfo } from "@/sockets/useMockInfo";
import { ErrorResponse } from "@/utils/globalType";
import { amrId2Color, errorHandler } from "@/utils/utils";
import AmrForm, { EditFormType } from "./AmrForm";
import ScriptModal from "./ScriptModal";
import { EditingSimCar, OpenSimCarPanel } from "./simCarAtoms";
import { refetchSimCars, SIM_CAR_DRAG_TYPE } from "./useSimCarPlacement";

type MockSettings = {
  fps: number;
  timeScale: number;
  mockWarnings: boolean;
  carSpeed: number;
};

const MOCK_SETTINGS_KEY = ["mock-settings"];

const Btn = styled.div<{ $top: string; $left: string; $active: boolean }>`
  position: absolute;
  z-index: 5;
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  background-color: ${({ $active }) =>
    $active ? "var(--c-header-accent-soft)" : "var(--c-bg-subtle)"};
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  opacity: 0.9;
  width: 3em;
  height: 3em;
  cursor: pointer;

  &:hover {
    opacity: 1;
  }

  svg {
    width: 1.5em;
    height: 1.5em;
    fill: currentColor;
  }
`;

const Panel = styled.div<{ $top: string; $left: string }>`
  position: absolute;
  z-index: 21;
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  width: 260px;
  max-height: calc(100% - ${({ $top }) => $top} - 16px);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm, 8px);
  padding: 12px;
  background: var(--c-bg-subtle);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
`;

const CarList = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const CarRow = styled.div<{ $draggable: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 6px;
  cursor: ${({ $draggable }) => ($draggable ? "grab" : "pointer")};

  &:hover {
    background: var(--c-bg-muted);
  }
`;

const Swatch = styled.span<{ $color: string }>`
  flex: 0 0 auto;
  width: 12px;
  height: 16px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
`;

/**
 * 首頁 (MainV2) 地圖上的「模擬車輛」: 新增模擬車、拖到地圖點位當起始位置、點車改參數。
 * 取代舊的 /simulate 頁 (那頁真正有在用的只有這個)。
 * 開始 / 停止模擬照舊在 Header 的「模擬」按鈕。
 */
const SimCarPanel: FC<{ top?: string; left?: string }> = ({
  top = "128px",
  left = "16px",
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useAtom(OpenSimCarPanel);
  const [editing, setEditing] = useAtom(EditingSimCar);
  const [addOpen, setAddOpen] = useState(false);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [form] = Form.useForm<{ robot_type: string }>();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { data: robots } = useScriptRobot();
  const { data: robotTypes } = useAMRsample();
  const { data: currentScript, isError: noScript } = useSimulateScript();
  const script = useMockInfo();
  const running = !!script?.isSimulate;

  const addMutation = useMutation({
    mutationFn: (payload: { robot_type: string }) =>
      client.post("api/simulate/add-robot", payload),
    onSuccess: () => {
      refetchSimCars(queryClient);
      setAddOpen(false);
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const editMutation = useMutation({
    mutationFn: (payload: EditFormType) =>
      client.post("api/simulate/edit-robot", { ...payload, id: editing }),
    onSuccess: () => {
      refetchSimCars(queryClient);
      setEditing(null);
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const robotTypeOptions = useMemo(
    () => robotTypes?.map((v) => ({ label: v.name, value: v.value })) ?? [],
    [robotTypes],
  );

  const [settingsForm] = Form.useForm<MockSettings>();
  const { data: mockSettings } = useQuery(MOCK_SETTINGS_KEY, async () => {
    const { data } = await client.get<MockSettings>(
      "api/simulate/mock-settings",
    );
    return data;
  });
  useEffect(() => {
    if (mockSettings) settingsForm.setFieldsValue(mockSettings);
  }, [mockSettings, settingsForm]);

  const settingsMutation = useMutation({
    mutationFn: (payload: MockSettings) =>
      client.post("api/simulate/mock-settings", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries(MOCK_SETTINGS_KEY);
      void messageApi.success(t("sim.car_panel.settings_saved"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const cars = (robots ?? []).filter((r): r is NonNullable<typeof r> => !!r);

  return (
    <>
      {contextHolder}
      <Tooltip title={t("sim.car_panel.title")} placement="right">
        <Btn
          $top={top}
          $left={left}
          $active={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          {/* mdi: car-cog 風格的小車 */}
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M5,11L6.5,6.5H17.5L19,11M17.5,16A1.5,1.5 0 0,1 16,14.5A1.5,1.5 0 0,1 17.5,13A1.5,1.5 0 0,1 19,14.5A1.5,1.5 0 0,1 17.5,16M6.5,16A1.5,1.5 0 0,1 5,14.5A1.5,1.5 0 0,1 6.5,13A1.5,1.5 0 0,1 8,14.5A1.5,1.5 0 0,1 6.5,16M18.92,6C18.72,5.42 18.16,5 17.5,5H6.5C5.84,5 5.28,5.42 5.08,6L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6Z" />
          </svg>
        </Btn>
      </Tooltip>

      {open && (
        <Panel $top={top} $left={`calc(${left} + 3.5em)`}>
          <Flex justify="space-between" align="center">
            <Typography.Text strong>{t("sim.car_panel.title")}</Typography.Text>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={() => setOpen(false)}
            />
          </Flex>

          <Flex justify="space-between" align="center" gap={8}>
            <Typography.Text type="secondary" ellipsis>
              {t("sim.modal.current")}：
              {noScript
                ? t("sim.select_script.no_scripts")
                : currentScript?.name}
            </Typography.Text>
            <Tooltip title={t("sim.select_script.change")}>
              <Button
                size="small"
                icon={<SwapOutlined />}
                disabled={running}
                onClick={() => setScriptOpen(true)}
              />
            </Tooltip>
          </Flex>

          {running ? (
            <Alert type="info" showIcon message={t("sim.car_panel.running")} />
          ) : noScript ? (
            <Alert
              type="warning"
              showIcon
              message={t("sim.modal.do_you_want_to_create_one")}
            />
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t("sim.car_panel.drag_hint")}
            </Typography.Text>
          )}

          <CarList>
            {cars.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t("sim.car_panel.no_car")}
              />
            ) : (
              cars.map((r) => {
                const placed =
                  !!r.script_placement_location &&
                  r.script_placement_location !== "unset";
                return (
                  <CarRow
                    key={r.id}
                    $draggable={!running}
                    draggable={!running}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(SIM_CAR_DRAG_TYPE, r.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => !running && setEditing(r.id)}
                  >
                    <Swatch $color={amrId2Color(r.id)} />
                    <Typography.Text ellipsis style={{ flex: 1 }}>
                      {r.full_name}
                    </Typography.Text>
                    <Typography.Text
                      type={placed ? undefined : "secondary"}
                      style={{ fontSize: 12 }}
                    >
                      {placed
                        ? r.script_placement_location
                        : t("sim.robot.unset")}
                    </Typography.Text>
                  </CarRow>
                );
              })
            )}
          </CarList>

          <Form
            form={settingsForm}
            layout="horizontal"
            size="small"
            labelCol={{ span: 12 }}
            disabled={running}
            onFinish={(v) => settingsMutation.mutate(v)}
            style={{ flex: "0 0 auto" }}
          >
            <Typography.Text strong>
              {t("sim.car_panel.settings.title")}
            </Typography.Text>
            <Form.Item
              name="carSpeed"
              label={t("sim.car_panel.settings.car_speed")}
              rules={[{ required: true }]}
              style={{ margin: "4px 0" }}
            >
              <InputNumber min={0.1} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="timeScale"
              label={t("sim.car_panel.settings.time_scale")}
              rules={[{ required: true }]}
              style={{ margin: "4px 0" }}
            >
              <InputNumber min={0.1} step={0.5} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="fps"
              label="FPS"
              rules={[{ required: true }]}
              style={{ margin: "4px 0" }}
            >
              <InputNumber
                min={1}
                max={240}
                precision={0}
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item
              name="mockWarnings"
              label={t("sim.car_panel.settings.mock_warnings")}
              valuePropName="checked"
              style={{ margin: "4px 0" }}
            >
              <Switch />
            </Form.Item>
            <Flex justify="space-between" align="center" gap={8}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t("sim.car_panel.settings.hint")}
              </Typography.Text>
              <Button
                htmlType="submit"
                size="small"
                loading={settingsMutation.isLoading}
              >
                {t("utils.save")}
              </Button>
            </Flex>
          </Form>

          <Button
            icon={<PlusOutlined />}
            disabled={running || noScript}
            onClick={() => setAddOpen(true)}
          >
            {t("sim.add_car")}
          </Button>
        </Panel>
      )}

      <Modal
        title={t("toolbar.amr_setting.register_amr")}
        open={addOpen}
        footer={null}
        onCancel={() => setAddOpen(false)}
      >
        <Form form={form} onFinish={(v) => addMutation.mutate(v)}>
          <Form.Item
            name="robot_type"
            label={t("setting_amr.register_amr.type")}
            rules={[{ required: true }]}
          >
            <Select options={robotTypeOptions} />
          </Form.Item>
          <Form.Item style={{ textAlign: "right", margin: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={addMutation.isLoading}
            >
              {t("utils.submit")}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <AmrForm
        id={editing ?? ""}
        isOpen={!!editing}
        setIsOpen={(v) => {
          const next = typeof v === "function" ? v(!!editing) : v;
          if (!next) setEditing(null);
        }}
        handleEditMutation={(payload) => editMutation.mutate(payload)}
      />

      <ScriptModal open={scriptOpen} onClose={() => setScriptOpen(false)} />
    </>
  );
};

export default SimCarPanel;
