import { Form, message, Modal, Select,Radio, RadioChangeEvent } from "antd";
import { useAtom } from "jotai";
import React, { useMemo, useState } from "react";
import { OpenDirect } from "../../global/jotai";
import useName from "@/api/useAmrName";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { useMutation } from "@tanstack/react-query";
import { Err } from "@/utils/responseErr";
import { SelectCommonPlacement } from "antd/es/_util/motion";

const DirectMove = () => {
  const [open, setOpen] = useAtom(OpenDirect);
  const { data: name, refetch: refetchAgv } = useName();
  const [missionForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();
  const [placement, SetPlacement] = useState<string>(`F`);

  const placementChange = (e: RadioChangeEvent) => {
    SetPlacement(e.target.value);
  };

  const editMutation = useMutation({
    mutationFn: (payload: { amrId: string; locationId: string | null, control: string }) => {
      return client.post("api/missions/direct-move", payload);
    },
    onSuccess: async () => {
      messageApi.success(t("utils.success"));
      missionForm.resetFields();
      setOpen({ open: false, locationId: null });
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    },
  });

  const handleCancel = () => {
    setOpen({ locationId: null, open: false });
  };

  const send = () => {
    const amrId = missionForm.getFieldValue("amrId") as string;
    const control = missionForm.getFieldValue("direction") ?missionForm.getFieldValue("direction") : "F";

    editMutation.mutate({ amrId, locationId: open.locationId, control });
  };

  const AmrOption: { value: string; label: string }[] | undefined =
    useMemo(() => {
      let options;
      if (name?.isSim) {
        options = name.amrs
          .filter((a) => a.isReal === false)
          .map((m) => ({ label: m.amrId, value: m.amrId }));
      } else {
        options = name?.amrs
          .filter((a) => a.isReal === true)
          .map((m) => ({ label: m.amrId, value: m.amrId }));
      }
      return options
        ? [...options, { value: "none", label: t("utils.random") }]
        : undefined;
    }, [name, t]);

  return (
    <>
      {contextHolder}
      <Modal
        title={t("dialog.direct")}
        open={open.open}
        onCancel={handleCancel}
        onOk={send}
      >
        <Form
          form={missionForm}
          labelCol={{ span: 5 }}
          wrapperCol={{ span: 14 }}
          layout="horizontal"
          size="large"
        >
          <Form.Item label={`${t("mission.cycle_mission.car")}`} name="amrId">
            <Select
              options={AmrOption}
              placeholder={"Select an AMR"}
              onMouseDown={(e) => e.preventDefault()}
              onPopupScroll={(e) => {
                e.stopPropagation();
              }}
              onDropdownVisibleChange={(open) => {
                if (open) {
                  document.body.style.overflow = "hidden";
                } else {
                  document.body.style.overflow = "auto";
                }
              }}
            />
  
          </Form.Item>
          <Form.Item label={`${t("utils.direction")}`} name="direction">
          <Radio.Group value={placement} onChange={placementChange}>
              <Radio.Button value="F">{t('car_control_translate.F')}</Radio.Button>
              <Radio.Button value="B">{t(`car_control_translate.B`)}</Radio.Button>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default DirectMove;
