import { FC, useState } from "react";
import { Form, message, Modal } from "antd";
import { FormCargo } from "./types";
import { useTranslation } from "react-i18next";
import CargoMissionForm from "./CargoMissionForm";
import LayerForm from "./LayerForm";
import { useAtom, useAtomValue } from "jotai";
import { BaseGlobalCargoInfoModal, GlobalCargoData } from "./jotaiState";
import { useCargoMutations } from "@/api/useCargoMutations";
import { editModalBodyStyle } from "../editModalStyle";
import PeripheralIdentity from "../PeripheralIdentity";

const CargoModal: FC = () => {
  const [settingForm] = Form.useForm();
  const [layerForm] = Form.useForm();
  const [messageApi, contextHolders] = message.useMessage();
  const { editMutation } = useCargoMutations(messageApi);
  const { id, locationId: locId, shelfInfo } = useAtomValue(GlobalCargoData);
  const [isEditModalOpen, setIsEditModalOpen] = useAtom(
    BaseGlobalCargoInfoModal,
  );
  const [isEditLayer, setIsEditLayer] = useState(false);
  const { t } = useTranslation();

  const handleEditOk = () => {
    const payload = settingForm.getFieldsValue() as FormCargo;
    const layerPayload = layerForm.getFieldsValue() as [];

    const errors = layerForm
      .getFieldsError()
      .filter(({ errors }) => errors.length > 0);

    if (errors.length > 0) {
      // 2. Show first error with message API
      messageApi.error(errors[0].errors[0]);
      return; // 3. Stop execution
    }

    layerForm.resetFields();
    setIsEditLayer(false);

    const mis = {
      id: id as string,
      loc: locId as string,
      name: payload.name || "",
      region: payload.region,
      directionId: payload.yaw,
      loadId: payload.load,
      offloadId: payload.offload,
      prepare_point_id: payload.prepare_point_id,
      placement_priority: payload.placement_priority,
      relationships: payload.relationships,
      layer: { ...layerPayload, isEditLayer },
    };

    editMutation.mutate(mis);
    setIsEditModalOpen(false);
  };

  const handleEditCancel = () => {
    setIsEditModalOpen(false);
  };

  if (!locId || !shelfInfo || !shelfInfo?.layer) return [];

  return (
    <>
      {contextHolders}

      {isEditModalOpen ? (
        <Modal
          title={
            <>
              <span
                style={{ fontSize: "1.5em", fontWeight: "bold" }}
              >{`${t("shelf.shelf")} ${locId}`}</span>
              <div style={{ marginTop: 8 }}>
                <PeripheralIdentity locationId={locId} besideClose={false} />
              </div>
            </>
          }
          open={isEditModalOpen}
          onOk={handleEditOk}
          onCancel={handleEditCancel}
          width={1530}
          styles={{ body: editModalBodyStyle }}
          okButtonProps={{
            size: "large",
            type: "primary",
            style: { borderRadius: 6 },
          }}
          cancelButtonProps={{ size: "large", style: { borderRadius: 6 } }}
          style={{ top: 20 }}
        >
          <div style={{ display: "flex", gap: "24px" }}>
            <CargoMissionForm
              locId={locId}
              form={settingForm}
              locName={shelfInfo?.name || ""}
            />
            {shelfInfo === undefined ? (
              <div
                style={{
                  color: "var(--c-danger)",
                  fontWeight: "bold",
                  padding: "16px",
                }}
              >
                {t("utils.error")}
              </div>
            ) : (
              <LayerForm
                layer={shelfInfo.layer}
                locId={locId}
                form={layerForm}
                setIsEditLayer={setIsEditLayer}
              />
            )}
          </div>
        </Modal>
      ) : (
        []
      )}
    </>
  );
};

export default CargoModal;
