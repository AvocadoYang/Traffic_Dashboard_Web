import { Button, Flex, Form, message, Modal, Radio, Select, Tag } from "antd";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { OpenAssignMission } from "../../global/jotai";
import useAllMissionTitles from "@/api/useMissionTitle";
import { useEffect, useMemo, useState } from "react";
import useName from "@/api/useAmrName";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { ReloadOutlined } from "@ant-design/icons";
import styled from "styled-components";

enum MissionPriority {
  TRIVIAL, //沒差最後再做
  NORMAL, //普通
  PIVOTAL, //特別優先
  CRITICAL, // 緊急
}

type MissionFrom = {
  amrId: string | null;
  titleId: string;
  priority: MissionPriority;
};

const MissionOption = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  font-size: 16px;
  font-weight: 500;
  width: 100%;
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
`;

const LongSelect = styled(Select)`
  width: 100%; /* or fixed width like 500px */
  min-width: 400px;
  max-width: 700px;

  /* make dropdown wider */
  .ant-select-dropdown {
    min-width: 500px !important;
  }

  /* allow text wrapping in selected value */
  .ant-select-selection-item {
    white-space: normal !important;
    word-break: break-word;
    line-height: 1.4;
  }
`;

const DialogMission = () => {
  const { t } = useTranslation();
  const [missionForm] = Form.useForm();
  const { data, refetch: refetchMissions } = useAllMissionTitles();
  const { data: name, refetch: refetchAgv } = useName();
  const [messageApi, contextHolder] = message.useMessage();

  const [openDialogMission, setOpenDialogMission] = useAtom(OpenAssignMission);
  const [, setAmrGenre] = useState<string | null>(null);

  const reload = () => {
    refetchAgv();
    refetchMissions();
    void messageApi.success("reload");
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

  const canSubmitMutation = useMutation({
    mutationFn: (payload: MissionFrom) => {
      return client.post("api/missions/dialog-mission", payload, {
        headers: { authorization: `Bearer ${localStorage.getItem("_KMT")}` },
      });
    },
    onSuccess: (resData) => {
      console.log(resData);
      const errorMessage = resData?.data.message;
      if (!errorMessage || errorMessage === "success") {
        void messageApi.success(t("utils.success"));
        setOpenDialogMission(false);
        return;
      }
      const splitErrorMessage = errorMessage.split(" ");
      if (splitErrorMessage[0] === "[CustomError]") {
        console.log(splitErrorMessage);
        void messageApi.error("無法排除 聯絡FAE工程師");
      }
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const misOptions = useMemo(() => {
    if (!data) return [];
    return data
      ?.filter((g) =>
        g.MissionTitleBridgeCategory.some(
          (s) => s.Category?.tagName === "normal-mission"
        )
      )
      .map((v) => ({
        value: v.id,
        label: (
          <MissionOption>
            <span>{v.name}</span>
            <div className="tags">
              {v.MissionTitleBridgeCategory.filter(
                (f) => f.Category?.tagName !== "normal-mission"
              ).map((m) => (
                <Tag key={m.Category?.id} color={m.Category?.color}>
                  {m.Category?.tagName}
                </Tag>
              ))}
            </div>
          </MissionOption>
        ),
      }));
  }, [data]);

  const submit = () => {
    if (!data) return;
    const payload = missionForm.getFieldsValue() as MissionFrom;
    const { titleId, priority } = payload;
    if (!titleId || !priority) {
      void messageApi.error("尚未完成選項");
      return;
    }

    const newPayload = {
      ...payload,
      amrId: payload.amrId,
    };

    canSubmitMutation.mutate(newPayload);
  };

  const handleCancel = () => {
    setOpenDialogMission(false);
  };

  useEffect(() => {
    if (!openDialogMission) return;
    missionForm.setFieldValue("priority", MissionPriority.PIVOTAL);
  }, [openDialogMission]);

  if (!data || !openDialogMission) return [];
  return (
    <Modal
      title={t("main.card_name.new_mission")}
      open={openDialogMission}
      width={600}
      footer={[
        <Button
          key="submit"
          color="primary"
          variant="filled"
          onClick={submit}
          loading={canSubmitMutation.isLoading}
        >
          {t("utils.submit")}
        </Button>,
      ]}
      onCancel={handleCancel}
      style={{ fontWeight: "bold" }}
    >
      {contextHolder}
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
            onChange={(v: string) => setAmrGenre(v)}
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

        <Form.Item
          label={`${t("main.mission_modal.dialog_mission.task_priority")}`}
          name="priority"
          shouldUpdate
        >
          <Radio.Group>
            <Radio.Button value={MissionPriority.CRITICAL}>
              {t("main.mission_modal.dialog_mission.priority.CRITICAL")}
            </Radio.Button>
            <Radio.Button value={MissionPriority.PIVOTAL}>
              {t("main.mission_modal.dialog_mission.priority.PIVOTAL")}
            </Radio.Button>
            <Radio.Button value={MissionPriority.NORMAL}>
              {t("main.mission_modal.dialog_mission.priority.NORMAL")}
            </Radio.Button>
            <Radio.Button value={MissionPriority.TRIVIAL}>
              {t("main.mission_modal.dialog_mission.priority.TRIVIAL")}
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item label={`${t("toolbar.mission.mission")}`} name="titleId">
          <LongSelect
            options={misOptions}
            placeholder="Select a mission"
            size="large"
            dropdownMatchSelectWidth={false} // allows dropdown to be wider than input
          />
        </Form.Item>

        <Flex align="center" justify="center">
          <Button icon={<ReloadOutlined />} onClick={() => reload()}>
            {t("main.mission_modal.dialog_mission.reload")}
          </Button>
        </Flex>
      </Form>
    </Modal>
  );
};

export default DialogMission;
