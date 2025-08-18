import {
  Select,
  Radio,
  Form,
  Button,
  Flex,
  Typography,
  Space,
  Card,
  message,
} from "antd";
import { CloseOutlined } from "@ant-design/icons";
import useName from "@/api/useAmrName";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAtom, useSetAtom } from "jotai";
import {
  Quick_Mission,
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
  TRIVIAL, // 沒差最後再做
  NORMAL, // 普通
  PIVOTAL, // 特別優先
  CRITICAL, // 緊急
}

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const fadeOut = keyframes`
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(10px);
  }
`;

const QuickMissionContainer = styled.div<{ $visible: boolean }>`
  position: fixed;
  bottom: 1%;
  right: ${(props) => `${props.$visible ? "1%" : "-90%"}`};
  width: 100%;
  max-width: 450px;
  z-index: 1000;
  animation: ${({ $visible }) =>
    $visible
      ? css`
          ${fadeIn} 0.3s ease-out forwards
        `
      : css`
          ${fadeOut} 0.3s ease-out forwards
        `};
  @media (max-width: 480px) {
    max-width: 90%;
  }
`;

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: #fff;
  padding: 16px;
  .ant-card-body {
    padding: 24px;
  }
`;

const Header = styled(Flex)`
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`;

const Title = styled(Typography.Title)`
  margin: 0 !important;
  font-size: 20px !important;
  color: #1a1a1a !important;
`;

const CloseIcon = styled(CloseOutlined)`
  font-size: 16px;
  color: #666;
  cursor: pointer;
  transition: color 0.3s;
  &:hover {
    color: #ff4d4f;
  }
`;

const InstructionText = styled.div`
  text-align: center;
  font-size: 14px;
  color: #666;
  margin: 16px 0;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  animation: ${fadeIn} 0.3s ease-out;
`;

const ActionButton = styled(Button)`
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const SelectedLocation = styled.div`
  padding: 8px 12px;
  background: #e6f7ff;
  border-radius: 6px;
  color: #1890ff;
  font-size: 14px;
  margin: 8px 0;
`;

type Submit = {
  amrId: string[];
  priority: number;
  task: (Quick_Mission | null)[];
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
        console.log("press esc");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startQuickSetting]);

  const handleSubmit = () => {
    const values = form.getFieldsValue() as { amrId: string; priority: number };
    // console.log('Submitting quick mission:', { loadValue, offloadValue, ...values });

    const prefixTask = [loadValue, offloadValue].filter((v) => v !== null);

    const payload: Submit = {
      amrId: [values.amrId],
      priority: values.priority,
      task: prefixTask,
    };

    submitMutation.mutate(payload);
  };

  useEffect(() => {
    form.setFieldsValue({
      amrId: "none",
      priority: MissionPriority.NORMAL,
    });
  }, []);

  return (
    <>
      {contextHolder}
      <QuickMissionContainer $visible={showQuickMission}>
        <StyledCard>
          <Header>
            <Title level={4}>{t("main.card_name.quick_mission")}</Title>
            <CloseIcon
              onClick={() => setShowQuickMission(false)}
              aria-label="Close"
            />
          </Header>

          <Form form={form} layout="vertical">
            <Form.Item
              label={t("mission.cycle_mission.car")}
              name="amrId"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Select
                options={AmrOption}
                onChange={(v: string) => setAmrGenre(v)}
                placeholder={t("utils.required")}
                size="large"
                style={{ borderRadius: "8px" }}
              />
            </Form.Item>

            <Form.Item
              label={t("main.mission_modal.dialog_mission.task_priority")}
              name="priority"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Radio.Group>
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
              </Radio.Group>
            </Form.Item>

            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              {startQuickSetting ? (
                <InstructionText>
                  {t("main.quick_mission.click_shelves_or_cancel")} (ESC to
                  cancel)
                </InstructionText>
              ) : (
                <>
                  {loadValue ? (
                    <SelectedLocation>
                      {t("main.quick_mission.load")}: {loadValue.locationId}
                    </SelectedLocation>
                  ) : (
                    <ActionButton
                      type="primary"
                      size="large"
                      block
                      onClick={() => handlePayload("load")}
                      style={{ background: "#1890ff", borderColor: "#1890ff" }}
                    >
                      {t("main.quick_mission.load")}
                    </ActionButton>
                  )}

                  {offloadValue ? (
                    <SelectedLocation>
                      {t("main.quick_mission.offload")}:{" "}
                      {offloadValue.locationId}
                    </SelectedLocation>
                  ) : (
                    <ActionButton
                      type="primary"
                      size="large"
                      block
                      onClick={() => handlePayload("offload")}
                      style={{ background: "#52c41a", borderColor: "#52c41a" }}
                    >
                      {t("main.quick_mission.offload")}
                    </ActionButton>
                  )}
                </>
              )}

              <Flex gap="middle" justify="space-between">
                <ActionButton size="large" block onClick={handleCancel} danger>
                  {t("utils.cancel")}
                </ActionButton>
                {(loadValue || offloadValue) && !startQuickSetting && (
                  <ActionButton
                    type="primary"
                    size="large"
                    block
                    onClick={handleSubmit}
                    style={{ background: "#faad14", borderColor: "#faad14" }}
                  >
                    {t("utils.submit")}
                  </ActionButton>
                )}
              </Flex>
            </Space>
          </Form>
        </StyledCard>
      </QuickMissionContainer>
    </>
  );
};

export default QuickMissionWebView;
