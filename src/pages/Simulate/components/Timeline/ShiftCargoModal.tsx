import client from "@/api/axiosClient";
import { errorHandler } from "@/utils/utils";
import { useMutation } from "@tanstack/react-query";
import {
  message,
  Modal,
  TimePicker,
  InputNumber,
  Switch,
  Button,
  Form,
  Flex,
  Select,
} from "antd";
import dayjs from "dayjs";
import { useAtom, useAtomValue } from "jotai";
import { FC, useEffect, useMemo } from "react";
import styled from "styled-components";
import {
  OpenEditModal,
  IsEditSchedule,
  SelectTime,
  EditTask,
  OpenEditShiftCargoModal,
} from "../../utils/mapStatus";
import { ErrorResponse } from "@/utils/globalType";
import { useTranslation } from "react-i18next";
import usePeripheralName from "@/api/usePeripheralName";

const Wrapper = styled.div`
  max-height: 72vh;
  overflow-y: auto;
  padding-right: 8px;
`;

export const ShiftCargoModal: FC = () => {
  const [form] = Form.useForm();
  const [isOpen, setIsOpen] = useAtom(OpenEditShiftCargoModal);
  const [isEdit, setIsEdit] = useAtom(IsEditSchedule);
  const [selectTime, setSelectTime] = useAtom(SelectTime);
  const editTask = useAtomValue(EditTask);
  const [messageApi, contextHolder] = message.useMessage();
  const { data: peripheralName } = usePeripheralName();
  const { t } = useTranslation();

  const handleClose = () => {
    setIsOpen(false);
    setIsEdit(false);
    setSelectTime(null);
    form.resetFields();
  };

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      client.post("/api/simulate/insert-timeline-cargo-shift", payload),
    onSuccess: () => {
      void messageApi.success("Saved");
      handleClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const editMutation = useMutation({
    mutationFn: (payload: any) =>
      client.post("/api/simulate/edit-timeline-cargo-shift", payload),
    onSuccess: () => {
      void messageApi.success("Updated");
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

  const save = () => {
    form.validateFields().then((values) => {
      const payload = {
        timestamp: values.timestamp.format("HH:mm"),
        type: "SHIFT_CARGO",
        isEnable: values.isEnable ?? true,
        styleRow: values.styleRow,
        shiftPeripheralId: values.shiftPeripheralId,
      };
      if (isEdit && editTask?.id && selectTime) {
        editMutation.mutate({
          ...payload,
          id: editTask.id,
          oldTimestamp: selectTime,
        });
      } else {
        saveMutation.mutate(payload);
      }
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
    if (isEdit && editTask?.type === "SHIFT_CARGO") {
      form.setFieldsValue({
        timestamp: dayjs(editTask.time, "HH:mm"),
        styleRow: editTask.styleRow,
        isEnable: editTask.isEnable,
        shiftPeripheralId: editTask.timelineShiftCargo?.shiftPeripheralId,
      });
    } else if (!isEdit && selectTime) {
      form.setFieldValue("timestamp", dayjs(selectTime, "HH:mm"));
    }
  }, [isEdit, editTask, selectTime]);

  return (
    <Modal
      title={t("sim.shift_cargo_modal.title")}
      open={isOpen}
      onCancel={handleClose}
      onOk={save}
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
              label={t("sim.shift_cargo_modal.time")}
              rules={[
                {
                  required: true,
                  message: t("sim.shift_cargo_modal.required"),
                },
              ]}
            >
              <TimePicker format="HH:mm" needConfirm={false} />
            </Form.Item>
            <Form.Item
              name="styleRow"
              label={t("sim.shift_cargo_modal.style_row")}
              rules={[
                {
                  required: true,
                  message: t("sim.shift_cargo_modal.required"),
                },
              ]}
            >
              <InputNumber min={0} max={10} />
            </Form.Item>
            <Form.Item
              name="isEnable"
              label={t("sim.shift_cargo_modal.enable")}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Flex>

          <Form.Item
            name="shiftPeripheralId"
            label={t("sim.shift_cargo_modal.peripheral_id")}
            rules={[
              { required: true, message: t("sim.shift_cargo_modal.required") },
            ]}
          >
            <Select
              options={peripheralOption}
              placeholder={t("sim.shift_cargo_modal.select_notify")}
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
