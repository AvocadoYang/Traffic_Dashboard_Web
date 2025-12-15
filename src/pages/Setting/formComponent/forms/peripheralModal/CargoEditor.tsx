import useCustomCargoFormat from "@/api/useCustomCargoFormat";
import { Button, Form, Input, message, Modal, Select, Tooltip } from "antd";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import {
  QuestionCircleOutlined,
  ToolOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import ReactJsonView from "@uiw/react-json-view";
import client from "@/api/axiosClient";
import { useMutation } from "@tanstack/react-query";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";
import { Cargo, PeripheralTypes } from "@/types/peripheral";
import { useAtom, useAtomValue } from "jotai";
import { IsEditPeripheralModal, IsOpenCargoEditorModal } from "./jotai";

const IndustrialModal = styled(Modal)`
  .ant-modal-content {
    background: #f5f5f5;
    font-family: "Roboto Mono", monospace;
  }

  .ant-modal-header {
    background: #ffffff;
    border-bottom: 2px solid #1890ff;
    padding: 16px 24px;
  }

  .ant-modal-title {
    color: #1890ff;
    font-family: "Roboto Mono", monospace;
    font-weight: 600;
    font-size: 13px;

    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ant-modal-body {
    padding: 24px;
    background: #f5f5f5;
  }

  .ant-form-item-label > label {
    font-family: "Roboto Mono", monospace;
    font-size: 11px;

    letter-spacing: 1px;
    color: #595959;
    font-weight: 600;
  }

  .ant-input,
  .ant-select-selector,
  .ant-input-number {
    font-family: "Roboto Mono", monospace;
    border: 1px solid #d9d9d9;

    &:hover {
      border-color: #1890ff;
    }

    &:focus {
      border-color: #1890ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
    }
  }
`;

const Wrapper = styled.div`
  max-height: 72vh;
  overflow-y: auto;
  padding-right: 8px;
  font-family: "Roboto Mono", monospace;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #fafafa;
  }

  &::-webkit-scrollbar-thumb {
    background: #d9d9d9;
    border-radius: 0;

    &:hover {
      background: #bfbfbf;
    }
  }
`;

const CargoCard = styled.div`
  margin-bottom: 20px;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-left: 3px solid #1890ff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;

  &:hover {
    border-left-color: #fa8c16;
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
`;

const CardHeader = styled.div`
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
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
`;

const StyledJsonPreview = styled.div`
  padding: 16px;
  border: 1px solid #d9d9d9;
  border-left: 3px solid #1890ff;
  background-color: #fafafa;
  font-size: 13px;
  font-family: "Roboto Mono", monospace;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const IndustrialButton = styled(Button)`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #1890ff;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;

  &:hover {
    background: #f0f5ff;
    border-color: #1890ff;
    color: #1890ff;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
  }

  &.danger {
    border-color: #ff4d4f;
    color: #ff4d4f;

    &:hover {
      background: #fff1f0;
      border-color: #ff7875;
      color: #ff7875;
      box-shadow: 0 2px 8px rgba(255, 77, 79, 0.2);
    }
  }

  &.primary {
    background: #1890ff;
    border-color: #1890ff;
    color: #ffffff;
    font-weight: 600;

    &:hover {
      background: #40a9ff;
      border-color: #40a9ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  }

  &.dashed {
    border: 1px dashed #d9d9d9;
    background: #fafafa;
    color: #1890ff;

    &:hover {
      background: #f0f5ff;
      border-color: #1890ff;
      border-style: dashed;
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #d9d9d9;
`;

const FieldLabel = styled.span`
  color: #595959;
  font-size: 11px;
  letter-spacing: 1px;
  font-family: "Roboto Mono", monospace;
  font-weight: 600;
`;

const CargoEditor: FC = () => {
  const { t } = useTranslation();
  const { data } = useCustomCargoFormat();
  const [form] = Form.useForm();
  const globalValue = useAtomValue(IsEditPeripheralModal);
  const [openCargoModal, setOpenCargoModal] = useAtom(IsOpenCargoEditorModal);
  const [messageApi, contextHolder] = message.useMessage();
  const [formatFieldMap, setFormatFieldMap] = useState<
    Record<number, { name: string; type: string }[]>
  >({});

  const options = data?.map((v) => ({
    label: v?.custom_name,
    value: v?.id,
  }));

  const editMutation = useMutation({
    mutationFn: (payload: {
      locationId: string;
      cargo: Cargo[];
      peripheralType: PeripheralTypes;
    }) => client.post("/api/peripherals/update-cargo-info-peripheral", payload),
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      form.resetFields();
      setOpenCargoModal(false);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  if (!globalValue) return [];

  useEffect(() => {
    if (!openCargoModal || !globalValue.cargo) return;

    try {
      const parsedCargo = Array.isArray(globalValue.cargo)
        ? globalValue.cargo.map((c) => ({
            cargoInfoId: c.cargoInfoId,
            metadata: c.metadata ? JSON.parse(c.metadata) : {},
            custom_cargo_metadata_id:
              c.customCargoMetadataId ?? c.customCargoMetadataId,
          }))
        : [];

      const newMap: Record<number, { name: string; type: string }[]> = {};
      parsedCargo.forEach((c, index) => {
        const matched = data?.find((v) => v?.id === c.custom_cargo_metadata_id);
        if (matched?.format) {
          try {
            const fields = Object.entries(JSON.parse(matched.format)).map(
              ([name, type]) => ({
                name,
                type: typeof type === "string" ? type : "string",
              })
            );
            newMap[index] = fields;
          } catch (err) {
            newMap[index] = [];
          }
        }
      });

      setFormatFieldMap(newMap);
      form.setFieldsValues({ cargo: parsedCargo });
    } catch (err) {
      console.error("Failed to parse cargo:", err);
    }
  }, [globalValue.cargo, openCargoModal, form, data]);

  const handleCancel = () => {
    setOpenCargoModal(false);
    form.resetFields();
  };

  const handleSelectChange = (value: string, index: number) => {
    const selectedFormat = data?.find((v) => v?.id === value);
    const formatFields = selectedFormat?.format
      ? Object.entries(JSON.parse(selectedFormat.format)).map(
          ([name, type]) => ({
            name,
            type: typeof type === "string" ? type : "string",
          })
        )
      : [];

    const existingCargo = form.getFieldValue("cargo") || [];
    existingCargo[index] = {
      ...(existingCargo[index] || {}),
      custom_cargo_metadata_id: value,
      metadata: {},
    };

    setFormatFieldMap((prev) => ({
      ...prev,
      [index]: formatFields,
    }));

    form.setFieldsValues({ cargo: existingCargo });
  };

  const renderInput = (type: string) => {
    switch (type.toLowerCase()) {
      case "string":
        return <Input />;
      case "number":
        return <Input type="number" />;
      case "boolean":
        return (
          <Select>
            <Select.Option value="true">{t("utils.yes")}</Select.Option>
            <Select.Option value="false">{t("utils.no")}</Select.Option>
          </Select>
        );
      default:
        return <Input />;
    }
  };

  const handleOk = () => {
    if (!globalValue.stationId) return;

    form
      .validateFields()
      .then((values) => {
        const payload = {
          locationId: globalValue.stationId,
          peripheralType: globalValue.stationType,
          cargo: (values.cargo || []).map((entry: any) => ({
            cargoInfoId: entry.cargoInfoId,
            metadata: JSON.stringify(entry.metadata),
            customCargoMetadataId: entry.custom_cargo_metadata_id,
          })),
        };

        editMutation.mutate(payload);
      })
      .catch((error) => {
        console.error("Form validation failed:", error);
      });
  };

  return (
    <>
      {contextHolder}
      <IndustrialModal
        title={
          <>
            <ToolOutlined /> {t("amr_card.update_cargo")}
          </>
        }
        open={openCargoModal}
        onCancel={handleCancel}
        footer={null}
        width={700}
      >
        <Wrapper>
          <Form form={form} layout="vertical">
            <Form.List name="cargo">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, index) => {
                    const name = field.name;
                    const currentCargo =
                      form.getFieldValue(["cargo", name]) || {};
                    const hasMetadataSchema =
                      !!currentCargo.custom_cargo_metadata_id;
                    const metadata = currentCargo.metadata || {};

                    return (
                      <CargoCard key={`${index}-form`}>
                        <CardHeader>
                          <span>
                            [{String(index + 1).padStart(2, "0")}]{" "}
                            {t("amr_card.cargo_item")}
                          </span>
                          <IndustrialButton
                            className="danger"
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                          >
                            {t("utils.delete")}
                          </IndustrialButton>
                        </CardHeader>

                        <Form.Item name={[name, "cargoInfoId"]} hidden>
                          <Input />
                        </Form.Item>

                        <Form.Item
                          label={
                            <FieldLabel>{t("customCargo.name")}</FieldLabel>
                          }
                          name={[name, "custom_cargo_metadata_id"]}
                        >
                          <Select
                            disabled={
                              !hasMetadataSchema &&
                              Object.keys(metadata).length !== 0
                            }
                            options={options}
                            onChange={(val) => handleSelectChange(val, name)}
                          />
                        </Form.Item>

                        {hasMetadataSchema ? (
                          (formatFieldMap[name] || []).map((field) => (
                            <Form.Item
                              key={`${name}-${field.name}`}
                              label={<FieldLabel>{field.name}</FieldLabel>}
                              name={[name, "metadata", field.name]}
                            >
                              {renderInput(field.type)}
                            </Form.Item>
                          ))
                        ) : (
                          <Form.Item
                            label={
                              <>
                                <FieldLabel>
                                  {t("amr_card.metadata")}
                                </FieldLabel>
                                <Tooltip
                                  placement="right"
                                  title={t("amr_card.metadata_desc")}
                                >
                                  <QuestionCircleOutlined
                                    style={{
                                      marginLeft: 8,
                                      color: "#1890ff",
                                    }}
                                  />
                                </Tooltip>
                              </>
                            }
                          >
                            <StyledJsonPreview>
                              <ReactJsonView
                                displayDataTypes={false}
                                enableClipboard={false}
                                collapsed={false}
                                value={metadata}
                                style={{ fontSize: 14 }}
                              />
                            </StyledJsonPreview>
                          </Form.Item>
                        )}
                      </CargoCard>
                    );
                  })}

                  <Tooltip placement="bottom" title={t("amr_card.add_desc")}>
                    <IndustrialButton
                      className="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                    >
                      {t("amr_card.add_cargo")}
                    </IndustrialButton>
                  </Tooltip>
                </>
              )}
            </Form.List>

            <ButtonGroup>
              <IndustrialButton
                className="primary"
                onClick={handleOk}
                loading={editMutation.isPending}
              >
                {t("utils.save")}
              </IndustrialButton>
              <IndustrialButton onClick={handleCancel}>
                {t("utils.cancel")}
              </IndustrialButton>
            </ButtonGroup>
          </Form>
        </Wrapper>
      </IndustrialModal>
    </>
  );
};

export default CargoEditor;
