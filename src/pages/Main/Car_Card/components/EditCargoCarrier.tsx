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

const Wrapper = styled.div`
  max-height: 72vh;
  overflow-y: auto;
  padding-right: 8px;
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
  const [hasCargo, setHasCargo] = useState(false);
  const { isCarry, cargo } = useIsCarry(amrId);
  const {
    mutate,
    isLoading,
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
    mutationFn: (payload: { amrId: string; hasCargo: boolean; cargo: any }) =>
      client.post("/api/amr/update-cargo-info", payload),
    onSuccess: () => {
      setIsModalOpen(false);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  useEffect(() => {
    if (!isModalOpen) return;

    if (isCarry) {
      setHasCargo(true);
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
            (v) => v?.id === c.custom_cargo_metadata_id,
          );
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

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        const payload = {
          amrId,
          hasCargo,
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

  const renderInput = (type: string, _name: string) => {
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
            <Form.Item
              label={t("shelf.layer_form.has_cargo")}
              name={`hasCargo`}
              valuePropName="checked"
            >
              <Switch
                value={hasCargo}
                onChange={() => setHasCargo(!hasCargo)}
                checkedChildren={t("shelf.layer_form.has_cargo")}
                unCheckedChildren={t("shelf.layer_form.no_cargo")}
              />
            </Form.Item>

            <Form.List name="cargo">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => {
                    const currentCargo =
                      form.getFieldValue("cargo")?.[name] || {};
                    const hasMetadataSchema =
                      !!currentCargo.custom_cargo_metadata_id;
                    const metadata = currentCargo.metadata || {};

                    return (
                      <div
                        key={key}
                        style={{
                          marginBottom: 24,
                          padding: 12,
                          border: "1px dashed #ccc",
                          borderRadius: 4,
                        }}
                      >
                        {/* 為了cargo id不可填寫 */}
                        <Form.Item name={[name, "cargoInfoId"]} hidden>
                          <Input />
                        </Form.Item>

                        {/* 當格式不是定義在交管 就不可編輯只能觀看 */}
                        <Form.Item
                          {...restField}
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
                              label={field.name}
                              name={[name, "metadata", field.name]}
                            >
                              {renderInput(field.type, field.name)}
                            </Form.Item>
                          ))
                        ) : (
                          <Form.Item
                            label={
                              <Flex align="center" gap="large">
                                <Flex gap="small">
                                  {t("amr_card.metadata")}
                                  <Tooltip
                                    placement="right"
                                    title={t("amr_card.metadata_desc")}
                                  >
                                    <QuestionCircleOutlined />
                                  </Tooltip>
                                </Flex>

                                <Button
                                  loading={isLoading}
                                  onClick={() =>
                                    reVerityCargoFormat(
                                      currentCargo.cargoInfoId,
                                    )
                                  }
                                >
                                  {t("cargo_history.re_verity_format")}
                                </Button>
                              </Flex>
                            }
                          >
                            <ReactJsonView
                              displayDataTypes={false}
                              enableClipboard={false}
                              collapsed={false}
                              value={metadata}
                            />
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
          </Form>
        </Wrapper>
      </Modal>
    </>
  );
};

export default EditCargoCarrier;
