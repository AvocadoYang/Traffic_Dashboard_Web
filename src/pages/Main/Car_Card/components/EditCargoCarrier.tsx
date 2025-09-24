import client from "@/api/axiosClient";
import useCustomCargoFormat from "@/api/useCustomCargoFormat";
import { useIsCarry } from "@/sockets/useAMRInfo";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation } from "@tanstack/react-query";
import {
  Form,
  Modal,
  Select,
  Input,
  message,
  Switch,
  Button,
  Tooltip,
  Flex,
} from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { FC, Dispatch, SetStateAction, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactJsonView from "@uiw/react-json-view";
import styled from "styled-components";
import { useReverifyCargoFormat } from "@/hooks/useReverifyCargoFormat";
import { Cargo } from "@/types/peripheral";

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

const EditCargoCarrier: FC<{
  amrId: string;
  isModalOpen: boolean;
  setIsModalOpen: Dispatch<SetStateAction<boolean>>;
}> = ({ amrId, isModalOpen, setIsModalOpen }) => {
  const { t } = useTranslation();
  const { data } = useCustomCargoFormat();
  const [formatFieldMap, setFormatFieldMap] = useState<
    Record<number, { name: string; type: string }[]>
  >({});
  const [form] = Form.useForm();
  const { isCarry, cargo } = useIsCarry(amrId);
  const {
    mutate,
    contextHolder: reContextHolder,
    messageApi,
  } = useReverifyCargoFormat();

  const reVerityCargoFormat = (cargoInfoId: string) => {
    mutate(cargoInfoId);
  };

  // console.log(cargo, 'current carry');
  const options = data?.map((v) => ({
    label: v?.custom_name,
    value: v?.id,
  }));

  const editMutation = useMutation({
    mutationFn: (payload: { amrId: string; cargo: Cargo[] }) =>
      client.post("/api/amr/update-cargo-info", payload),
    onSuccess: () => {
      setIsModalOpen(false);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  useEffect(() => {
    if (!isModalOpen) return;

    if (isCarry) {
      try {
        const parsedCargo = Array.isArray(cargo)
          ? cargo.map((c) => ({
              cargoInfoId: c.cargoInfoId,
              metadata: c.metadata ? JSON.parse(c.metadata) : {},
              custom_cargo_metadata_id:
                c.customCargoMetadataId ?? c.customCargoMetadataId,
            }))
          : [];

        // console.log(parsedCargo, 'oolm');

        // Precompute formatFieldMap
        const newMap: Record<number, { name: string; type: string }[]> = {};
        parsedCargo.forEach((c, index) => {
          const matched = data?.find(
            (v) => v?.id === c.custom_cargo_metadata_id
          );
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
        form.setFieldsValue({ hasCargo: true, cargo: parsedCargo });
      } catch (err) {
        console.error("Failed to parse cargo from socket:", err);
      }
    } else {
      form.setFieldsValue({
        hasCargo: false,
        cargo: [],
      });
      setFormatFieldMap({});
    }
  }, [isCarry, cargo, isModalOpen, form, data]);

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

    form.setFieldsValue({ cargo: existingCargo });
  };

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        const payload = {
          amrId,
          cargo: (values.cargo || []).map((entry: any) => ({
            cargoInfoId: entry.cargoInfoId,
            metadata: JSON.stringify(entry.metadata),
            customCargoMetadataId: entry.custom_cargo_metadata_id,
          })),
        };

        // console.log('Sending payload:', JSON.stringify(payload, null, 2));
        editMutation.mutate(payload);
      })
      .catch((error) => {
        console.error("Form validation failed:", error);
      });
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const renderInput = (
    type: string,
    fieldName: string,
    uniqueKey: string | undefined,
    isExisting: boolean
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

  // console.log(metadata, 'metadata');

  return (
    <>
      {reContextHolder}

      <Modal
        title={t("amr_card.update_cargo")}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
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

                    const matched = data?.find(
                      (v) => v.id === currentCargo.custom_cargo_metadata_id
                    );
                    const uniqueKey = matched?.unique_key;
                    const isExisting = !!currentCargo.cargoInfoId;

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
                                isExisting
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
                    <Tooltip placement="bottom" title={t("amr_card.add_desc")}>
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
        </Wrapper>
      </Modal>
    </>
  );
};

export default EditCargoCarrier;
