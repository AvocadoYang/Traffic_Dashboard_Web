import useMap from "@/api/useMap";
import SubmitButton from "@/utils/SubmitButton";
import { Button, Form, InputNumber, message, Modal, Select } from "antd";
import { Dispatch, FC, SetStateAction, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import useScriptRobot from "@/api/useScriptRobot";
import client from "@/api/axiosClient";
import { useMutation } from "@tanstack/react-query";
import useRobotType from "@/api/useRobotType";

export type EditFormType = {
  id?: string;
  robotTypeId: string;
  carNum: number;
  script_placement_location: string;
  loadSpeed: number;
  offloadSpeed: number;
  move_speed: number;
};

/** 模擬車的參數 (車種、編號、起始點位、速度), 從舊模擬頁搬過來 */
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
      label: t("sim.robot_option", { name: y.name, prefix: y.value }),
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

  const locationOptions = useMemo(() => {
    const items =
      map?.locations
        .filter((v) => v.areaType !== "STORAGE")
        .map((v) => ({ label: v.locationId, value: v.locationId })) || [];

    return [{ label: t("sim.robot.unset"), value: "unset" }, ...items];
  }, [map?.locations]);

  const editHandler = () => {
    handleEditMutation({
      robotTypeId: form.getFieldValue("robot_type") as string,
      carNum: form.getFieldValue("car_number") as number,
      script_placement_location: form.getFieldValue(
        "script_placement_location",
      ) as string,
      loadSpeed: form.getFieldValue("loadSpeed") as number,
      offloadSpeed: form.getFieldValue("offloadSpeed") as number,
      move_speed: form.getFieldValue("move_speed") as number,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    const info = robot?.find((v) => v?.id === id);
    const nameArr = info?.full_name.split("-") ?? [];

    form.setFieldValue("robot_type", info?.Robot_type.id);
    form.setFieldValue("car_number", nameArr[nameArr.length - 1]);
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
        onCancel={() => setIsOpen(false)}
        footer={() => (
          <>
            <Button
              onClick={() => deleteMutation.mutate()}
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
            <Select options={locationOptions} showSearch />
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
