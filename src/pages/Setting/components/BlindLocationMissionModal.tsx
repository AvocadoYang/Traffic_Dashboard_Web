import { useAtom } from "jotai";
import React, { FC } from "react";
import { EBLM } from "../utils/settingJotai";
import { Form, Input, InputNumber, message, Modal, Select } from "antd";
import styled from "styled-components";
import { SettingOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useAllMissionTitles from "@/api/useMissionTitle";

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
  const { data: missionTitle } = useAllMissionTitles();

  const missionOptions = missionTitle
    ?.filter((g) =>
      g.MissionTitleBridgeCategory.some(
        (s) => s.Category?.tagName === "normal-mission",
      ),
    )
    .map((v) => {
      return {
        value: v.id,
        label: v.name,
      };
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
    console.log(values);
  };

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
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Input min={1} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              label={<FieldLabel>{t("blind_location.mission")}</FieldLabel>}
              name="missionTitleId"
              rules={[{ required: true, message: t("utils.required") }]}
            >
              <Select options={missionOptions} style={{ width: "100%" }} />
            </Form.Item>
          </IndustrialCard>
        </Form>
      </Modal>
    </>
  );
};

export default BlindLocationMissionModal;
