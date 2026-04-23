import { FC, useEffect } from "react";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { Button, Flex, Form, message, Modal } from "antd";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import client from "@/api/axiosClient";
import { useMutation } from "@tanstack/react-query";
import { Relation } from "@/api/useLoc";
import { PeripheralTypes } from "@/types/peripheral";
import {
  IsOpenStackModal,
  EditStackConfig,
} from "@/pages/Setting/formComponent/forms/peripheralModal/jotai";
import Config from "./Config";
import CargoInfoAtPeripheral from "./CargoInfo";

const EditStackModal: FC = () => {
  const [editStack, setEditStack] = useAtom(EditStackConfig);
  const [open, setOpen] = useAtom(IsOpenStackModal);
  const [formConfig] = Form.useForm();
  const [formCargo] = Form.useForm();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const updateMutation = useMutation({
    mutationFn: (data: {
      stationId: string;
      // activeLoad: boolean;
      // activeOffload: boolean;
      loadMissionId: string;
      offloadMissionId: string;

      loadPriority: number;
      offloadPriority: number;
    }) => {
      return client.post(`/api/setting/update-stack-config`, data);
    },
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      setEditStack(null);
      setOpen(false);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  useEffect(() => {
    if (editStack) {
      console.log(editStack);
      formConfig.setFieldsValue({
        // activeLoad: editStack.activeLoad,
        // activeOffload: editStack.activeOffload,
        loadMissionId: editStack.loadMissionId,
        offloadMissionId: editStack.offloadMissionId,
        loadPriority: editStack.loadPriority,
        offloadPriority: editStack.offloadPriority,
      });

      formCargo.setFieldValue("name", editStack.name);
      formCargo.setFieldValue("description", editStack.description);
      formCargo.setFieldValue("disable", editStack.disable);
      formCargo.setFieldValue("loadPriority", editStack.loadPriority);
      formCargo.setFieldValue("offloadPriority", editStack.offloadPriority);
    }
  }, [editStack, formConfig]);

  const handleCancel = () => {
    setEditStack(null);
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (!editStack) {
      messageApi.warning("the station not found");
      return;
    }

    const values = await formConfig.validateFields();
    const cargoInfo = await formCargo.validateFields();
    // console.log(cargoInfo, 'cargo info');
    updateMutation.mutate({
      stationId: editStack.stationId,
      peripheralType: "STACK",
      ...values,
      ...cargoInfo,
    });
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={null}
        open={open}
        onCancel={handleCancel}
        centered
        width={1000}
        footer={
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={updateMutation.isPending}
          >
            {t("utils.save")}
          </Button>
        }
      >
        <Flex>
          <Config formConfig={formConfig} />
          <CargoInfoAtPeripheral form={formCargo} />
        </Flex>
      </Modal>
    </>
  );
};

export default EditStackModal;
