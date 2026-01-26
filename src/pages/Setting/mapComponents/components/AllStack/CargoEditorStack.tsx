import useCustomCargoFormat from "@/api/useCustomCargoFormat";
import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Tooltip,
} from "antd";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { QuestionCircleOutlined } from "@ant-design/icons";
import ReactJsonView from "@uiw/react-json-view";
import client from "@/api/axiosClient";
import { useMutation } from "@tanstack/react-query";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";
import { Cargo, PeripheralTypes } from "@/types/peripheral";
import { useAtom } from "jotai";
import { ESC, ESM } from "@/pages/Setting/utils/settingJotai";
import useStackInfo from "@/api/useStackInfo";

const Wrapper = styled.div`
  max-height: 72vh;
  overflow-y: auto;
  padding-right: 8px;
`;

export const StyledJsonPreview = styled.div`
  padding: 12px;
  border: 1px dashed #ccc;
  border-radius: 8px;
  background-color: #fafafa;
  font-size: 13px;
`;

const CargoEditorStack: FC = () => {
  const { t } = useTranslation();
  const { data } = useCustomCargoFormat();
  const [form] = Form.useForm();

  const [open, setOpen] = useAtom(ESM);
  const { data: stack } = useStackInfo(open.locationId as string);
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
      setOpen({ locationId: null, isOpen: false });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  useEffect(() => {
    if (!stack) return;

    try {
      const parsedCargo = Array.isArray(stack.cargo)
        ? stack.cargo
            .map((c) => ({
              placement_order: c.placement_order,
              cargoInfoId: c.cargoInfoId,
              metadata: c.metadata ? JSON.parse(c.metadata) : {},
              addon_metadata: c.addon_metadata
                ? JSON.parse(c.addon_metadata)
                : {},
              custom_cargo_metadata_id:
                c.customCargoMetadataId ?? c.customCargoMetadataId,
            }))
            .sort((a, b) => a.placement_order - b.placement_order)
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
              }),
            );
            newMap[index] = fields;
          } catch (err) {
            newMap[index] = [];
          }
        }
      });

      setFormatFieldMap(newMap);
      form.setFieldsValue({ cargo: parsedCargo });
    } catch (err) {
      console.error("Failed to parse cargo:", err);
    }
  }, [stack?.cargo, stack, form, data]);

  const handleCancel = () => {
    setOpen({ locationId: null, isOpen: false });
    form.resetFields();
  };

  const yfySizeOption = [
    { label: "1.1m", value: "1.1" },
    { label: "1.5m", value: "1.5" },
  ];

  const handleSelectChange = (value: string, index: number) => {
    const selectedFormat = data?.find((v) => v?.id === value);
    const formatFields = selectedFormat?.format
      ? Object.entries(JSON.parse(selectedFormat.format)).map(
          ([name, type]) => ({
            name,
            type: typeof type === "string" ? type : "string",
          }),
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

    form.setFieldsValue({ cargo: existingCargo });
  };

  const renderInput = (
    type: string,
    fieldName: string,
    uniqueKey: string | undefined,
    isExisting: boolean,
  ) => {
    // 🚫 disable only if editing existing cargo & field is unique_key
    const disabled = isExisting && uniqueKey === fieldName;

    switch (type.toLowerCase()) {
      case "string":
        return <Input disabled={disabled} />;
      case "number":
        return <Input type="number" disabled={disabled} />;
      case "boolean":
        return (
          <Select disabled={disabled}>
            <Select.Option value="true">{t("utils.yes")}</Select.Option>
            <Select.Option value="false">{t("utils.no")}</Select.Option>
          </Select>
        );
      default:
        return <Input disabled={disabled} />;
    }
  };

  const handleOk = () => {
    if (!open || !open.locationId) return;

    form
      .validateFields()
      .then((values) => {
        // console.log(values.cargo);
        const payload = {
          locationId: open.locationId as string,
          peripheralType: "STACK" as PeripheralTypes,
          cargo: (values.cargo || []).map((entry: any, i: number) => ({
            placement_order: i,
            cargoInfoId: entry.cargoInfoId,
            metadata: JSON.stringify(entry.metadata),
            addon_metadata: JSON.stringify(entry.addon_metadata),
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
      <Modal
        title={t("amr_card.update_cargo")}
        open={open.isOpen}
        onCancel={handleCancel}
        footer={<></>}
      >
        <Wrapper>
          {!stack ? null : (
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

                      const matched = data?.find(
                        (v) => v.id === currentCargo.custom_cargo_metadata_id,
                      );
                      const uniqueKey = matched?.unique_key;
                      const isExisting = !!currentCargo.cargoInfoId;

                      const isYFY =
                        currentCargo.custom_cargo_metadata_id ===
                        "default-container-id";

                      return (
                        <div
                          key={`${index}-form`}
                          style={{
                            marginBottom: 24,
                            padding: 12,
                            border: "1px dashed #ccc",
                            borderRadius: 4,
                          }}
                        >
                          <Form.Item name={[name, "cargoInfoId"]} hidden>
                            <Input />
                          </Form.Item>

                          {isYFY ? (
                            <>
                              <Form.Item
                                key={`${name}-height`}
                                label={"height"}
                                name={[
                                  name,
                                  "addon_metadata",
                                  "current_height",
                                ]}
                              >
                                <InputNumber min={0} />
                              </Form.Item>

                              <Form.Item
                                key={`${name}-size`}
                                label={"size"}
                                name={[name, "addon_metadata", "current_size"]}
                              >
                                <Select options={yfySizeOption} />
                              </Form.Item>
                            </>
                          ) : null}

                          <Form.Item
                            label={t("customCargo.name")}
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
                                label={
                                  field.name === uniqueKey ? (
                                    <>{field.name} 🔒</>
                                  ) : (
                                    field.name
                                  )
                                }
                                name={[name, "metadata", field.name]}
                              >
                                {renderInput(
                                  field.type,
                                  field.name,
                                  uniqueKey,
                                  isExisting,
                                )}
                              </Form.Item>
                            ))
                          ) : (
                            <Form.Item
                              label={
                                <>
                                  {t("amr_card.metadata")}
                                  <Tooltip
                                    placement="right"
                                    title={t("amr_card.metadata_desc")}
                                  >
                                    <QuestionCircleOutlined />
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

                          <Form.Item>
                            <Button danger onClick={() => remove(name)}>
                              {t("utils.delete")}
                            </Button>
                          </Form.Item>
                        </div>
                      );
                    })}

                    <Form.Item>
                      <Tooltip
                        placement="bottom"
                        title={t("amr_card.add_desc")}
                      >
                        <Button type="dashed" onClick={() => add()} block>
                          + {t("amr_card.add_cargo")}
                        </Button>
                      </Tooltip>
                    </Form.Item>
                  </>
                )}
              </Form.List>

              <Button onClick={handleOk}>{t("utils.save")}</Button>
            </Form>
          )}
        </Wrapper>
      </Modal>
    </>
  );
};

export default CargoEditorStack;
