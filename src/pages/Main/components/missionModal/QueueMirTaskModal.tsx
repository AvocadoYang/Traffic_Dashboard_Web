import { Flex, Form, message, Modal, Select } from "antd";
import { useAtom } from "jotai";
import React, { useMemo } from "react";
import { OpenQueueMirTask } from "../../global/jotai";
import useAllMirMission from "@/api/useAllMirMission";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { RocketOutlined, SettingOutlined } from "@ant-design/icons";
import styled from "styled-components";
import MirMissionTableSelect from "./MirMissionTableSelect";

interface QueueMirTaskFormValues {
  amrId: string;
  missionName: string;
}

// Industrial Modal Styling with RWD — mirrors DialogMission.tsx so both
// "dispatch a mission" flows share the exact same look and feel.
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
    padding: 12px 16px;
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

    @media (min-width: 768px) {
      padding: 16px 24px;
    }
  }

  .ant-modal-title {
    font-family: "Roboto Mono", monospace;
    font-size: 13px;
    font-weight: 700;
    color: #1890ff;
    text-transform: uppercase;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 8px;

    @media (min-width: 768px) {
      font-size: 16px;
      letter-spacing: 1.5px;
      gap: 12px;
    }
  }

  .ant-modal-body {
    padding: 16px;
    background: #ffffff;
    max-height: calc(100vh - 200px);
    overflow-y: auto;

    @media (min-width: 768px) {
      padding: 24px;
      max-height: none;
      overflow-y: visible;
    }
  }

  .ant-modal-footer {
    background: #fafafa;
    border-top: 2px solid #d9d9d9;
    padding: 12px 16px;
    border-radius: 0;

    @media (min-width: 768px) {
      padding: 16px 24px;
    }
  }

  .ant-modal-close {
    top: 12px;
    right: 12px;
    width: 40px;
    height: 40px;

    @media (min-width: 768px) {
      top: 16px;
      right: 16px;
    }

    .ant-modal-close-x {
      width: 40px;
      height: 40px;
      line-height: 40px;
      font-size: 18px;
    }
  }

  @media (max-width: 576px) {
    max-width: 100vw !important;
    margin: 0;
    top: 0;
    padding: 0;

    .ant-modal-content {
      border-radius: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .ant-modal-body {
      flex: 1;
      overflow-y: auto;
    }
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
  margin: 16px 0;
  position: relative;

  @media (min-width: 768px) {
    margin: 24px 0;
  }

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
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-family: "Roboto Mono", monospace;
  font-weight: 600;
  margin-bottom: 8px;

  @media (min-width: 768px) {
    font-size: 11px;
    letter-spacing: 1px;
  }
`;

const FormSection = styled.div`
  margin-bottom: 16px;

  @media (min-width: 768px) {
    margin-bottom: 20px;
  }
`;

const IndustrialButton = styled.button`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #1890ff;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.8px;
  height: 36px;
  font-weight: 600;
  border-radius: 0;
  padding: 0 12px;
  cursor: pointer;

  @media (min-width: 768px) {
    font-size: 11px;
    letter-spacing: 1px;
    height: 40px;
    padding: 0 16px;
  }

  &:hover:not(:disabled) {
    background: #f0f5ff;
    border-color: #1890ff;
    color: #1890ff;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
  }

  &.primary {
    background: #1890ff;
    border-color: #1890ff;
    color: #ffffff;

    &:hover:not(:disabled) {
      background: #40a9ff;
      border-color: #40a9ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  }

  &:disabled {
    background: #f5f5f5;
    border-color: #d9d9d9;
    color: #bfbfbf;
    cursor: not-allowed;
  }
`;

const StyledSelect = styled(Select)`
  .ant-select-selector {
    border-radius: 0 !important;
    border: 1px solid #d9d9d9 !important;
    font-family: "Roboto Mono", monospace;
    min-height: 36px !important;

    @media (min-width: 768px) {
      min-height: 40px !important;
    }

    &:hover {
      border-color: #1890ff !important;
    }
  }

  &.ant-select-focused .ant-select-selector {
    border-color: #1890ff !important;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1) !important;
  }
`;

const ResponsiveFooter = styled(Flex)`
  gap: 8px;
  flex-wrap: wrap;

  @media (min-width: 768px) {
    gap: 12px;
    flex-wrap: nowrap;
  }

  button {
    flex: 1;
    min-width: 100px;

    @media (min-width: 768px) {
      flex: initial;
    }
  }
`;

const QueueMirTaskModal = () => {
  const [open, setOpen] = useAtom(OpenQueueMirTask);
  const { data, isLoading } = useAllMirMission();
  const [form] = Form.useForm<QueueMirTaskFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const amrId = Form.useWatch("amrId", form);
  const missionName = Form.useWatch("missionName", form);

  const amrOptions = useMemo(() => {
    const names = new Set<string>();
    data?.forEach((row) =>
      Object.keys(row.robots).forEach((name) => names.add(name)),
    );
    return [...names].sort().map((name) => ({ value: name, label: name }));
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload: QueueMirTaskFormValues) =>
      client.post("api/setting/queue-mir-task", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void queryClient.invalidateQueries({ queryKey: ["all-mir-mission"] });
      form.resetFields();
      setOpen(false);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const submit = async () => {
    const values = await form.validateFields();
    mutation.mutate(values);
  };

  const handleCancel = () => {
    form.resetFields();
    setOpen(false);
  };

  return (
    <IndustrialModal
      title={
        <>
          <RocketOutlined />
          {t("main.queue_mir_task_modal.title")}
        </>
      }
      open={open}
      width={600}
      style={{ top: 10 }}
      centered
      footer={
        <ResponsiveFooter justify="flex-end">
          <IndustrialButton onClick={handleCancel}>
            {t("utils.cancel")}
          </IndustrialButton>
          <IndustrialButton
            className="primary"
            onClick={submit}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "DEPLOYING..." : t("utils.submit")}
          </IndustrialButton>
        </ResponsiveFooter>
      }
      onCancel={handleCancel}
      destroyOnHidden
    >
      {contextHolder}
      <Form form={form} layout="vertical" size="large">
        {/* AMR Selection */}
        <FormSection>
          <FieldLabel>
            <SettingOutlined style={{ marginRight: 6 }} />
            [01] {t("main.queue_mir_task_modal.amr")}
          </FieldLabel>
          <Form.Item
            name="amrId"
            style={{ marginBottom: 0 }}
            rules={[
              {
                required: true,
                message: t("main.queue_mir_task_modal.select_amr_required"),
              },
            ]}
          >
            <StyledSelect
              options={amrOptions}
              loading={isLoading}
              placeholder={t("main.queue_mir_task_modal.select_amr")}
              onChange={() => form.setFieldValue("missionName", undefined)}
              onMouseDown={(e) => e.preventDefault()}
              onPopupScroll={(e) => {
                e.stopPropagation();
              }}
              onOpenChange={(isOpen) => {
                document.body.style.overflow = isOpen ? "hidden" : "auto";
              }}
            />
          </Form.Item>
        </FormSection>

        <SectionDivider />

        {/* Mission Selection */}
        <FormSection>
          <FieldLabel>
            <SettingOutlined style={{ marginRight: 6 }} />
            [02] {t("main.queue_mir_task_modal.mission_name")}
          </FieldLabel>
          <Form.Item
            name="missionName"
            style={{ marginBottom: 0 }}
            rules={[
              {
                required: true,
                message: t("main.queue_mir_task_modal.select_mission_required"),
              },
            ]}
          >
            <MirMissionTableSelect
              amrId={amrId}
              value={missionName}
              onSelect={(name) => {
                form.setFieldValue("missionName", name);
                void messageApi.success(`Selected mission: ${name}`);
              }}
            />
          </Form.Item>
        </FormSection>
      </Form>
    </IndustrialModal>
  );
};

export default QueueMirTaskModal;
