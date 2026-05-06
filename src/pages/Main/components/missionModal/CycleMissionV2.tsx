import useName from "@/api/useAmrName";
import useMap from "@/api/useMap";
import useAllMissionTitles from "@/api/useMissionTitle";
import { MissionPriority } from "@/types/mission";
import {
  Button,
  Flex,
  Form,
  Input,
  message,
  Modal,
  Radio,
  RadioChangeEvent,
  Select,
  Tooltip,
} from "antd";
import React, {
  Dispatch,
  FC,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import {
  RocketOutlined,
  SettingOutlined,
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { Cycle, Cycle_Mission } from "@/sockets/useCycleMission";

// Industrial Styled Components
const StyledModal = styled(Modal)`
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
`;

const SectionHeader = styled.div`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-left: 3px solid #fa8c16;
  padding: 8px 12px;
  margin-bottom: 12px;
  font-family: "Roboto Mono", monospace;
  color: #fa8c16;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);

  @media (min-width: 768px) {
    padding: 10px 16px;
    margin-bottom: 16px;
    font-size: 13px;
  }
`;

const FieldLabel = styled.div`
  color: #595959;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-family: "Roboto Mono", monospace;
  font-weight: 600;
  margin-bottom: 6px;

  @media (min-width: 768px) {
    font-size: 11px;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
`;

const PriorityRadioGroup = styled(Radio.Group)`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;

  @media (min-width: 768px) {
    gap: 8px;
  }

  .ant-radio-button-wrapper {
    height: 38px;
    line-height: 36px;
    border: 1px solid #d9d9d9;
    background: #fafafa;
    font-family: "Roboto Mono", monospace;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    font-weight: 600;
    transition: all 0.2s;
    text-align: center;
    border-radius: 0;
    padding: 0 4px;

    @media (min-width: 768px) {
      height: 44px;
      line-height: 42px;
      font-size: 11px;
      letter-spacing: 0.5px;
      padding: 0 12px;
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
  font-size: 10px;
  letter-spacing: 0.8px;
  height: 36px;
  font-weight: 600;
  border-radius: 0;

  @media (min-width: 768px) {
    font-size: 11px;
    letter-spacing: 1px;
    height: 40px;
  }

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

  &.success {
    background: #52c41a;
    border-color: #52c41a;
    color: #ffffff;

    &:hover {
      background: #73d13d;
      border-color: #73d13d;
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

const StyledInput = styled(Input)`
  border-radius: 0 !important;
  border: 1px solid #d9d9d9 !important;
  font-family: "Roboto Mono", monospace;
  height: 36px !important;

  @media (min-width: 768px) {
    height: 40px !important;
  }

  &:hover {
    border-color: #1890ff !important;
  }

  &:focus {
    border-color: #1890ff !important;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1) !important;
  }
`;

const CollectionDisplay = styled.div`
  background: #fafafa;
  border: 2px solid #d9d9d9;
  padding: 16px;
  min-height: 300px;
  max-height: 600px;
  overflow-y: auto;

  @media (min-width: 768px) {
    min-height: 400px;
  }
`;

const ContentLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;

  @media (min-width: 992px) {
    flex-direction: row;
    gap: 24px;
  }
`;

const LeftPanel = styled.div`
  flex: 1;

  @media (min-width: 992px) {
    flex: 0 0 45%;
  }
`;

const RightPanel = styled.div`
  flex: 1;

  @media (min-width: 992px) {
    flex: 0 0 55%;
  }
`;

const EmptyStateText = styled.div`
  color: #8c8c8c;
  font-size: 11px;
  text-align: center;
  padding: 20px;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  letter-spacing: 2px;
  border: 1px dashed #d9d9d9;
  background: #ffffff;

  @media (min-width: 768px) {
    font-size: 13px;
  }
`;

const MissionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-left: 3px solid #1890ff;
  margin-bottom: 8px;
  transition: all 0.2s ease;
  font-family: "Roboto Mono", monospace;

  @media (min-width: 768px) {
    gap: 12px;
    padding: 12px;
  }

  &:hover {
    background: #fafafa;
    border-left-color: #fa8c16;
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
`;

const MissionIndex = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 22px;
  padding: 0 6px;
  background: #e6f7ff;
  border: 1px solid #1890ff;
  color: #1890ff;
  font-size: 10px;
  font-weight: 700;
  font-family: "Roboto Mono", monospace;
  box-shadow: 0 1px 4px rgba(24, 144, 255, 0.15);

  @media (min-width: 768px) {
    min-width: 32px;
    height: 24px;
    padding: 0 8px;
    font-size: 11px;
  }
`;

const MissionContent = styled.div`
  flex: 1;
  font-size: 10px;
  color: #262626;

  @media (min-width: 768px) {
    font-size: 11px;
  }

  .mission-type {
    color: #1890ff;
    font-weight: 600;
    text-transform: uppercase;
    margin-bottom: 2px;
  }

  .mission-details {
    color: #595959;
    font-size: 9px;

    @media (min-width: 768px) {
      font-size: 10px;
    }
  }
`;

const ActionButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;

  button {
    background: transparent;
    border: none;
    color: #8c8c8c;
    padding: 2px;
    height: 18px;
    width: 22px;
    font-size: 10px;

    @media (min-width: 768px) {
      height: 20px;
      width: 24px;
      font-size: 12px;
    }

    &:hover:not(:disabled) {
      color: #1890ff;
    }

    &:disabled {
      color: #d9d9d9;
    }
  }
`;

const StatusIndicator = styled.div<{ hasItems: boolean }>`
  background: ${({ hasItems }) => (hasItems ? "#f6ffed" : "#fffbe6")};
  border: 2px solid ${({ hasItems }) => (hasItems ? "#52c41a" : "#faad14")};
  padding: 10px 12px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "Roboto Mono", monospace;
  color: ${({ hasItems }) => (hasItems ? "#52c41a" : "#faad14")};
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;

  @media (min-width: 768px) {
    padding: 12px 16px;
    gap: 12px;
    font-size: 12px;
    letter-spacing: 1px;
  }
`;

const CycleMissionV2: FC<{
  open: boolean;
  editCyc: Cycle | null;
  setEditCyc: Dispatch<SetStateAction<Cycle | null>>;
  setShowCycleMission: Dispatch<SetStateAction<boolean>>;
}> = ({ open, setShowCycleMission, editCyc, setEditCyc }) => {
  const { t } = useTranslation();
  const { data } = useAllMissionTitles();
  const { data: mData } = useMap();
  const { data: amrData } = useName();
  const [mt, setMt] = useState<"normal" | "dynamic" | "direct" | null>(null);
  const [placement, SetPlacement] = useState<string>(`F`);
  const [form] = Form.useForm();
  const [cForm] = Form.useForm();
  const [collect, setCollect] = useState<Cycle_Mission[]>([]);
  const [messageApi, contextHolder] = message.useMessage();

  const placementChange = (e: RadioChangeEvent) => {
    SetPlacement(e.target.value);
  };

  const AmrOption: { value: string; label: string }[] | undefined =
    useMemo(() => {
      let options;
      if (amrData?.isSim) {
        options = amrData.amrs
          .filter((a) => a.isReal === false)
          .map((m) => ({ label: m.amrId, value: m.amrId }));
      } else {
        options = amrData?.amrs
          .filter((a) => a.isReal === true)
          .map((m) => ({ label: m.amrId, value: m.amrId }));
      }
      return options
        ? [...options, { value: "none", label: t("utils.random") }]
        : undefined;
    }, [amrData, t]);

  const normalMissionOption = data?.map((x) => ({
    value: x.id,
    label: x.name,
  }));

  const directMissionOption = mData?.locations.map((d) => ({
    value: d.locationId,
    label: `${d.locationId} : ${d.areaType}`,
  }));

  const handleAdd = () => {
    const formValue = form.getFieldsValue() as Cycle_Mission;

    if (!formValue.missionType) {
      messageApi.error(t("mission.cycle_mission.mission_type_required"));
      return;
    }

    if (!formValue.amrId) {
      messageApi.error(t("mission.cycle_mission.amr_required"));
      return;
    }

    if (!formValue.priority) {
      messageApi.error(t("mission.cycle_mission.priority_required"));
      return;
    }

    if (formValue.missionType === "direct") {
      if (!formValue.dirEptControl) {
        messageApi.error(t("mission.cycle_mission.dir_control_required"));
        return;
      }
      if (!formValue.dirEpt) {
        messageApi.error(t("mission.cycle_mission.dir_endpoint_required"));
        return;
      }
    }
    if (formValue.missionType === "dynamic") {
      if (!formValue.eptS) {
        messageApi.error(t("mission.cycle_mission.start_point_required"));
        return;
      }
      if (!formValue.eptD) {
        messageApi.error(t("mission.cycle_mission.end_point_required"));
        return;
      }
    }
    if (formValue.missionType === "normal") {
      if (!formValue.missionId) {
        messageApi.error(t("mission.cycle_mission.mission_required"));
        return;
      }
    }

    setCollect((prev) => [...prev, formValue]);
    form.resetFields();
    setMt(null);
  };

  const handleRemove = (index: number) => {
    setCollect((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setCollect((prev) => {
      const newCollect = [...prev];
      [newCollect[index - 1], newCollect[index]] = [
        newCollect[index],
        newCollect[index - 1],
      ];
      return newCollect;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === collect.length - 1) return;
    setCollect((prev) => {
      const newCollect = [...prev];
      [newCollect[index], newCollect[index + 1]] = [
        newCollect[index + 1],
        newCollect[index],
      ];
      return newCollect;
    });
  };

  const getMissionDisplay = (mission: Cycle_Mission) => {
    if (mission.missionType === "normal") {
      const missionName = normalMissionOption?.find(
        (m) => m.value === mission.missionId
      )?.label;
      return `${missionName || mission.missionId}`;
    } else if (mission.missionType === "dynamic") {
      return `${mission.eptS} → ${mission.eptD}`;
    } else if (mission.missionType === "direct") {
      return `${mission.dirEpt} [${mission.dirEptControl}]`;
    }
    return "";
  };

  const getPriorityLabel = (priority: MissionPriority) => {
    const labels = {
      [MissionPriority.CRITICAL]: "CRITICAL",
      [MissionPriority.PIVOTAL]: "PIVOTAL",
      [MissionPriority.NORMAL]: "NORMAL",
      [MissionPriority.TRIVIAL]: "TRIVIAL",
    };
    return labels[priority] || "NORMAL";
  };

  const submitMutation = useMutation({
    mutationFn: (cycleName: string) => {
      return client.post("api/missions/add-cycle", {
        data: collect,
        cycleName,
      });
    },
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      cForm.resetFields();
      setCollect([]);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const editMutation = useMutation({
    mutationFn: (data: { cycleName: string; id: string }) => {
      return client.post("api/missions/edit-cycle", {
        data: collect,
        cycleName: data.cycleName,
        id: data.id,
      });
    },
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      cForm.resetFields();
      setCollect([]);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleSub = () => {
    const cycleName = cForm.getFieldValue("cycleName") as string;

    if (!editCyc) {
      submitMutation.mutate(cycleName);
    } else {
      editMutation.mutate({
        cycleName,
        id: editCyc.Id,
      });
    }
  };

  const handleClose = () => {
    setShowCycleMission(false);
    setCollect([]);
    setEditCyc(null);
  };

  useEffect(() => {
    if (!editCyc) return;

    cForm.setFieldValue("cycleName", editCyc.Name);
    setCollect(editCyc.Payload);

    if (editCyc.Payload?.length > 0) {
      setMt(editCyc.Payload[0].missionType as any);
    }
  }, [editCyc]);

  return (
    <>
      {contextHolder}
      <StyledModal
        open={open}
        style={{ top: 5, height: "90vh" }}
        title={
          <>
            <RocketOutlined />
            {t("main.card_name.cycle_mission") || "CYCLE MISSION"}
          </>
        }
        onCancel={handleClose}
        width={1400}
        footer={
          <Flex gap="middle" justify="flex-end">
            <IndustrialButton onClick={handleClose}>
              {t("utils.cancel")}
            </IndustrialButton>
            <IndustrialButton
              className="primary"
              disabled={collect.length === 0}
              onClick={() => handleSub()}
            >
              {t("utils.submit")}
            </IndustrialButton>
          </Flex>
        }
      >
        <ContentLayout>
          {/* Left Panel - Mission Configuration */}
          <LeftPanel>
            <Form form={form} layout="vertical">
              <SectionHeader>
                <SettingOutlined />
                [01] {t("mission.cycle_mission.config")}
              </SectionHeader>

              <Form.Item
                label={
                  <FieldLabel>{t("mission.cycle_mission.type")}</FieldLabel>
                }
                name="missionType"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <StyledSelect
                  options={[
                    {
                      value: "normal",
                      label: t("mission.cycle_mission.mission"),
                    },
                    {
                      value: "dynamic",
                      label: t("mission.cycle_mission.dynamic_mission"),
                    },
                    {
                      value: "direct",
                      label: t("mission.cycle_mission.direct_mission"),
                    },
                  ]}
                  onChange={(v) => setMt(v as any)}
                  placeholder={t("mission.cycle_mission.select_mission_type")}
                />
              </Form.Item>

              <Form.Item
                label={
                  <FieldLabel>{t("mission.cycle_mission.car")}</FieldLabel>
                }
                name="amrId"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <StyledSelect
                  options={AmrOption}
                  placeholder={t("mission.cycle_mission.select_amr")}
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

              {/* Mission Type Specific Fields */}
              {mt === "direct" && (
                <>
                  <Form.Item
                    label={
                      <FieldLabel>
                        {t("mission.cycle_mission.direct_location")}
                      </FieldLabel>
                    }
                    name="dirEpt"
                    rules={[{ required: true, message: t("utils.required") }]}
                  >
                    <StyledSelect
                      options={directMissionOption}
                      placeholder={t("mission.cycle_mission.select_location")}
                    />
                  </Form.Item>
                  <Form.Item
                    label={<FieldLabel>{t("utils.direction")}</FieldLabel>}
                    name="dirEptControl"
                    rules={[{ required: true, message: t("utils.required") }]}
                  >
                    <Radio.Group value={placement} onChange={placementChange}>
                      <Radio.Button value="F">
                        {t("car_control_translate.F")}
                      </Radio.Button>
                      <Radio.Button value="B">
                        {t("car_control_translate.B")}
                      </Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </>
              )}

              {mt === "dynamic" && (
                <>
                  <Form.Item
                    label={
                      <FieldLabel>
                        {t("mission.cycle_mission.start_point")}
                      </FieldLabel>
                    }
                    name="eptS"
                    rules={[{ required: true, message: t("utils.required") }]}
                  >
                    <StyledInput
                      placeholder={t("mission.cycle_mission.enter_start_point")}
                    />
                  </Form.Item>
                  <Form.Item
                    label={
                      <FieldLabel>
                        {t("mission.cycle_mission.end_point")}
                      </FieldLabel>
                    }
                    name="eptD"
                    rules={[{ required: true, message: t("utils.required") }]}
                  >
                    <StyledInput
                      placeholder={t("mission.cycle_mission.enter_end_point")}
                    />
                  </Form.Item>
                </>
              )}

              {mt === "normal" && (
                <Form.Item
                  label={
                    <FieldLabel>
                      {t("mission.cycle_mission.mission")}
                    </FieldLabel>
                  }
                  name="missionId"
                  rules={[{ required: true, message: t("utils.required") }]}
                >
                  <StyledSelect
                    options={normalMissionOption}
                    placeholder={t("mission.cycle_mission.select_mission")}
                  />
                </Form.Item>
              )}

              <Flex justify="flex-end" style={{ marginTop: 16 }}>
                <IndustrialButton
                  className="success"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                >
                  {t("mission.cycle_mission.add_to_queue")}
                </IndustrialButton>
              </Flex>
            </Form>
          </LeftPanel>

          {/* Right Panel - Mission Queue */}
          <RightPanel>
            <SectionHeader>
              <UnorderedListOutlined />
              [02] {t("mission.cycle_mission.queue")}
            </SectionHeader>

            <Form layout="vertical" form={cForm}>
              <Form.Item
                label={
                  <FieldLabel>
                    {t("mission.cycle_mission.cycle_name")}
                  </FieldLabel>
                }
                name="cycleName"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <StyledInput
                  placeholder={t("mission.cycle_mission.enter_cycle_name")}
                />
              </Form.Item>
            </Form>

            <CollectionDisplay>
              {collect.length === 0 ? (
                <EmptyStateText>
                  {t("mission.cycle_mission.empty_queue")}
                </EmptyStateText>
              ) : (
                collect.map((mission, index) => (
                  <MissionItem key={index}>
                    <MissionIndex>#{index + 1}</MissionIndex>
                    <MissionContent>
                      <div className="mission-type">{mission.missionType}</div>
                      <div className="mission-details">
                        AMR: {mission.amrId} | Priority:{" "}
                        {getPriorityLabel(mission.priority)} |{" "}
                        {getMissionDisplay(mission)}
                      </div>
                    </MissionContent>

                    <ActionButtonGroup>
                      <Tooltip title={t("mission.cycle_mission.move_up")}>
                        <Button
                          type="text"
                          size="small"
                          disabled={index === 0}
                          icon={<ArrowUpOutlined />}
                          onClick={() => handleMoveUp(index)}
                        />
                      </Tooltip>
                      <Tooltip title={t("mission.cycle_mission.move_down")}>
                        <Button
                          type="text"
                          size="small"
                          disabled={index === collect.length - 1}
                          icon={<ArrowDownOutlined />}
                          onClick={() => handleMoveDown(index)}
                        />
                      </Tooltip>
                    </ActionButtonGroup>

                    <Tooltip title={t("mission.cycle_mission.remove")}>
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemove(index)}
                        style={{ color: "#ff4d4f" }}
                      />
                    </Tooltip>
                  </MissionItem>
                ))
              )}
            </CollectionDisplay>
          </RightPanel>
        </ContentLayout>
      </StyledModal>
    </>
  );
};

export default CycleMissionV2;
