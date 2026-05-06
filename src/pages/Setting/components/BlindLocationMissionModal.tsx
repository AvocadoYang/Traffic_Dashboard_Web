import { useAtom } from "jotai";
import React, { FC, useState } from "react";
import { EBLM } from "../utils/settingJotai";
import { Form, Input, message, Modal } from "antd";
import styled from "styled-components";
import { SettingOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
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

const BlindLocationMissionModal: FC<{}> = () => {
  const [open, setOpen] = useAtom(EBLM);
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [placeholder, setPlaceholder] = useState("");
  const queryClient = useQueryClient();

  const { data: defaultData, refetch } = useQuery({
    queryKey: ["blind-mission-location", open.locationId],
    queryFn: () =>
      client
        .get(
          `/api/setting/blind-mission-location?locationId=${open.locationId}`,
        )
        .then((res) => res.data),
    enabled: !!open.isOpen && !!open.locationId, // 只有當 modal 開啟且有 ID 時才查詢
  });

  const saveMutation = useMutation({
    mutationFn: (payload: {
      locationId: string;
      missionTitleId: string;
      name: string;
    }) => {
      return client.post("api/setting/blind-location-mission", payload);
    },
    onSuccess: async () => {
      messageApi.success(t("utils.success"));
      queryClient.refetchQueries({ queryKey: ["all-blind-missions"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleOk = () => {
    handleSave();
    setOpen({ locationId: null, isOpen: false });
  };

  const handleCancel = () => {
    setOpen({ locationId: null, isOpen: false });
  };

  const handleSave = () => {
    const values = form.getFieldsValue() as {
      missionTitleId: string;
      name: string;
    };
    if (open.locationId === null) {
      messageApi.error("location error");
      return;
    }
    saveMutation.mutate({
      ...values,
      locationId: open.locationId,
    });
  };

  React.useEffect(() => {
    if (defaultData) {
      form.setFieldsValue({
        name: defaultData.name,
        missionTitleId: defaultData.missionTitleId,
      });
      setPlaceholder(defaultData.missionName);
    } else {
      // 如果 modal 關閉或沒有資料，可以選擇清除表單
      form.resetFields();
    }
  }, [defaultData, open.isOpen, form]);

  return (
    <>
      {contextHolder}
      <Modal
        title={t("blind_location.title")}
        closable={{ "aria-label": "Custom Close Button" }}
        open={open.isOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form form={form}>
          <IndustrialCard>
            <SectionHeader>
              <SettingOutlined />[{open.locationId}]{" "}
              {t("blind_location.locationId")}{" "}
            </SectionHeader>

            <Form.Item
              label={
                <FieldLabel>{t("blind_location.location_name")}</FieldLabel>
              }
              name="name"
              rules={[
                { required: true, message: t("utils.required") },
                {
                  pattern: /^\S+$/,
                  message: "肏你媽不可以空白健 懂沒?",
                },
              ]}
            >
              <Input min={1} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              label={<FieldLabel>{t("blind_location.mission")}</FieldLabel>}
              name="missionTitleId"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <MissionTableSelect
                onSelect={(record) => {
                  form.setFieldValue("missionTitleId", record.id);
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

export default BlindLocationMissionModal;
