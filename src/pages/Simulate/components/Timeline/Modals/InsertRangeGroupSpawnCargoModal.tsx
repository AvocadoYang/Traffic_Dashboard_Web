import { FC, useMemo, useState } from "react";
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
import { OpenRangeSpawnModal } from "../../../utils/mapStatus";
import { useTranslation } from "react-i18next";

interface FormValues {
  timestamp: dayjs.Dayjs;
  end_timestamp: dayjs.Dayjs;
  styleRow: number;
  activeInterval: number;
  isSpawnAll: boolean;
  spawnNumber: number;
  spawnGroupId: string;
}

const InsertRangeGroupSpawnCargoModal: FC = () => {
  const [form] = Form.useForm<FormValues>();
  const [isOpen, setIsOpen] = useAtom(OpenRangeSpawnModal);
  const { data: peripheralGroups } = usePeripheralGroup();
  const [messageApi, contextHolder] = message.useMessage();
  const [isSpawnAll, setIsSpawnAll] = useState(false);
  const { t } = useTranslation();
  const handleClose = () => {
    setIsOpen(false);
    form.resetFields();
  };
  const handleSpawnAll = (isShifted: boolean) => {
    setIsSpawnAll(isShifted);
    if (isShifted) {
      form.setFieldValue("spawnNumber", 1);
    }
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
        "/api/simulate/insert-timeline-random-group-spawn-mission",
        payload,
      ),
    onSuccess: () => {
      messageApi.success("Spawn cargo group added successfully!");
      handleClose();
    },
    onError: (err: any) => {
      console.error(err);
      messageApi.error("Failed to add spawn cargo group.");
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
        title={t("sim.spawn_cargo_group.insert_random_spawn_cargo_group")}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ styleRow: 0, activeInterval: 5 }}
        >
          <Flex justify="space-between">
            <Form.Item
              label={t("sim.spawn_cargo_group.time")}
              name="timestamp"
              rules={[{ required: true }]}
            >
              <TimePicker needConfirm={false} format="HH:mm" />
            </Form.Item>
            <Form.Item
              label={t("sim.spawn_cargo_group.range_end_time")}
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
            label={t("sim.spawn_cargo_group.gap_time")}
            name="activeInterval"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item
            label={t("sim.spawn_cargo_group.peripheral_group")}
            name="spawnGroupId"
            rules={[{ required: true }]}
          >
            <Select options={peripheralOptions} />
          </Form.Item>
          <Form.Item
            label={t("sim.spawn_cargo_group.spawn_all")}
            name="isSpawnAll"
          >
            <Switch
              value={isSpawnAll}
              onClick={() => setIsSpawnAll(!isSpawnAll)}
              onChange={(v) => handleSpawnAll(v)}
            />
          </Form.Item>
          <Form.Item
            label={t("sim.spawn_cargo_group.spawn_number")}
            name="spawnNumber"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} disabled={isSpawnAll} />
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

export default InsertRangeGroupSpawnCargoModal;
