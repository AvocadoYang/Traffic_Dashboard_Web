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
} from "../../../utils/mapStatus";
import client from "@/api/axiosClient";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";
import usePeripheralName from "@/api/usePeripheralName";
import { useTranslation } from "react-i18next";
import useCustomCargoFormat from "@/api/useCustomCargoFormat";
import { Mission_Schedule } from "@/types/timeline";

const Wrapper = styled.div`
  max-height: 72vh;
  overflow-y: auto;
  padding-right: 8px;
`;

export const SpawnCargoModal: FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [isOpen, setIsOpen] = useAtom(OpenEditSpawnCargoModal);
  const [isEdit, setIsEdit] = useAtom(IsEditSchedule);
  const [selectTime, setSelectTime] = useAtom(SelectTime);
  const editTask = useAtomValue(EditTask);
  const [valueLock, setValueLock] = useState<Mission_Schedule | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const { data: peripheralName } = usePeripheralName();
  const { data } = useCustomCargoFormat();

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
    [peripheralName, t]
  );

  const handleClose = () => {
    setIsOpen(false);
    setIsEdit(false);
    setSelectTime(null);
    form.resetFields();
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
            },
          },
        };

        if (isEdit && valueLock?.id && selectTime) {
          editMutation.mutate({
            ...payload,
            id: valueLock.id,
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
      setValueLock(editTask);
      const customCargoMetadataId =
        editTask.timelineSpawnCargo?.spawnCargoInfo?.customCargoMetadataId;

      form.setFieldsValue({
        timestamp: dayjs(editTask.time, "HH:mm"),
        styleRow: editTask.styleRow,
        isEnable: editTask.isEnable,
        peripheralNameId: editTask.timelineSpawnCargo?.peripheralNameId,
        customCargoMetadataId,
      });
    } else if (!isEdit && selectTime) {
      form.setFieldValue("timestamp", dayjs(selectTime, "HH:mm"));
    }
  }, [isEdit, editTask, selectTime, data, form]);

  return (
    <Modal
      open={isOpen}
      key={editTask?.id}
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
              <InputNumber min={0} max={10} disabled />
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
              showSearch
              optionFilterProp="label"
              placeholder={t("sim.spawn_cargo_modal.select_notify")}
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toString()
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            name="customCargoMetadataId"
            label={t("sim.spawn_cargo_modal.cargo_metadata_id")}
          >
            <Select
              options={options}
              placeholder={t("sim.spawn_cargo_modal.select")}
            />
          </Form.Item>

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
