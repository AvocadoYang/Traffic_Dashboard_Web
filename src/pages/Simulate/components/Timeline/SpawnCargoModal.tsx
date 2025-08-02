import { useMutation } from "@tanstack/react-query";
import {
  Modal,
  Form,
  TimePicker,
  InputNumber,
  Select,
  Button,
  Switch,
  message,
  Flex,
  Input,
} from "antd";
import dayjs from "dayjs";
import { FC, useEffect, useMemo, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import styled from "styled-components";
import {
  OpenEditSpawnCargoModal,
  IsEditSchedule,
  SelectTime,
  EditTask,
  OpenEditShiftCargoModal,
} from "../../utils/mapStatus";
import client from "@/api/axiosClient";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";
import usePeripheralName from "@/api/usePeripheralName";
import { useTranslation } from "react-i18next";
import useCustomCargoFormat from "@/api/useCustomCargoFormat";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import ReactJsonView from "@uiw/react-json-view";

const Wrapper = styled.div`
  max-height: 72vh;
  overflow-y: auto;
  padding-right: 8px;
`;

const StyledJsonPreview = styled.div`
  padding: 12px;
  border: 1px dashed #ccc;
  border-radius: 8px;
  background-color: #fafafa;
  font-size: 13px;
`;

export const SpawnCargoModal: FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [isOpen, setIsOpen] = useAtom(OpenEditSpawnCargoModal);
  const [isEdit, setIsEdit] = useAtom(IsEditSchedule);
  const [selectTime, setSelectTime] = useAtom(SelectTime);
  const editTask = useAtomValue(EditTask);
  const [messageApi, contextHolder] = message.useMessage();
  const { data: peripheralName } = usePeripheralName();
  const { data } = useCustomCargoFormat();
  const [formatFieldMap, setFormatFieldMap] = useState<
    { name: string; type: string }[]
  >([]);
  // console.log(isEdit)
  const options = data?.map((v) => ({
    label: v?.custom_name,
    value: v?.id,
  }));

  const peripheralOption = useMemo(
    () =>
      peripheralName
        ?.filter((v) => v.name)
        .map((v) => ({
          label: `
            ${t("sim.spawn_cargo_modal.name")}: ${v.name || t("sim.spawn_cargo_modal.no_set")}
            ${t("sim.spawn_cargo_modal.location")}: ${v.locationId}
            ${t("sim.spawn_cargo_modal.type")}: ${v.type}
            ${t("sim.spawn_cargo_modal.level")}: ${
              v.level !== null && v.level !== undefined
                ? v.level + 1
                : t("sim.spawn_cargo_modal.no_set")
            }
          `,
          value: v.peripheralNameId,
        })) || [],
    [peripheralName, t],
  );

  const handleClose = () => {
    setIsOpen(false);
    setIsEdit(false);
    setSelectTime(null);
    form.resetFields();
    setFormatFieldMap([]);
  };

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      client.post("/api/simulate/insert-timeline-cargo-spawn", payload),
    onSuccess: () => {
      void messageApi.success(t("sim.spawn_cargo_modal.success"));
      handleClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const editMutation = useMutation({
    mutationFn: (payload: any) =>
      client.post("/api/simulate/edit-timeline-cargo-spawn", payload),
    onSuccess: () => {
      void messageApi.success(t("sim.spawn_cargo_modal.updated"));
      handleClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const removeMutation = useMutation({
    mutationFn: (payload: { id: string; time: string }) => {
      return client.post("api/simulate/remove-timeline-mission", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      handleClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleSelectChange = (value: string) => {
    const selectedFormat = data?.find((v) => v?.id === value);
    const formatFields = selectedFormat?.format
      ? Object.entries(JSON.parse(selectedFormat.format)).map(
          ([name, type]) => ({
            name,
            type: typeof type === "string" ? type : "string",
          }),
        )
      : [];

    setFormatFieldMap(formatFields);
    form.setFieldsValue({
      metadata: {}, // Reset metadata when changing cargo metadata ID
    });
  };

  const renderInput = (type: string, name: string) => {
    switch (type.toLowerCase()) {
      case "string":
        return <Input />;
      case "number":
        return <InputNumber />;
      case "boolean":
        return (
          <Select>
            <Select.Option value="true">
              {t("sim.spawn_cargo_modal.yes")}
            </Select.Option>
            <Select.Option value="false">
              {t("sim.spawn_cargo_modal.no")}
            </Select.Option>
          </Select>
        );
      default:
        return <Input />;
    }
  };

  const save = () => {
    form
      .validateFields()
      .then((values) => {
        const payload = {
          timestamp: values.timestamp.format("HH:mm"),
          type: "SPAWN_CARGO",
          isEnable: values.isEnable,
          styleRow: values.styleRow,
          timelineSpawnCargo: {
            peripheralNameId: values.peripheralNameId,
            spawnCargoInfo: {
              customCargoMetadataId: values.customCargoMetadataId,
              metadata: values.metadata
                ? JSON.stringify(values.metadata)
                : "{}",
            },
          },
        };
        //  console.log(payload);
        if (isEdit && editTask?.id && selectTime) {
          editMutation.mutate({
            ...payload,
            id: editTask.id,
            oldTimestamp: selectTime,
          });
        } else {
          saveMutation.mutate(payload);
        }
      })
      .catch((error) => {
        console.error("Form validation failed:", error);
      });
  };

  const removeSchedule = () => {
    if (!editTask?.id || !editTask?.time) {
      void messageApi.error(t("sim.insert_modal.error_missing_id"));
      return;
    }
    removeMutation.mutate({ id: editTask.id, time: editTask.time });
  };

  useEffect(() => {
    if (isEdit && editTask?.type === "SPAWN_CARGO" && isOpen) {
      const metadata = editTask.timelineSpawnCargo?.spawnCargoInfo?.metadata
        ? typeof editTask.timelineSpawnCargo.spawnCargoInfo.metadata ===
          "string"
          ? JSON.parse(editTask.timelineSpawnCargo.spawnCargoInfo.metadata)
          : editTask.timelineSpawnCargo.spawnCargoInfo.metadata
        : {};
      const customCargoMetadataId =
        editTask.timelineSpawnCargo?.spawnCargoInfo?.customCargoMetadataId;
      //  console.log(editTask);
      form.setFieldsValue({
        timestamp: dayjs(editTask.time, "HH:mm"),
        styleRow: editTask.styleRow,
        isEnable: editTask.isEnable,
        peripheralNameId: editTask.timelineSpawnCargo?.peripheralNameId,
        customCargoMetadataId,
        metadata,
      });

      if (customCargoMetadataId) {
        const selectedFormat = data?.find(
          (v) => v?.id === customCargoMetadataId,
        );
        const formatFields = selectedFormat?.format
          ? Object.entries(JSON.parse(selectedFormat.format)).map(
              ([name, type]) => ({
                name,
                type: typeof type === "string" ? type : "string",
              }),
            )
          : [];
        setFormatFieldMap(formatFields);
      } else {
        setFormatFieldMap([]);
      }
    } else if (!isEdit && selectTime) {
      form.setFieldValue("timestamp", dayjs(selectTime, "HH:mm"));
      setFormatFieldMap([]);
    }
  }, [isEdit, editTask, selectTime, data, form]);

  return (
    <Modal
      open={isOpen}
      title={t("sim.spawn_cargo_modal.title")}
      onCancel={handleClose}
      footer={[]}
    >
      {contextHolder}
      <Wrapper>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            isEnable: true,
            styleRow: 1,
          }}
        >
          <Flex justify="space-between">
            <Form.Item
              name="timestamp"
              label={t("sim.spawn_cargo_modal.time")}
              rules={[
                {
                  required: true,
                  message: t("sim.spawn_cargo_modal.required"),
                },
              ]}
            >
              <TimePicker format="HH:mm" needConfirm={false} />
            </Form.Item>
            <Form.Item
              name="styleRow"
              label={t("sim.spawn_cargo_modal.style_row")}
              rules={[
                {
                  required: true,
                  message: t("sim.spawn_cargo_modal.required"),
                },
              ]}
            >
              <InputNumber min={0} max={10} />
            </Form.Item>
            <Form.Item
              name="isEnable"
              label={t("sim.spawn_cargo_modal.enable")}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Flex>

          <Form.Item
            name="peripheralNameId"
            label={t("sim.spawn_cargo_modal.peripheral_id")}
            rules={[
              { required: true, message: t("sim.spawn_cargo_modal.required") },
            ]}
          >
            <Select
              options={peripheralOption}
              placeholder={t("sim.spawn_cargo_modal.select_notify")}
            />
          </Form.Item>

          <Form.Item
            name="customCargoMetadataId"
            label={t("sim.spawn_cargo_modal.cargo_metadata_id")}
          >
            <Select
              options={options}
              onChange={handleSelectChange}
              placeholder={t("sim.spawn_cargo_modal.select")}
            />
          </Form.Item>

          {formatFieldMap.length > 0 ? (
            formatFieldMap.map((field) => (
              <Form.Item
                key={field.name}
                label={field.name}
                name={["metadata", field.name]}
                rules={[
                  {
                    required: true,
                    message: t("sim.spawn_cargo_modal.required"),
                  },
                ]}
              >
                {renderInput(field.type, field.name)}
              </Form.Item>
            ))
          ) : (
            <Form.Item
              label={<>{t("sim.spawn_cargo_modal.metadata")}</>}
              name="metadata"
            >
              <StyledJsonPreview>
                <ReactJsonView
                  displayDataTypes={false}
                  enableClipboard={false}
                  collapsed={false}
                  value={form.getFieldValue("metadata") || {}}
                  style={{ fontSize: 14 }}
                />
              </StyledJsonPreview>
            </Form.Item>
          )}

          <Flex gap="middle">
            <Form.Item>
              <Button
                onClick={save}
                type="primary"
                loading={saveMutation.isPending || editMutation.isPending}
              >
                {isEdit
                  ? t("sim.spawn_cargo_modal.update")
                  : t("sim.spawn_cargo_modal.save")}
              </Button>
            </Form.Item>
            {isEdit && (
              <Form.Item>
                <Button
                  danger
                  onClick={removeSchedule}
                  type="default"
                  loading={removeMutation.isPending}
                >
                  {t("utils.delete")}
                </Button>
              </Form.Item>
            )}
          </Flex>
        </Form>
      </Wrapper>
    </Modal>
  );
};
