import { Select, Radio, Form, Button, Flex, Space, message } from "antd";
import {
  CloseOutlined,
  RocketOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  UploadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import useName from "@/api/useAmrName";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAtom, useSetAtom } from "jotai";
import {
  QuickMissionLoad,
  QuickMissionOffload,
  QuickMissionSettingMode,
  StartQuickMissionSetting,
} from "../../global/jotai";
import styled, { keyframes, css } from "styled-components";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

enum MissionPriority {
  TRIVIAL,
  NORMAL,
  PIVOTAL,
  CRITICAL,
}

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const QuickMissionContainer = styled.div<{ $visible: boolean }>`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 100%;
  max-width: 480px;
  z-index: 1000;
  animation: ${({ $visible }) =>
    $visible
      ? css`
          ${slideIn} 0.3s ease-out forwards
        `
      : css`
          ${slideOut} 0.3s ease-out forwards
        `};

  @media (max-width: 576px) {
    right: 0;
    bottom: 0;
    max-width: 100%;
    border-radius: 0;
  }

  @media (min-width: 577px) and (max-width: 768px) {
    right: 10px;
    bottom: 10px;
    max-width: calc(100% - 20px);
  }
`;

const IndustrialPanel = styled.div`
  background: var(--c-bg);
  border: 2px solid var(--c-header-border);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  max-height: calc(100vh - 40px);
  overflow-y: auto;

  @media (max-width: 576px) {
    border: none;
    border-top: 2px solid var(--c-header-border);
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.12);
    max-height: 90vh;
    border-radius: 0;
  }
`;

const PanelHeader = styled.div`
  background: var(--c-bg-subtle);
  border-bottom: 2px solid var(--c-header-border);
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--c-header-accent);
  }

  @media (min-width: 768px) {
    padding: 16px 20px;
  }
`;

const PanelTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "Roboto Mono", monospace;
  font-size: 13px;
  font-weight: 700;
  color: var(--c-header-accent);
  text-transform: uppercase;
  letter-spacing: 1px;

  @media (min-width: 768px) {
    gap: 12px;
    font-size: 16px;
    letter-spacing: 1.5px;
  }
`;

const CloseButton = styled(Button)`
  background: transparent;
  border: 1px solid var(--c-header-border);
  color: var(--c-text-muted);
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  @media (min-width: 768px) {
    width: 32px;
    height: 32px;
  }

  &:hover {
    background: var(--c-danger-soft);
    border-color: var(--c-danger);
    color: var(--c-danger);
  }
`;

const PanelBody = styled.div`
  padding: 16px;
  background: var(--c-bg);

  @media (min-width: 768px) {
    padding: 24px;
  }
`;

const StatusIndicator = styled.div<{ status: "idle" | "selecting" | "ready" }>`
  background: ${({ status }) =>
    status === "ready"
      ? "var(--c-success-soft)"
      : status === "selecting"
        ? "var(--c-warning-soft)"
        : "var(--c-bg-subtle)"};
  border: 2px solid;
  border-color: ${({ status }) =>
    status === "ready"
      ? "var(--c-success)"
      : status === "selecting"
        ? "var(--c-warning)"
        : "var(--c-header-border)"};
  padding: 10px 12px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "Roboto Mono", monospace;
  color: ${({ status }) =>
    status === "ready"
      ? "var(--c-success)"
      : status === "selecting"
        ? "var(--c-warning)"
        : "var(--c-text-muted)"};
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  @media (min-width: 768px) {
    padding: 12px 16px;
    margin-bottom: 20px;
    gap: 12px;
    font-size: 12px;
    letter-spacing: 1px;
  }
