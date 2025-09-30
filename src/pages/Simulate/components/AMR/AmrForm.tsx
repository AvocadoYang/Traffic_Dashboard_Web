import useMap from "@/api/useMap";
import SubmitButton from "@/utils/SubmitButton";
import { Button, Form, Input, InputNumber, message, Modal, Select } from "antd";
import { Dispatch, FC, SetStateAction, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { EditFormType } from "./amr";
import useScriptRobot from "@/api/useScriptRobot";
import client from "@/api/axiosClient";
import { useMutation } from "@tanstack/react-query";

const AmrForm: FC<{
  id: string;
  handleEditMutation: (payload: EditFormType) => void;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}> = ({ id, handleEditMutation, isOpen, setIsOpen }) => {
  const { data: map } = useMap();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { data: robot, refetch } = useScriptRobot();
  const [messageApi, contextHolder] = message.useMessage();

  const deleteMutation = useMutation({
    mutationFn: () => {
      return client.post("api/simulate/delete-robot", { id });
    },
    onSuccess: async () => {
      refetch();
      void messageApi.success(t("utils.success"));
      setIsOpen(false);
    },
    onError: () => {
      void messageApi.error(t("utils.error"));
    },
  });

  const deleteHandler = () => {
    deleteMutation.mutate();
  };

  const handleCancel = () => {
    setIsOpen(false);
  };
  const locationOptions = useMemo(() => {
    const items =
      map?.locations
        .filter((v) => v.areaType !== "STORAGE")
        .map((v) => ({ label: v.locationId, value: v.locationId })) || [];

    return [{ label: t("sim.robot.unset"), value: "unset" }, ...items];
  }, [map?.locations]);

  const editHandler = () => {
    const full_name = form.getFieldValue("full_name") as string;
    const script_placement_location = form.getFieldValue(
      "script_placement_location",
    ) as string;
    const loadSpeed = form.getFieldValue("loadSpeed") as number;
    const offloadSpeed = form.getFieldValue("offloadSpeed") as number;
    const move_speed = form.getFieldValue("move_speed") as number;

    const payload = {
      full_name,
      script_placement_location,
      loadSpeed,
      offloadSpeed,
      move_speed,
    };
    console.log(payload);
    handleEditMutation(payload);
  };

  useEffect(() => {
    if (!isOpen) return;

    const info = robot?.find((v) => v?.id === id);
    console.log(info);
    form.setFieldValue("full_name", info?.full_name);
    form.setFieldValue(
      "script_placement_location",
      info?.script_placement_location,
    );
    form.setFieldValue("loadSpeed", info?.load_speed);
    form.setFieldValue("offloadSpeed", info?.offload_speed);
    form.setFieldValue("move_speed", info?.move_speed);
  }, [isOpen]);

  return (
    <>
      {contextHolder}
      <Modal
        title={t("sim.robot.modal.edit")}
        open={isOpen}
        onCancel={handleCancel}
        footer={() => (
          <>
            <Button
              onClick={deleteHandler}
              loading={deleteMutation.isLoading}
              color="danger"
              variant="filled"
            >
              {t("utils.delete")}
            </Button>
            <SubmitButton form={form} onOk={editHandler} isModel />
          </>
        )}
      >
        <Form form={form} style={{ maxWidth: 600 }}>
          <Form.Item
            name="full_name"
            label={t("sim.robot.modal.full_name")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="script_placement_location"
            label={"initital location"}
            rules={[{ required: true }]}
          >
            <Select options={locationOptions} />
          </Form.Item>

          <Form.Item
            name="loadSpeed"
            label={"load speed"}
            rules={[{ required: true }]}
          >
            <InputNumber />
          </Form.Item>

          <Form.Item
            name="offloadSpeed"
            label={"offload speed"}
            rules={[{ required: true }]}
          >
            <InputNumber />
          </Form.Item>

          <Form.Item
            name="move_speed"
            label={"move speed"}
            rules={[{ required: true }]}
          >
            <InputNumber />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AmrForm;
