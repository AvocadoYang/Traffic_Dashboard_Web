import { FC, useMemo, useState } from "react";
import { Form, Input, Modal, Select, message } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import { SettingOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useBlindMission from "@/api/useBlindMission";
import MissionTableSelect from "@/pages/Main/components/missionModal/MissionTableSelect";

const IndustrialCard = styled.div`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  margin-bottom: 20px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

  &:hover {
    border-color: #bfbfbf;
  }
`;

const SectionHeader = styled.div`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-left: 3px solid #fa8c16;
  padding: 10px 16px;
  margin-bottom: 16px;
  font-family: "Roboto Mono", monospace;
  color: #fa8c16;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
`;

const FieldLabel = styled.span`
  color: #595959;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: "Roboto Mono", monospace;
`;

const AddBlindLocationMissionModal: FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [placeholder, setPlaceholder] = useState("");
  const queryClient = useQueryClient();
  const { data: blindMissions } = useBlindMission();

  // 只列出還沒綁過任務的地點,已經綁過的請用表格裡的 EDIT 改
  const unboundLocationOptions = useMemo(
    () =>
      (blindMissions ?? [])
        .filter((item) => !item.bind_mission)
        .map((item) => ({ label: item.locationId, value: item.locationId })),
    [blindMissions],
  );

  const saveMutation = useMutation({
    mutationFn: (payload: {
      locationId: string;
      missionTitleId: string;
      name: string;
    }) => client.post("api/setting/blind-location-mission", payload),
    onSuccess: async () => {
      void messageApi.success(t("utils.success"));
      await queryClient.refetchQueries({ queryKey: ["all-blind-missions"] });
      form.resetFields();
      setPlaceholder("");
      onClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        saveMutation.mutate(values);
      })
      .catch(() => {});
  };

  const handleCancel = () => {
    form.resetFields();
    setPlaceholder("");
    onClose();
  };

  return (
    <>
      {contextHolder}
      <Modal
        title="新增綁定地點"
        open={open}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={saveMutation.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <IndustrialCard>
            <SectionHeader>
              <SettingOutlined />
              新增綁定地點
            </SectionHeader>

            <Form.Item
              label={<FieldLabel>地點</FieldLabel>}
              name="locationId"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Select
                options={unboundLocationOptions}
                showSearch
                placeholder="選擇一個尚未綁定的地點"
              />
            </Form.Item>

            <Form.Item
              label={
                <FieldLabel>{t("blind_location.location_name")}</FieldLabel>
              }
              name="name"
              rules={[
                { required: true, message: t("utils.required") },
                {
                  pattern: /^\S+$/,
                  message: t("utils.required"),
                },
              ]}
            >
              <Input style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              label={<FieldLabel>{t("blind_location.mission")}</FieldLabel>}
              name="missionTitleId"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <MissionTableSelect
                onSelect={(record) => {
                  form.setFieldValue("missionTitleId", record.id);
                  setPlaceholder(record.name);
                  void messageApi.success(`Selected mission: ${record.name}`);
                }}
                placeholder={placeholder}
              />
            </Form.Item>
          </IndustrialCard>
        </Form>
      </Modal>
    </>
  );
};

export default AddBlindLocationMissionModal;
