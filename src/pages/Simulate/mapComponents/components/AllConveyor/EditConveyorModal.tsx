import { FC, useEffect, useMemo } from "react";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import {
  Button,
  Form,
  InputNumber,
  message,
  Modal,
  Select,
  Switch,
  Typography,
} from "antd";

import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import client from "@/api/axiosClient";
import { useMutation } from "@tanstack/react-query";
import { EditConveyorConfig } from "@/pages/Simulate/utils/mapStatus";
import useLoc, { LocWithoutArr } from "@/api/useLoc";
import { useOneConveyorMockConfig } from "@/api/useOneConveyorMockConfig";

const { Title } = Typography;

const StyledForm = styled(Form)`
  padding: 12px 4px;

  .ant-form-item-label > label {
    font-weight: 500;
    color: #4b5563;
  }

  .ant-form-item {
    margin-bottom: 18px;
  }

  .ant-input-number {
    width: 100%;
  }
`;

const StyledTitle = styled(Title)`
  margin-bottom: 24px !important;
  color: #1677ff !important;
  text-align: center;
`;

const EditConveyorModal: FC = () => {
  const [openModal, setOpenModal] = useAtom(EditConveyorConfig);
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: loc } = useLoc(undefined);
  const { data: conveyor, isLoading } = useOneConveyorMockConfig(
    openModal?.stationId as string,
  );

  const viewAvailableOption = useMemo(() => {
    const info = (loc ?? []) as LocWithoutArr[];

    const options = info
      .filter(
        (v) =>
          (v.areaType === "Storage" || v.areaType === "Conveyor") &&
          v.locationId !== openModal?.stationId,
      )
      .sort((a, b) => Number(a.locationId) - Number(b.locationId))
      .map((v) => ({
        label: `${v.locationId} - ${v.areaType}`,
        value: v.id,
      }));

    return [{ label: t("conveyor.none"), value: "none" }, ...options];
  }, [loc, openModal?.stationId, t]);

  const updateMutation = useMutation({
    mutationFn: (data: {
      stationId: string;
      isEnable: boolean;
      isSpawnCargo: boolean;
      spawnTimeMs: number;
      activeShift: boolean;
      shiftTimeMs: number;
      shiftLocationId: string;
    }) => {
      return client.post("/api/peripherals/update-conveyor-mock-config", data);
    },
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      setOpenModal(null);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  useEffect(() => {
    if (openModal && conveyor) {
      form.setFieldsValue({
        ...conveyor,
      });
    }
  }, [openModal, form, conveyor]);

  const handleCancel = () => {
    setOpenModal(null);
  };

  const handleSubmit = async () => {
    if (!openModal) {
      messageApi.warning("The station not found");
      return;
    }

    const values = await form.validateFields();
    updateMutation.mutate({
      stationId: openModal.stationId,
      ...values,
    });
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={null}
        open={openModal !== null}
        onCancel={handleCancel}
        centered
        width={480}
        footer={
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={updateMutation.isLoading}
          >
            {t("utils.save")}
          </Button>
        }
      >
        {isLoading ? (
          "loading..."
        ) : (
          <StyledForm form={form} layout="vertical" size="large">
            {/* --------- Mock Config Section --------- */}
            <StyledTitle level={5}>{t("conveyor.mock_config")}</StyledTitle>

            <Form.Item
              label={t("conveyor.mock_enable")}
              name={"isEnable"}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>


            <Form.Item
              label={t("conveyor.mock_spawn_cargo")}
              name="isSpawnCargo"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label={t("conveyor.mock_spawn_time")}
              name="spawnTimeMs"
              rules={[
                { required: true, message: t("conveyor.error_spawn_time") },
              ]}
            >
              <InputNumber min={0} addonAfter="ms" />
            </Form.Item>

            <Form.Item
              label={t("conveyor.mock_active_shift")}
              name="activeShift"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label={t("conveyor.mock_shift_time")}
              name="shiftTimeMs"
              rules={[
                { required: true, message: t("conveyor.error_shift_time") },
              ]}
            >
              <InputNumber min={0} addonAfter="ms" />
            </Form.Item>

            <Form.Item
              label={t("conveyor.mock_shift_target")}
              name="shiftLocationId"
              rules={[
                { required: true, message: t("conveyor.error_shift_location") },
              ]}
            >
              <Select options={viewAvailableOption} />
            </Form.Item>
          </StyledForm>
        )}
      </Modal>
    </>
  );
};

export default EditConveyorModal;
