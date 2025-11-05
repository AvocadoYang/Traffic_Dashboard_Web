import {
  Button,
  Divider,
  Flex,
  InputNumber,
  List,
  Modal,
  Space,
  Switch,
  Tag,
  TimePicker,
  Tooltip,
  Typography,
} from "antd";
import { Dispatch, FC, SetStateAction, useState } from "react";
import {
  CarOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMockInfo } from "@/sockets/useMockInfo";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);
const { Title, Text } = Typography;

const StartSimModal: FC<{
  isSimulateOpen: boolean;
  setIsSimulateOpen: Dispatch<SetStateAction<boolean>>;
  handleSim: (
    timeRange: [dayjs.Dayjs, dayjs.Dayjs],
    activeStationTask: boolean,
    runningScale: number
  ) => void;
  canSim: boolean;
}> = ({ isSimulateOpen, setIsSimulateOpen, handleSim, canSim }) => {
  const { t } = useTranslation();
  const script = useMockInfo();
  const startTime = dayjs("08:00", "HH:mm");
  const endTime = dayjs("17:00", "HH:mm");
  const [timeRange, setTimeRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    startTime,
    endTime,
  ]);
  const [isActiveStation, setIsActiveStation] = useState(true);
  const [scale, setScale] = useState(10);
  const durationMinutes = Math.max(
    0,
    dayjs(timeRange[1]).diff(dayjs(timeRange[0]), "minute")
  );
  const simMinutes = durationMinutes / (scale || 1);
  return (
    <Modal
      open={isSimulateOpen}
      onCancel={() => setIsSimulateOpen(false)}
      footer={null} // Custom footer for better control
      width={450}
      centered
      style={{
        padding: "24px",
        borderRadius: "8px",
        background: "#fff",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <Title level={4} style={{ margin: 0, color: "#1d39c4" }}>
          <CarOutlined style={{ marginRight: "8px", color: "#1d39c4" }} />
          {t("sim.start_sim_modal.active_sim")}
        </Title>
        <Text type="secondary">
          {t("sim.start_sim_modal.please_confirm_info")}
        </Text>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <Text strong style={{ display: "block", marginBottom: "8px" }}>
          {t("sim.start_sim_modal.sim_script")}
        </Text>
        <Tag color="blue" style={{ fontSize: "14px", padding: "4px 12px" }}>
          {script?.scriptName || t("sim.start_sim_modal.no_script_select")}
        </Tag>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <Text strong style={{ display: "block", marginBottom: "8px" }}>
          {t("sim.start_sim_modal.in_use_robot")}
        </Text>
        {script?.robot &&
        script.robot.filter((v) => v.script_placement_location !== "unset")
          .length > 0 ? (
          <List
            size="small"
            dataSource={script.robot.filter(
              (r) => r.script_placement_location !== "unset"
            )}
            renderItem={(robot) => (
              <List.Item style={{ padding: "8px 0", borderBottom: "none" }}>
                <Text>
                  <CarOutlined
                    style={{ marginRight: "8px", color: "#1890ff" }}
                  />
                  {robot.id}
                </Text>
              </List.Item>
            )}
            style={{
              maxHeight: "150px",
              overflowY: "auto",
              padding: "8px",
              background: "#f9f9f9",
              borderRadius: "4px",
            }}
          />
        ) : (
          <Text type="secondary">
            {" "}
            {t("sim.start_sim_modal.no_robot_select")}
          </Text>
        )}
      </div>

      <div style={{ marginBottom: "24px" }}>
        <Text strong style={{ display: "block", marginBottom: "8px" }}>
          {t("sim.start_sim_modal.duration")}
        </Text>
        <TimePicker.RangePicker
          value={timeRange}
          onChange={(values) => {
            if (values) setTimeRange(values as [dayjs.Dayjs, dayjs.Dayjs]);
          }}
          needConfirm={false}
          format="HH:mm"
        />
      </div>

      <div style={{ marginBottom: "24px", maxWidth: "600px" }}>
        <Flex vertical gap="small">
          {/* First row: Labels */}
          <Flex justify="space-between" wrap="wrap" gap="middle">
            <Text strong style={{ marginBottom: 8 }}>
              {t("sim.start_sim_modal.scale")}
            </Text>
          </Flex>

          {/* Second row: Input and Tag */}
          <Flex gap="middle" align="center" wrap="wrap">
            <label htmlFor="scale-input" style={{ display: "none" }}>
              {t("sim.start_sim_modal.scale")}
            </label>
            <InputNumber
              id="scale-input"
              max={10}
              min={1}
              value={scale}
              onChange={(value) => setScale(value ?? 10)} // Explicit nullish coalescing
              style={{ width: "100px" }} // Constrain width for consistency
              aria-label={t("sim.start_sim_modal.scale")} // Accessibility
            />
            <Tooltip title={t("sim.start_sim_modal.spend_time")}>
              <Tag color="purple">
                {simMinutes.toFixed(1)} {t("utils.minutes")}
              </Tag>
            </Tooltip>
          </Flex>
        </Flex>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <Text strong style={{ display: "block", marginBottom: "8px" }}>
          {t("sim.start_sim_modal.station_mission")}
        </Text>
        <Switch
          checkedChildren={<CheckOutlined />}
          unCheckedChildren={<CloseOutlined />}
          value={isActiveStation}
          onChange={(v) => setIsActiveStation(v)}
        />
      </div>

      <Divider style={{ margin: "16px 0" }} />

      <Space style={{ display: "flex", justifyContent: "center" }}>
        <Tooltip title={t("sim.start_sim_modal.start_mock_info")}>
          <Button
            disabled={!canSim}
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => handleSim(timeRange, isActiveStation, scale)}
            style={{
              background: canSim ? "#1d39c4" : "#fff",
              borderColor: "#1d39c4",
              borderRadius: "4px",
              padding: "0 24px",
            }}
          >
            {t("sim.start_sim_modal.active")}
          </Button>
        </Tooltip>

        <Button
          icon={<CloseCircleOutlined />}
          onClick={() => setIsSimulateOpen(false)}
          style={{
            borderRadius: "4px",
            padding: "0 24px",
          }}
        >
          {t("sim.start_sim_modal.cancel")}
        </Button>
      </Space>
    </Modal>
  );
};

export default StartSimModal;
