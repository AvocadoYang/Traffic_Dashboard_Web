import { useAllConveyorMockConfig } from "@/api/useAllConveyorMockConfig";
import {
  Modal,
  Form,
  Switch,
  Card,
  Space,
  Button,
  Descriptions,
  Flex,
  Tooltip,
  Divider,
} from "antd";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { QuestionCircleOutlined } from "@ant-design/icons";

const StyledModal = styled(Modal)`
  .ant-modal-content {
    border-radius: 12px;
    background: #f9fafb;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  .ant-modal-header {
    border-bottom: none;
    padding: 24px 24px 0;
  }
  .ant-modal-title {
    font-size: 24px;
    font-weight: 600;
    color: #1f2937;
  }
  .ant-modal-body {
    padding: 24px;
  }
`;

const StyledCard = styled(Card)`
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  .ant-card-head {
    border-bottom: 1px solid #f0f0f0;
    padding: 0 16px;
  }
  .ant-card-head-title {
    font-size: 16px;
    font-weight: 500;
    color: #374151;
  }
  .ant-card-body {
    padding: 16px;
  }
`;

const StyledButton = styled(Button)`
  width: 100%;
  height: 40px;
  border-radius: 8px;
  background: #2563eb;
  border: none;
  font-size: 16px;
  font-weight: 500;
  &:hover {
    background: #1d4ed8;
  }
`;

const StyledSpace = styled(Space)`
  width: 100%;
`;

const WcsModal: FC<{
  isOpen: boolean;
  handleOk: (updates: { locationId: string; isEnable: boolean }[]) => void;
  handleCancel: () => void;
}> = ({ isOpen, handleOk, handleCancel }) => {
  const [form] = Form.useForm();
  const { data: allConveyor } = useAllConveyorMockConfig();
  const { t } = useTranslation();

  const onFinish = (values: any) => {
    const updates =
      allConveyor?.map((station, _index) => ({
        locationId: station!.locationId,
        isEnable: values[`enable_${station!.locationId}`] ?? station!.isEnable,
      })) ?? [];

    handleOk(updates);
  };

  return (
    <StyledModal
      title={t("sim.conveyor.title")}
      open={isOpen}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      width={800}
      footer={<></>}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <StyledSpace direction="vertical" size="large">
          <StyledCard title={t("sim.conveyor.card_title")}>
            <StyledSpace direction="vertical" size="middle">
              {allConveyor?.map((station) => {
                if (!station) return null;
                return (
                  <StyledCard
                    key={station.locationId}
                    title={t("sim.conveyor.station", {
                      id: station.locationId,
                    })}
                    size="small"
                  >
                    <Flex>
                      <Form.Item
                        label={
                          <span>
                            {t("sim.conveyor.active_config")}{" "}
                            <Tooltip
                              title={t("sim.conveyor.active_config_desc")}
                            >
                              <QuestionCircleOutlined
                                style={{ color: "#999" }}
                              />
                            </Tooltip>
                          </span>
                        }
                        name={`enable_${station.locationId}`}
                        valuePropName="checked"
                        initialValue={station.isEnable}
                      >
                        <Switch />
                      </Form.Item>
                    </Flex>

                    <Descriptions column={2} size="small" bordered>
                      <Descriptions.Item label={t("sim.conveyor.spawn_cargo")}>
                        {station.isSpawnCargo ? t("utils.yes") : t("utils.no")}
                      </Descriptions.Item>
                      <Descriptions.Item label={t("sim.conveyor.spawn_time")}>
                        {station.spawnTimeMs} ms
                      </Descriptions.Item>
                      <Descriptions.Item label={t("sim.conveyor.active_shift")}>
                        {station.activeShift ? t("utils.yes") : t("utils.no")}
                      </Descriptions.Item>
                      <Descriptions.Item label={t("sim.conveyor.shift_time")}>
                        {station.shiftTimeMs} ms
                      </Descriptions.Item>
                      <Descriptions.Item
                        label={t("sim.conveyor.shift_target")}
                        span={2}
                      >
                        {station.shiftLocationId || t("sim.conveyor.none")}
                      </Descriptions.Item>
                    </Descriptions>
                  </StyledCard>
                );
              })}
            </StyledSpace>
          </StyledCard>

          <StyledButton type="primary" htmlType="submit">
            {t("sim.conveyor.save")}
          </StyledButton>
        </StyledSpace>
      </Form>
    </StyledModal>
  );
};

export default WcsModal;
