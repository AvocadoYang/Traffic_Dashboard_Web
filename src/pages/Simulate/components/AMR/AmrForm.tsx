import useMap from "@/api/useMap";
import SubmitButton from "@/utils/SubmitButton";
import { Button, Form, Input, InputNumber, message, Modal, Select } from "antd";
import { Dispatch, FC, SetStateAction, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { EditFormType } from "./amr";
import useScriptRobot from "@/api/useScriptRobot";
import client from "@/api/axiosClient";
import { useMutation } from "@tanstack/react-query";
import useRobotType from "@/api/useRobotType";

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
  const { data: allRobotType } = useRobotType();

  const robotTypeOption = allRobotType?.map((y) => {
    return {
      label: `robot name: ${y.name}, prefix: ${y.value}`,
      value: y.id,
    };
  });

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
      "script_placement_location"
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

    form.setFieldValue("robot_type", info?.Robot_type.id);
    form.setFieldValue(
      "script_placement_location",
      info?.script_placement_location
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
            name="robot_type"
            label={"name"}
            rules={[{ required: true }]}
          >
            <Select options={robotTypeOption} />
          </Form.Item>

          <Form.Item
            name="car_number"
            label={"car number"}
            rules={[{ required: true }]}
          >
            <InputNumber />
          </Form.Item>

          <Form.Item
            name="script_placement_location"
            label={"initial location"}
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
