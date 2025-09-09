import useAllMissionTitles from "@/api/useMissionTitle";
import { EEM } from "@/pages/Setting/utils/settingJotai";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { Flex, Form, message, Modal, Select, Tooltip, Typography } from "antd";
import { useAtom } from "jotai";
import { FC, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LeftSide, RightSide } from "./Form";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useElevatorInfo from "@/api/useElevatorInfo";

const EditElevatorModal: FC = () => {
  const [formLeft] = Form.useForm();
  const [formRight] = Form.useForm();
  const { t } = useTranslation();
  const [open, setOpen] = useAtom(EEM);
  const { data: elevator } = useElevatorInfo(open.locationId as string);
  const [messageApi, contextHolder] = message.useMessage();

  const handleCancel = () => {
    setOpen({ locationId: null, isOpen: false }); // Correctly set the isOpen property
  };

  type ElevatorPayload = {
    locationId: string;
    forkHeight: number;
    load: string;
    offload: string;
    name: string;
    description: string;
    disable: boolean;
    loadPriority: number;
    offloadPriority: number;
  };

  const editMutation = useMutation({
    mutationFn: (payload: ElevatorPayload) =>
      client.post("/api/setting/update-elevator-config", payload),
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      setOpen({ locationId: null, isOpen: false });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  useEffect(() => {
    if (open.isOpen && elevator) {
      formLeft.setFieldsValue({
        load: elevator.loadMissionId,
        offload: elevator.offloadMissionId,
        forkHeight: elevator.forkHeight,
      });
      formRight.setFieldsValue({
        name: elevator.name,
        description: elevator.description,
        disable: elevator.disable,
        loadPriority: elevator.loadPriority,
        offloadPriority: elevator.offloadPriority,
      });
    }
  }, [open.isOpen, elevator, formLeft, formRight]);

  const handleOk = async () => {
    if (!open.locationId) return;
    try {
      const leftValues = await formLeft.validateFields();
      const rightValues = await formRight.validateFields();

      const payload: ElevatorPayload = {
        locationId: open.locationId,
        forkHeight: leftValues.forkHeight,
        load: leftValues.load || null,
        offload: leftValues.offload || null,
        name: rightValues.name || null,
        description: rightValues.description || null,
        disable: rightValues.disable,
        loadPriority: rightValues.loadPriority,
        offloadPriority: rightValues.offloadPriority,
      };

      editMutation.mutate(payload);
    } catch (e) {
      console.error("Validation failed:", e);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        width={1530}
        styles={{
          body: { padding: "24px", background: "#fafafa" },
        }}
        open={open.isOpen}
        onCancel={handleCancel}
        onOk={handleOk}
      >
        <Flex>
          <LeftSide form={formLeft} />
          <RightSide form={formRight} locationId={open.locationId as string} />
        </Flex>
      </Modal>
    </>
  );
};

export default EditElevatorModal;
