import useCustomCargoFormat from "@/api/useCustomCargoFormat";
import { Button, Form, Input, message, Modal, Select, Tooltip } from "antd";
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
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { EEC, EEM } from "@/pages/Setting/utils/settingJotai";
import useElevatorInfo from "@/api/useElevatorInfo";

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

interface CargoFormData {
  cargoInfoId?: string;
  metadata: Record<string, any>;
  custom_cargo_metadata_id?: string;
}

const CargoEditorElevator: FC = () => {
  const { t } = useTranslation();
  const { data } = useCustomCargoFormat();
  const [form] = Form.useForm();

  const [open, setOpen] = useAtom(EEM);
  const [openModal, setOpenModal] = useAtom(EEC);
  const { data: elevator } = useElevatorInfo(open.locationId as string);
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
      setFormatFieldMap({});
      setOpenModal(false);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  useEffect(() => {
    if (!elevator) return;

    try {
      const parsedCargo = Array.isArray(elevator.cargo)
        ? elevator.cargo.map((c) => {
            let metadata = {};

            try {
              metadata = c.metadata ? JSON.parse(c.metadata) : {};
            } catch (err) {
              console.error("Failed to parse metadata:", err);
            }

            return {
              cargoInfoId: c.cargoInfoId,
              metadata,
              custom_cargo_metadata_id:
                c.custom_cargo_metadata_id ?? c.customCargoMetadataId,
            };
          })
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
            console.error("Failed to parse format:", err);
            newMap[index] = [];
          }
        }
      });

      setFormatFieldMap(newMap);
      form.setFieldsValue({ cargo: parsedCargo });
    } catch (err) {
      console.error("Failed to parse cargo:", err);
    }
  }, [elevator?.cargo, elevator, form, data]);

  const handleCancel = () => {
    setOpenModal(false);
    setOpen({ locationId: null, isOpen: false });
    form.resetFields();
    setFormatFieldMap({});
  };

  const handleSelectChange = (value: string, fieldName: number) => {
    const selectedFormat = data?.find((v) => v?.id === value);
    const formatFields = selectedFormat?.format
      ? (() => {
          try {
            return Object.entries(JSON.parse(selectedFormat.format)).map(
              ([name, type]) => ({
                name,
                type: typeof type === "string" ? type : "string",
              }),
            );
          } catch (err) {
            console.error("Failed to parse format:", err);
            return [];
          }
        })()
      : [];

    const existingCargo = form.getFieldValue("cargo") || [];
    existingCargo[fieldName] = {
      ...(existingCargo[fieldName] || {}),
      custom_cargo_metadata_id: value,
      metadata: {},
    };

    setFormatFieldMap((prev) => ({
      ...prev,
      [fieldName]: formatFields,
    }));

    form.setFieldsValue({ cargo: existingCargo });
  };

  const handleRemove = (fieldName: number) => {
    const currentCargo = form.getFieldValue("cargo") || [];

    const newCargo = currentCargo.filter(
      (_: any, idx: number) => idx !== fieldName,
    );

    const newMap: Record<number, { name: string; type: string }[]> = {};
    newCargo.forEach((cargo: CargoFormData, newIndex: number) => {
      if (cargo.custom_cargo_metadata_id) {
        const matched = data?.find(
          (v) => v?.id === cargo.custom_cargo_metadata_id,
        );
        if (matched?.format) {
          try {
            const fields = Object.entries(JSON.parse(matched.format)).map(
              ([name, type]) => ({
                name,
                type: typeof type === "string" ? type : "string",
              }),
            );
            newMap[newIndex] = fields;
          } catch (err) {
            console.error("Failed to parse format:", err);
          }
        }
      }
    });

    setFormatFieldMap(newMap);
    form.setFieldsValue({ cargo: newCargo });
  };

  const handleAdd = () => {
    const currentCargo = form.getFieldValue("cargo") || [];
    const newCargo = [
      ...currentCargo,
      {
        metadata: {},
      },
    ];
    form.setFieldsValue({ cargo: newCargo });
  };

  const corningOption = [
    "6-Metal",
    "5",
    "6-Inno",
    "6-Wooden",
    "6-KC",
    "5.5",
    "6-TC",
  ];

  const c_typeOption = ["Full", "Pallet", "Wooden", "Unknown", "Empty"];

  const renderInput = (
    type: string,
    fieldName: string,
    uniqueKey: string | undefined,
    isExisting: boolean,
  ) => {
    const disabled = isExisting && uniqueKey === fieldName;

    // if (type.toLowerCase() === "string" && fieldName === "container_id") {
    //   return (
    //     <div style={{ display: "flex", gap: 8 }}>
    //       <Input
    //         style={{ width: "100%" }}
    //         // disabled={disabled}
    //         min={0}
    //         max={10}
    //       />
    //     </div>
    //   );
    // }

    if (type.toLowerCase() === "string" && fieldName === "container_gen") {
      return (
        <Select
          // disabled={disabled}
          options={corningOption.map((c) => {
            return { value: c };
          })}
        ></Select>
      );
    }
    if (type.toLowerCase() === "string" && fieldName === "container_type") {
      return (
        <Select
          // disabled={disabled}
          options={c_typeOption.map((c) => {
            return { value: c };
          })}
        ></Select>
      );
    }

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
    if (!open || !open.locationId) return;

    form
      .validateFields()
      .then((values) => {
        const payload = {
          locationId: open.locationId as string,
          peripheralType: "ELEVATOR" as PeripheralTypes,
          cargo: (values.cargo || []).map(
            (entry: CargoFormData, i: number) => ({
              cargoInfoId: entry.cargoInfoId,
              metadata: JSON.stringify(entry.metadata || {}),
              customCargoMetadataId: entry.custom_cargo_metadata_id,
              placement_order: i,
            }),
          ),
        };

        editMutation.mutate(payload);
      })
      .catch((error) => {
        console.error("Form validation failed:", error);
      });
  };

  if (!elevator) return null;

  return (
    <>
      {contextHolder}
      <Modal
        title={t("amr_card.update_cargo")}
        open={openModal}
        onCancel={handleCancel}
        footer={<></>}
      >
        <Wrapper>
          <Form form={form} layout="vertical">
            <Form.List name="cargo">
              {(fields) => (
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

                    return (
                      <div
                        key={field.key}
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
                          <Button danger onClick={() => handleRemove(name)}>
                            {t("utils.delete")}
                          </Button>
                        </Form.Item>
                      </div>
                    );
                  })}

                  <Form.Item>
                    <Tooltip placement="bottom" title={t("amr_card.add_desc")}>
                      <Button type="dashed" onClick={handleAdd} block>
                        + {t("amr_card.add_cargo")}
                      </Button>
                    </Tooltip>
                  </Form.Item>
                </>
              )}
            </Form.List>

            <Button onClick={handleOk}>{t("utils.save")}</Button>
          </Form>
        </Wrapper>
      </Modal>
    </>
  );
};

export default CargoEditorElevator;
