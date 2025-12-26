import { Button, Form, message, Modal, Select } from "antd";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { OpenAutoMission } from "../../global/jotai";
import { memo, useMemo } from "react";
import useName from "@/api/useAmrName";
import useAllMissionTitles from "@/api/useMissionTitle";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";

const AutoMission = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [formRegionSample] = Form.useForm();
  const { data: missionTitle } = useAllMissionTitles();
  const { data: name } = useName();
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
        ? [...options, { value: "null", label: t("utils.random") }]
        : undefined;
    }, [name, t]);

  const misOptions = useMemo(() => {
    if (!missionTitle) return [];
    return missionTitle?.map((v) => {
      return {
        value: v.id,
        label: v.name,
      };
    });
  }, [missionTitle]);

  const submitMutation = useMutation({
    mutationFn: (payload: { amrId: string | null; missionId: string }) => {
      return client.post("api/setting/add-cycle-mission", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      setOpenAutoMission(false);
    },
    onError: () => {
      void messageApi.error(t("utils.error"));
    },
  });

  const submit = () => {
    const data = formRegionSample.getFieldsValue() as {
      amrId: string;
      missionId: string;
    };

    if (!data.missionId) {
      messageApi.warning(t("utils.mission_is_required"));
      return;
    }

    const payload = {
      ...data,
      amrId: data.amrId === null ? null : data.amrId,
    };

    submitMutation.mutate(payload);
  };

  const [openAutoMission, setOpenAutoMission] = useAtom(OpenAutoMission);

  const handleCancel = () => {
    setOpenAutoMission(false);
  };

  return (
    <Modal
      title={t("toolbar.mission.cycle_mission")}
      open={openAutoMission}
      onClose={handleCancel}
      footer={[
        <Button
          key="submit"
          color="primary"
          variant="filled"
          onClick={() => submit()}
        >
          {t("utils.submit")}
        </Button>,
      ]}
      onCancel={handleCancel}
    >
      <Form
        form={formRegionSample}
        autoComplete="off"
        style={{ fontWeight: "bold" }}
      >
        {contextHolder}

        <Form.Item
          label={`${t("toolbar.mission.mission")}`}
          name="missionId"
          shouldUpdate
        >
          <Select
            showSearch
            options={misOptions}
            placeholder="Select a mission "
            onMouseDown={(e) => e.preventDefault()}
            onPopupScroll={(e) => {
              e.stopPropagation();
            }}
            onOpenChange={(open) => {
              if (open) {
                document.body.style.overflow = "hidden";
              } else {
                document.body.style.overflow = "auto";
              }
            }}
          />
        </Form.Item>

        <Form.Item
          label={`${t("mission.cycle_mission.car")}`}
          name="amrId"
          shouldUpdate
        >
          <Select
            showSearch
            placeholder="Select an AMR"
            options={AmrOption}
            onMouseDown={(e) => e.preventDefault()}
            onOpenChange={(open) => {
              if (open) {
                document.body.style.overflow = "hidden";
              } else {
                document.body.style.overflow = "auto";
              }
            }}
            onPopupScroll={(e) => {
              e.stopPropagation();
            }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default memo(AutoMission);
