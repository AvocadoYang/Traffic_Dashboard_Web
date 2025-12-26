import { Button, Flex, Form, message, Modal, Radio, Select } from "antd";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { OpenAssignMission } from "../../global/jotai";
import useAllMissionTitles from "@/api/useMissionTitle";
import { useEffect, useMemo, useState } from "react";
import useName from "@/api/useAmrName";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import {
  ReloadOutlined,
  RocketOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import styled from "styled-components";
import MissionTableSelect from "./MissionTableSelect";

enum MissionPriority {
  TRIVIAL,
  NORMAL,
  PIVOTAL,
  CRITICAL,
}

type MissionFrom = {
  amrId: string | null;
  titleId: string;
  priority: MissionPriority;
};

// Industrial Modal Styling
const IndustrialModal = styled(Modal)`
  .ant-modal-content {
    background: #ffffff;
    border: 2px solid #d9d9d9;
    border-radius: 0;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .ant-modal-header {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    padding: 16px 24px;
    position: relative;
    border-radius: 0;

    &::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: #1890ff;
    }
  }

  .ant-modal-title {
    font-family: "Roboto Mono", monospace;
    font-size: 16px;
    font-weight: 700;
    color: #1890ff;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .ant-modal-body {
    padding: 24px;
    background: #ffffff;
  }

  .ant-modal-footer {
    background: #fafafa;
    border-top: 2px solid #d9d9d9;
    padding: 16px 24px;
    border-radius: 0;
  }
`;

const SectionDivider = styled.div`
  height: 2px;
  background: repeating-linear-gradient(
    90deg,
    #d9d9d9 0,
    #d9d9d9 10px,
    transparent 10px,
    transparent 20px
  );
  margin: 24px 0;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    background: #1890ff;
    border: 2px solid #ffffff;
    box-shadow: 0 0 0 2px #d9d9d9;
  }
`;

const FieldLabel = styled.div`
  color: #595959;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: "Roboto Mono", monospace;
  font-weight: 600;
  margin-bottom: 8px;
`;

const FormSection = styled.div`
  margin-bottom: 20px;
`;

const PriorityRadioGroup = styled(Radio.Group)`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  .ant-radio-button-wrapper {
    height: 44px;
    line-height: 42px;
    border: 1px solid #d9d9d9;
    background: #fafafa;
    font-family: "Roboto Mono", monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
    transition: all 0.2s;
    text-align: center;
    border-radius: 0;

    &:first-child {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }

    &:last-child {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }

    &:hover {
      background: #f5f5f5;
      border-color: #bfbfbf;
    }

    &.ant-radio-button-wrapper-checked {
      background: #e6f7ff;
      border-color: #1890ff;
      color: #1890ff;
      box-shadow: inset 0 0 20px rgba(24, 144, 255, 0.08);
      position: relative;

      &::before {
        background: #1890ff;
      }

      &::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: #1890ff;
      }
    }
  }
`;

const IndustrialButton = styled(Button)`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #1890ff;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 40px;
  font-weight: 600;
  border-radius: 0;

  &:hover {
    background: #f0f5ff;
    border-color: #1890ff;
    color: #1890ff;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
  }

  &.primary {
    background: #1890ff;
    border-color: #1890ff;
    color: #ffffff;

    &:hover {
      background: #40a9ff;
      border-color: #40a9ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  }

  &:disabled {
    background: #f5f5f5;
    border-color: #d9d9d9;
    color: #bfbfbf;
  }
`;

const StyledSelect = styled(Select)`
  .ant-select-selector {
    border-radius: 0 !important;
    border: 1px solid #d9d9d9 !important;
    font-family: "Roboto Mono", monospace;

    &:hover {
      border-color: #1890ff !important;
    }
  }

  &.ant-select-focused .ant-select-selector {
    border-color: #1890ff !important;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1) !important;
  }
`;

const ActionBar = styled(Flex)`
  padding-top: 16px;
  border-top: 1px dashed #d9d9d9;
  margin-top: 24px;
`;

const DialogMission = () => {
  const { t } = useTranslation();
  const [missionForm] = Form.useForm();
  const { refetch: refetchMissions } = useAllMissionTitles();
  const { data: name, refetch: refetchAgv } = useName();
  const [messageApi, contextHolder] = message.useMessage();

  const [openDialogMission, setOpenDialogMission] = useAtom(OpenAssignMission);
  const [, setAmrGenre] = useState<string | null>(null);

  const reload = () => {
    refetchAgv();
    refetchMissions();
    void messageApi.success("reload");
  };

  const AmrOption: { value: string; label: string }[] | undefined =
    useMemo(() => {
      let options;
      if (name?.isSim) {
        options = name.amrs
          .filter((a) => a.isReal === false)
          .map((m) => ({ label: m.amrId, value: m.amrId }));
      } else {
        options = name?.amrs
          .filter((a) => a.isReal === true)
          .map((m) => ({ label: m.amrId, value: m.amrId }));
      }
      return options
        ? [...options, { value: "none", label: t("utils.random") }]
        : undefined;
    }, [name, t]);

  const canSubmitMutation = useMutation({
    mutationFn: (payload: MissionFrom) => {
      return client.post("api/missions/dialog-mission", payload, {
        headers: { authorization: `Bearer ${localStorage.getItem("_KMT")}` },
      });
    },
    onSuccess: (resData) => {
      const errorMessage = resData?.data.message;
      if (!errorMessage || errorMessage === "success") {
        void messageApi.success(t("utils.success"));
        setOpenDialogMission(false);
        return;
      }
      const splitErrorMessage = errorMessage.split(" ");
      if (splitErrorMessage[0] === "[CustomError]") {
        void messageApi.error("無法排除 聯絡FAE工程師");
      }
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const submit = () => {
    const payload = missionForm.getFieldsValue() as MissionFrom;
    const { titleId, priority } = payload;
    if (!titleId || priority === undefined || priority === null) {
      void messageApi.error("尚未完成選項");
      return;
    }

    const newPayload = {
      ...payload,
      amrId: payload.amrId,
    };

    canSubmitMutation.mutate(newPayload);
  };

  const handleCancel = () => {
    setOpenDialogMission(false);
  };

  useEffect(() => {
    if (!openDialogMission) return;
    missionForm.setFieldValue("priority", MissionPriority.PIVOTAL);
  }, [openDialogMission]);

  return (
    <IndustrialModal
      title={
        <>
          <RocketOutlined />
          {t("main.card_name.new_mission")}
        </>
      }
      open={openDialogMission}
      width={700}
      footer={
        <Flex gap="middle" justify="flex-end">
          <IndustrialButton onClick={handleCancel}>
            {t("utils.cancel")}
          </IndustrialButton>
          <IndustrialButton
            className="primary"
            onClick={submit}
            loading={canSubmitMutation.isLoading}
          >
            {canSubmitMutation.isLoading ? "DEPLOYING..." : t("utils.submit")}
          </IndustrialButton>
        </Flex>
      }
      onCancel={handleCancel}
    >
      {contextHolder}
      <Form form={missionForm} layout="vertical" size="large">
        {/* AMR Selection */}
        <FormSection>
          <FieldLabel>
            <SettingOutlined style={{ marginRight: 6 }} />
            [01] {t("mission.cycle_mission.car")}
          </FieldLabel>
          <Form.Item name="amrId" style={{ marginBottom: 0 }}>
            <StyledSelect
              options={AmrOption}
              onChange={(v: string) => setAmrGenre(v)}
              placeholder="Select an AMR"
              onMouseDown={(e) => e.preventDefault()}
              onPopupScroll={(e) => {
                e.stopPropagation();
              }}
              onOpenChange={(open) => {
                if (open) {
                  document.body.style.overflow = "hidden";
                } else {
                  document.body.style.overflow = "auto";
                }
              }}
            />
          </Form.Item>
        </FormSection>

        <SectionDivider />

        {/* Priority Selection */}
        <FormSection>
          <FieldLabel>
            <SettingOutlined style={{ marginRight: 6 }} />
            [02] {t("main.mission_modal.dialog_mission.task_priority")}
          </FieldLabel>
          <Form.Item name="priority" shouldUpdate style={{ marginBottom: 0 }}>
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
        </FormSection>

        <SectionDivider />

        {/* Mission Selection */}
        <FormSection>
          <FieldLabel>
            <SettingOutlined style={{ marginRight: 6 }} />
            [03] {t("toolbar.mission.mission")}
          </FieldLabel>
          <Form.Item name="titleId" style={{ marginBottom: 0 }}>
            <MissionTableSelect
              onSelect={(record) => {
                missionForm.setFieldValue("titleId", record.id);
                void messageApi.success(`Selected mission: ${record.name}`);
              }}
              placeholder="Click to choose mission"
            />
          </Form.Item>
        </FormSection>

        <ActionBar align="center" justify="center">
          <IndustrialButton icon={<ReloadOutlined />} onClick={() => reload()}>
            {t("main.mission_modal.dialog_mission.reload")}
          </IndustrialButton>
        </ActionBar>
      </Form>
    </IndustrialModal>
  );
};

export default DialogMission;