`;

const FieldLabel = styled.div`
  color: var(--c-text-secondary);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-family: "Roboto Mono", monospace;
  margin-bottom: 6px;
  font-weight: 600;

  @media (min-width: 768px) {
    font-size: 11px;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
`;

const LocationCard = styled.div<{
  type: "load" | "offload";
  selected: boolean;
}>`
  background: ${({ selected, type }) =>
    selected ? (type === "load" ? "var(--c-header-accent-soft)" : "var(--c-success-soft)") : "var(--c-bg-subtle)"};
  border: 2px solid;
  border-color: ${({ selected, type }) =>
    selected ? (type === "load" ? "var(--c-header-accent)" : "var(--c-success)") : "var(--c-header-border)"};
  padding: 12px;
  margin-bottom: 10px;
  position: relative;
  transition: all 0.2s ease;
  cursor: ${({ selected }) => (selected ? "default" : "pointer")};

  @media (min-width: 768px) {
    padding: 16px;
    margin-bottom: 12px;
  }

  &:hover {
    border-color: ${({ selected, type }) =>
      selected ? (type === "load" ? "var(--c-header-accent)" : "var(--c-success)") : "var(--c-text-muted)"};
    background: ${({ selected, type }) =>
      selected ? (type === "load" ? "var(--c-header-accent-soft)" : "var(--c-success-soft)") : "var(--c-bg-subtle)"};
  }

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: ${({ type }) => (type === "load" ? "var(--c-header-accent)" : "var(--c-success)")};
    opacity: ${({ selected }) => (selected ? 1 : 0)};
    transition: opacity 0.2s;

    @media (min-width: 768px) {
      width: 4px;
    }
  }
`;

const LocationHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;

  @media (min-width: 768px) {
    gap: 12px;
    margin-bottom: 8px;
  }
`;

const LocationIcon = styled.div<{ type: "load" | "offload" }>`
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ type }) => (type === "load" ? "var(--c-header-accent)" : "var(--c-success)")};
  color: #ffffff;
  font-size: 14px;
  border: 1px solid;
  border-color: ${({ type }) => (type === "load" ? "var(--c-header-accent)" : "var(--c-success)")};
  flex-shrink: 0;

  @media (min-width: 768px) {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
`;

const LocationTitle = styled.div`
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--c-text);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  flex: 1;

  @media (min-width: 768px) {
    font-size: 13px;
    letter-spacing: 1px;
  }
`;

const LocationValue = styled.div`
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  color: var(--c-header-accent);
  font-weight: 600;
  padding-left: 38px;

  @media (min-width: 768px) {
    font-size: 14px;
    padding-left: 44px;
  }
`;

const InstructionBanner = styled.div`
  background: var(--c-warning-soft);
  border: 2px solid var(--c-warning);
  padding: 12px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  color: var(--c-warning);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  animation: ${keyframes`
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  `} 2s ease-in-out infinite;

  @media (min-width: 768px) {
    padding: 16px;
    margin-bottom: 16px;
    gap: 12px;
    font-size: 12px;
    letter-spacing: 1px;
  }
`;

const IndustrialButton = styled(Button)`
  background: var(--c-bg);
  border: 1px solid var(--c-header-border);
  color: var(--c-header-accent);
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.8px;
  height: 36px;
  font-weight: 600;

  @media (min-width: 768px) {
    font-size: 11px;
    letter-spacing: 1px;
    height: 40px;
  }

  &:hover {
    background: var(--c-header-accent-soft);
    border-color: var(--c-header-accent);
    color: var(--c-header-accent);
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
  }

  &.danger {
    border-color: var(--c-danger);
    color: var(--c-danger);

    &:hover {
      background: var(--c-danger-soft);
      border-color: var(--c-danger);
      color: var(--c-danger);
      box-shadow: 0 2px 8px rgba(255, 77, 79, 0.2);
    }
  }

  &.primary {
    background: var(--c-header-accent);
    border-color: var(--c-header-accent);
    color: #ffffff;

    &:hover {
      background: var(--c-header-accent);
      border-color: var(--c-header-accent);
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  }

  &.success {
    background: var(--c-success);
    border-color: var(--c-success);
    color: #ffffff;

    &:hover {
      background: var(--c-success);
      border-color: var(--c-success);
      box-shadow: 0 2px 8px rgba(82, 196, 26, 0.4);
    }
  }

  &:disabled {
    background: var(--c-bg-subtle);
    border-color: var(--c-header-border);
    color: var(--c-text-muted);
  }
`;

const PriorityRadioGroup = styled(Radio.Group)`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;

  @media (min-width: 768px) {
    gap: 8px;
  }

  .ant-radio-button-wrapper {
    height: 36px;
    line-height: 34px;
    border: 1px solid var(--c-header-border);
    background: var(--c-bg-subtle);
    font-family: "Roboto Mono", monospace;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
    transition: all 0.2s;

    @media (min-width: 768px) {
      height: 40px;
      line-height: 38px;
      font-size: 11px;
      letter-spacing: 1px;
    }

    &:hover {
      background: var(--c-bg-subtle);
      border-color: var(--c-text-muted);
    }

    &.ant-radio-button-wrapper-checked {
      background: var(--c-header-accent-soft);
      border-color: var(--c-header-accent);
      color: var(--c-header-accent);
      box-shadow: inset 0 0 20px rgba(24, 144, 255, 0.08);

      &::before {
        background: var(--c-header-accent);
      }
    }
  }
`;

