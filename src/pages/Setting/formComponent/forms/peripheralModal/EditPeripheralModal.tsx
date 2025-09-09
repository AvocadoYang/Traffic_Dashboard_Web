import { FC, useEffect } from "react";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { Button, Flex, Form, message, Modal } from "antd";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import client from "@/api/axiosClient";
import { useMutation } from "@tanstack/react-query";
import { Relation } from "@/api/useLoc";
import Config from "./Config";
import CargoInfoAtPeripheral from "./CargoInfo";
import { IsEditPeripheralModal } from "./jotai";
import { PeripheralTypes } from "@/types/peripheral";

const EditPeripheralModal: FC = () => {
  const [openModal, setOpenModal] = useAtom(IsEditPeripheralModal);
  const [formConfig] = Form.useForm();
  const [formCargo] = Form.useForm();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const updateMutation = useMutation({
    mutationFn: (data: {
      stationId: string;
      forkHeight: number;
      peripheralType: PeripheralTypes;
      activeLoad: boolean;
      activeOffload: boolean;
      loadMissionId: string;
      offloadMissionId: string;
      placement_priority: number;
      relationships: Relation;
      loadPriority: number;
      offloadPriority: number;
    }) => {
      return client.post(`/api/peripherals/update-config`, data);
    },
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      setOpenModal(null);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  useEffect(() => {
    if (openModal) {
      const relationshipArray = openModal.relationships
        ? Object.entries(openModal.relationships).map(
            ([relatedLocId, relationshipType]) => ({
              relatedLocId,
              relationshipType,
            }),
          )
        : [];

      formConfig.setFieldsValue({
        forkHeight: openModal.forkHeight,
        activeLoad: openModal.activeLoad,
        activeOffload: openModal.activeOffload,
        loadMissionId: openModal.loadMissionId,
        offloadMissionId: openModal.offloadMissionId,
        placement_priority: openModal.placement_priority,
        relationships: relationshipArray,
        loadPriority: openModal.loadPriority,
        offloadPriority: openModal.offloadPriority,
      });
    }
  }, [openModal, formConfig]);

  const handleCancel = () => {
    setOpenModal(null);
  };

  const handleSubmit = async () => {
    if (!openModal) {
      messageApi.warning("the station not found");
      return;
    }

    const values = await formConfig.validateFields();
    const cargoInfo = await formCargo.validateFields();
    // console.log(cargoInfo, 'cargo info');
    updateMutation.mutate({
      stationId: openModal.stationId,
      peripheralType: openModal.stationType,
      ...values,
      ...cargoInfo,
    });
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={null}
        open={openModal !== null}
        onCancel={handleCancel}
        centered
        width={1000}
        footer={
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={updateMutation.isLoading}
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

export default EditPeripheralModal;
