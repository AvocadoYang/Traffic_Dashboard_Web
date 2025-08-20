import { FC, useMemo } from "react";
import { useAtom } from "jotai";
import {
  Modal,
  Form,
  TimePicker,
  InputNumber,
  Select,
  Switch,
  Button,
  message,
  Flex,
} from "antd";
import dayjs from "dayjs";
import { useMutation } from "@tanstack/react-query";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import client from "@/api/axiosClient";
import usePeripheralGroup from "@/api/usePeripheralGroup";
import { OpenRangeShiftModal } from "../../utils/mapStatus";
import { useTranslation } from "react-i18next";

interface FormValues {
  timestamp: dayjs.Dayjs;
  end_timestamp: dayjs.Dayjs;
  styleRow: number;
  activeInterval: number;
  isShiftAll: boolean;
  shiftNumber: number;
  shiftGroupId: string;
}

const InsertRangeGroupShiftCargoModal: FC = () => {
  const [form] = Form.useForm<FormValues>();
  const [isOpen, setIsOpen] = useAtom(OpenRangeShiftModal);
  const { data: peripheralGroups } = usePeripheralGroup();
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();

  const handleClose = () => {
    setIsOpen(false);
    form.resetFields();
  };

  const peripheralOptions = useMemo(
    () =>
      peripheralGroups?.map((pg) => ({
        label: pg.name,
        value: pg.id,
      })) || [],
    [peripheralGroups],
  );

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      client.post(
        "/api/simulate/insert-timeline-random-group-shift-mission",
        payload,
      ),
    onSuccess: () => {
      messageApi.success("Shift cargo group added successfully!");
      handleClose();
    },
    onError: (err: any) => {
      console.error(err);
      messageApi.error("Failed to add shift cargo group.");
    },
  });

  const save = () => {
    form
      .validateFields()
      .then((values) => {
        if (dayjs(values.end_timestamp).isBefore(dayjs(values.timestamp))) {
          messageApi.warning("End time must be after start time.");
          return;
        }
        saveMutation.mutate({
          ...values,
          timestamp: values.timestamp.format("HH:mm") as string,
          end_timestamp: values.end_timestamp.format("HH:mm"),
        });
      })
      .catch(() => messageApi.error("Please fix validation errors."));
  };

  return (
    <>
      {contextHolder}
      <Modal
        open={isOpen}
        onCancel={handleClose}
        footer={null}
        title={t("sim.shift_cargo_group.insert_random_shift_cargo_group")}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ styleRow: 0, activeInterval: 5, isSpawnAll: true }}
        >
          <Flex justify="space-between">
            <Form.Item
              label={t("sim.shift_cargo_group.time")}
              name="timestamp"
              rules={[{ required: true }]}
            >
              <TimePicker needConfirm={false} format="HH:mm" />
            </Form.Item>
            <Form.Item
              label={t("sim.shift_cargo_group.range_end_time")}
              name="end_timestamp"
              rules={[{ required: true }]}
            >
              <TimePicker needConfirm={false} format="HH:mm" />
            </Form.Item>
            <Form.Item
              label="Style Row"
              name="styleRow"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} max={10} />
            </Form.Item>
          </Flex>

          <Form.Item
            label={t("sim.shift_cargo_group.gap_time")}
            name="activeInterval"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item
            label={t("sim.shift_cargo_group.peripheral_group")}
            name="shiftGroupId"
            rules={[{ required: true }]}
          >
            <Select options={peripheralOptions} />
          </Form.Item>
          <Form.Item
            label={t("sim.shift_cargo_group.shift_all")}
            name="isShiftAll"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            label={t("sim.shift_cargo_group.shift_number")}
            name="shiftNumber"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" onClick={save}>
              Submit
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default InsertRangeGroupShiftCargoModal;