const StyledSelect = styled(Select)`
  .ant-select-selector {
    min-height: 36px !important;
    font-family: "Roboto Mono", monospace;

    @media (min-width: 768px) {
      min-height: 40px !important;
    }
  }
`;

const ResponsiveSpace = styled(Space)`
  width: 100%;
`;

const ButtonGroup = styled(Flex)`
  margin-top: 16px;
  gap: 8px;

  @media (min-width: 768px) {
    margin-top: 20px;
    gap: 12px;
  }
`;

type Submit = {
  amrId: string;
  priority: number;
  ept_s: string | undefined;
  ept_d: string | undefined;
};

const QuickMissionWebView: React.FC<{
  setShowQuickMission: React.Dispatch<boolean>;
  showQuickMission: boolean;
}> = ({ setShowQuickMission, showQuickMission }) => {
  const [form] = Form.useForm();
  const { data: names } = useName();
  const [loadValue, setLoad] = useAtom(QuickMissionLoad);
  const [offloadValue, setOffload] = useAtom(QuickMissionOffload);
  const [startQuickSetting, setStartQuickSetting] = useAtom(
    StartQuickMissionSetting,
  );
  const setQuickSettingMode = useSetAtom(QuickMissionSettingMode);
  const { t } = useTranslation();
  const [, setAmrGenre] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const AmrOption: { value: string; label: string }[] | undefined =
    useMemo(() => {
      let options;
      if (names?.isSim) {
        options = names.amrs
          .filter((a) => a.isReal === false)
          .map((m) => ({ label: m.amrId, value: m.amrId }));
      } else {
        options = names?.amrs
          .filter((a) => a.isReal === true)
          .map((m) => ({ label: m.amrId, value: m.amrId }));
      }
      return options
        ? [...options, { value: "none", label: t("utils.random") }]
        : undefined;
    }, [names, t]);

  const handlePayload = (action: "load" | "offload") => {
    setStartQuickSetting(true);
    setQuickSettingMode(action);
  };

  const handleCancel = () => {
    setStartQuickSetting(false);
    setQuickSettingMode(null);
    setOffload(null);
    setLoad(null);
  };

  const submitMutation = useMutation({
    mutationFn: (payload: Submit) => {
      return client.post("api/missions/fast-mission", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      handleCancel();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && startQuickSetting) {
        handleCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startQuickSetting]);

  const handleSubmit = () => {
    const values = form.getFieldsValue() as { amrId: string; priority: number };

    const payload: Submit = {
      amrId: values.amrId,
      priority: values.priority,
      ept_s: loadValue?.columnName,
      ept_d: offloadValue?.columnName,
    };

    submitMutation.mutate(payload);
  };

  useEffect(() => {
    form.setFieldsValue({
      amrId: "none",
      priority: MissionPriority.NORMAL,
    });
  }, []);

  const getStatus = () => {
    if (startQuickSetting) return "selecting";
    if (loadValue || offloadValue) return "ready";
    return "idle";
  };

  return (
    <>
      {contextHolder}
      <QuickMissionContainer $visible={showQuickMission}>
        <IndustrialPanel>
          <PanelHeader>
            <PanelTitle>
              <RocketOutlined />
              {t("main.card_name.quick_mission")}
            </PanelTitle>
            <CloseButton
              icon={<CloseOutlined />}
              onClick={() => setShowQuickMission(false)}
            />
          </PanelHeader>

          <PanelBody>
            <StatusIndicator status={getStatus()}>
              {getStatus() === "ready" && (
                <>
                  <CheckCircleOutlined />
                  [OK] LOCATIONS CONFIGURED
                </>
              )}
              {getStatus() === "selecting" && (
                <>
                  <WarningOutlined />
                  [ACTIVE] SELECTING LOCATION
                </>
              )}
              {getStatus() === "idle" && (
                <>
                  <WarningOutlined />
                  [STANDBY] AWAITING CONFIGURATION
                </>
              )}
            </StatusIndicator>

            {startQuickSetting && (
              <InstructionBanner>
                <WarningOutlined />
                {t("main.quick_mission.click_shelves_or_cancel")} (ESC)
              </InstructionBanner>
            )}

            <Form form={form} layout="vertical">
              <Form.Item
                label={
                  <FieldLabel>{t("mission.cycle_mission.car")}</FieldLabel>
                }
                name="amrId"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <StyledSelect
                  options={AmrOption}
                  onChange={(v: string) => setAmrGenre(v)}
                  placeholder={t("utils.required")}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label={
                  <FieldLabel>
                    {t("main.mission_modal.dialog_mission.task_priority")}
                  </FieldLabel>
                }
                name="priority"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <PriorityRadioGroup>
                  <Radio.Button value={MissionPriority.CRITICAL}>
                    {t("main.mission_modal.dialog_mission.priority.CRITICAL")}
                  </Radio.Button>
                  <Radio.Button value={MissionPriority.PIVOTAL}>
                    {t("main.mission_modal.dialog_mission.priority.PIVOTAL")}
                  </Radio.Button>
                  <Radio.Button value={MissionPriority.NORMAL}>
                    {t("main.mission_modal.dialog_mission.priority.NORMAL")}
                  </Radio.Button>
                  <Radio.Button value={MissionPriority.TRIVIAL}>
                    {t("main.mission_modal.dialog_mission.priority.TRIVIAL")}
                  </Radio.Button>
                </PriorityRadioGroup>
              </Form.Item>

              {!startQuickSetting && (
                <ResponsiveSpace orientation="vertical" size="middle">
                  <LocationCard
                    type="load"
                    selected={!!loadValue}
                    onClick={() => !loadValue && handlePayload("load")}
                  >
                    <LocationHeader>
                      <LocationIcon type="load">
                        <UploadOutlined />
                      </LocationIcon>
                      <LocationTitle>
                        {t("main.quick_mission.load")}
                      </LocationTitle>
                    </LocationHeader>
                    {loadValue && (
                      <LocationValue>
                        ID: {loadValue.locationId} · {loadValue.columnName}
                      </LocationValue>
                    )}
                    {!loadValue && (
                      <div
                        style={{
                          paddingLeft: "38px",
                          color: "var(--c-text-muted)",
                          fontSize: "10px",
                          fontFamily: "Roboto Mono, monospace",
                          textTransform: "uppercase",
                        }}
                      >
                        Click to select
                      </div>
                    )}
                  </LocationCard>

                  <LocationCard
                    type="offload"
                    selected={!!offloadValue}
                    onClick={() => !offloadValue && handlePayload("offload")}
                  >
                    <LocationHeader>
                      <LocationIcon type="offload">
                        <DownloadOutlined />
                      </LocationIcon>
                      <LocationTitle>
                        {t("main.quick_mission.offload")}
                      </LocationTitle>
                    </LocationHeader>
                    {offloadValue && (
                      <LocationValue>
                        ID: {offloadValue.locationId} ·{" "}
                        {offloadValue.columnName}
                      </LocationValue>
                    )}
                    {!offloadValue && (
                      <div
                        style={{
                          paddingLeft: "38px",
                          color: "var(--c-text-muted)",
                          fontSize: "10px",
                          fontFamily: "Roboto Mono, monospace",
                          textTransform: "uppercase",
                        }}
                      >
                        Click to select
                      </div>
                    )}
                  </LocationCard>
                </ResponsiveSpace>
              )}

              <ButtonGroup>
                <IndustrialButton
                  className="danger"
                  size="large"
                  block
                  onClick={handleCancel}
                >
                  {t("utils.cancel")}
                </IndustrialButton>
                {(loadValue || offloadValue) && !startQuickSetting && (
                  <IndustrialButton
                    className="success"
                    size="large"
                    block
                    onClick={handleSubmit}
                    // disabled={!loadValue || !offloadValue}
                    loading={submitMutation.isPending}
                  >
                    {submitMutation.isPending
                      ? "DEPLOYING..."
                      : t("utils.submit")}
                  </IndustrialButton>
                )}
              </ButtonGroup>
            </Form>
          </PanelBody>
        </IndustrialPanel>
      </QuickMissionContainer>
    </>
  );
};

export default QuickMissionWebView;
