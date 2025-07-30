import client from "@/api/axiosClient";
import useName from "@/api/useAmrName";
import useAllMissionTitles from "@/api/useMissionTitle";
import usePeripheralName from "@/api/usePeripheralName";
import { MissionPriority } from "@/types/mission";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import {
  Button,
  Card,
  Flex,
  Form,
  InputNumber,
  message,
  Modal,
  Radio,
  Select,
  Switch,
  TimePicker,
} from "antd";
import dayjs from "dayjs";
import { FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useAtom, useAtomValue } from "jotai";
import {
  EditTask,
  IsEditSchedule,
  OpenEditModal,
  OpenScheduleTable,
  SelectTime,
} from "../../utils/mapStatus";

dayjs.extend(customParseFormat);

const Wrapper = styled.div`
  max-height: 72vh;
  overflow-y: auto;
  padding-right: 8px;
`;

type Mission_Type = "DYNAMIC" | "NORMAL" | "NOTIFY";

const InsertModal: FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { data: name } = useName();
  const [missionType, setMissionType] = useState<Mission_Type>("DYNAMIC");
  const { data: missionTitle } = useAllMissionTitles();
  const { data: peripheralName } = usePeripheralName();
  const [messageApi, contextHolder] = message.useMessage();

  const [isOpen, setIsOpen] = useAtom(OpenEditModal);
  const [isEdit, setIsEdit] = useAtom(IsEditSchedule);
  const [selectTime, setSelectTime] = useAtom(SelectTime);
  const editTask = useAtomValue(EditTask);

  const handleClose = () => {
    setIsOpen(false);
    setIsEdit(false);
    setSelectTime(null);
    form.resetFields();
  };

  const peripheralOption = peripheralName
    ?.filter((v) => v.name)
    .map((v) => ({
      label: `
    ${t("sim.timeline.name")}:${v.name ? v.name : t("sim.timeline.no_set")} 
    ${t("sim.timeline.location")}:${v.locationId} 
    ${t("sim.timeline.type")}:${v.type} 
    ${t("sim.timeline.level")}:${v.level !== null && v.level !== undefined ? v.level + 1 : t("sim.timeline.no_set")}
    `,
      value: v.peripheralNameId,
    }));

  const AmrOption: { value: null | string; label: string }[] | undefined =
    useMemo(() => {
      return name?.amrs
        .filter((c) => c.isReal === false)
        .map((m) => ({
          label: `${m.amrId} ${m.isReal ? "" : t("simulate")}`,
          value: m.amrId,
        }));
    }, [name, t]);

  const missionOption = [
    { value: "DYNAMIC", label: t("sim.insert_modal.dynamic") },
    { value: "NORMAL", label: t("sim.insert_modal.normal") },
    { value: "NOTIFY", label: t("sim.insert_modal.notify") },
  ];

  const missionOptions = missionTitle
    ?.filter((g) =>
      g.MissionTitleBridgeCategory.some(
        (s) => s.Category?.tagName === "normal-mission",
      ),
    )
    .map((v) => {
      return {
        value: v.id,
        label: v.name,
      };
    });

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      return client.post("api/simulate/insert-timeline-mission", payload);
    },
    onSuccess: () => {
      void messageApi.success("success");
      handleClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const editMutation = useMutation({
    mutationFn: (payload) => {
      return client.post("api/simulate/edit-timeline-mission", payload);
    },
    onSuccess: () => {
      void messageApi.success("success");
      handleClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const removeMutation = useMutation({
    mutationFn: (payload: { id: string; time: string }) => {
      return client.post("api/simulate/remove-timeline-mission", payload);
    },
    onSuccess: () => {
      void messageApi.success("success");
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleChangeMissionType = (type: Mission_Type) => {
    setMissionType(type);
    form.setFieldsValue({
      dynamic: [],
      normal: null,
      keyIn: null,
    });
  };

  const save = () => {
    const data = form.getFieldsValue();

    const formattedTimestamp = data.timestamp?.format("HH:mm");
    if (isEdit) {
      if (!selectTime) return;

      editMutation.mutate({
        ...data,
        id: editTask?.id,
        timestamp: formattedTimestamp,
        oldTimestamp: selectTime,
      });
    } else {
      saveMutation.mutate({
        ...data,
        timestamp: formattedTimestamp,
      });
    }
  };

  const removeSchedule = () => {
    if (!editTask) {
      messageApi.error("mission id not found");
      return;
    }

    removeMutation.mutate({ id: editTask?.id, time: editTask?.time });
    handleClose();
  };

  useEffect(() => {
    if (!isEdit || !editTask) return;

    const {
      type,
      amrId,
      priority,
      isEnable,
      styleRow,
      dynamicMission,
      normalMissionId,
      notifyMissionSourcePointName,
    } = editTask;

    form.setFieldsValue({
      timestamp: dayjs(selectTime, "HH:mm"),
      type,
      amrId,
      priority,
      isEnable,
      styleRow,
      dynamic: dynamicMission?.map((d) => ({
        loadFrom: d.loadFromId,
        offloadTo: d.offloadToId,
      })),
      normal: normalMissionId || null,
      notify: notifyMissionSourcePointName || null,
    });

    setMissionType(type as Mission_Type);
  }, [editTask, isEdit, form]);

  useEffect(() => {
    if (isEdit) return;

    form.setFieldValue("timestamp", dayjs(selectTime, "HH:mm"));
  }, [selectTime, isEdit, form]);

  return (
    <>
      {contextHolder}
      {isOpen ? (
        <Modal open={isOpen} onCancel={() => handleClose()} footer={[]}>
          <Wrapper>
            <h1>{t("sim.insert_modal.title")}</h1>

            <Form
              form={form}
              layout="vertical"
              initialValues={{
                type: "DYNAMIC",
                priority: 1,
                timestamp: dayjs(selectTime, "HH:mm"),
              }}
            >
              <Flex gap="large" justify="space-between">
                <Form.Item
                  label={t("sim.insert_modal.time")}
                  name="timestamp"
                  rules={[{ required: true, message: "Please select a time" }]}
                >
                  <TimePicker needConfirm={false} format="HH:mm" />
                </Form.Item>

                <Form.Item
                  label={t("sim.insert_modal.style_row")}
                  name="styleRow"
                  rules={[{ required: true, message: "Please select row" }]}
                >
                  <InputNumber min={0} max={10} />
                </Form.Item>

                {isEdit ? (
                  <Form.Item
                    label={t("sim.insert_modal.is_enable")}
                    name="isEnable"
                  >
                    <Switch />
                  </Form.Item>
                ) : null}
              </Flex>

              <Form.Item label={t("sim.insert_modal.amr")} name="amrId">
                <Select
                  showSearch
                  placeholder="Select an AMR"
                  options={AmrOption}
                />
              </Form.Item>

              <Form.Item
                label={`${t("main.mission_modal.dialog_mission.task_priority")}`}
                name="priority"
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

              <Form.Item label={t("sim.insert_modal.type")} name="type">
                <Select
                  options={missionOption}
                  value={missionType}
                  onChange={(v: Mission_Type) => handleChangeMissionType(v)}
                />
              </Form.Item>

              {missionType === "DYNAMIC" ? (
                <Form.List name="dynamic">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        <Card
                          key={key}
                          size="small"
                          style={{ marginBottom: 12 }}
                        >
                          <Flex wrap="wrap" gap={16} align="center">
                            <Form.Item
                              {...restField}
                              label={t("sim.insert_modal.load_from")}
                              name={[name, "loadFrom"]}
                              rules={[
                                { required: true, message: "Missing load" },
                              ]}
                              style={{ minWidth: 280, flex: 1 }}
                            >
                              <Select
                                options={peripheralOption}
                                placeholder={t("sim.insert_modal.load_from")}
                              />
                            </Form.Item>

                            <Form.Item
                              {...restField}
                              label={t("sim.insert_modal.offload_to")}
                              name={[name, "offloadTo"]}
                              rules={[
                                { required: true, message: "Missing offload" },
                              ]}
                              style={{ minWidth: 280, flex: 1 }}
                            >
                              <Select
                                options={peripheralOption}
                                placeholder={t("sim.insert_modal.offload_to")}
                              />
                            </Form.Item>

                            <MinusCircleOutlined
                              onClick={() => remove(name)}
                              style={{
                                fontSize: 18,
                                color: "red",
                                cursor: "pointer",
                              }}
                            />
                          </Flex>
                        </Card>
                      ))}
                      <Form.Item>
                        <Button
                          type="dashed"
                          onClick={() => add()}
                          block
                          icon={<PlusOutlined />}
                        >
                          {t("sim.insert_modal.add_field")}
                        </Button>
                      </Form.Item>
                    </>
                  )}
                </Form.List>
              ) : (
                []
              )}

              {missionType === "NORMAL" ? (
                <Form.Item
                  label={t("sim.insert_modal.type_normal")}
                  name="normal"
                  rules={[{ required: true, message: "Missing normal field" }]}
                >
                  <Select options={missionOptions} />
                </Form.Item>
              ) : (
                []
              )}

              {missionType === "NOTIFY" ? (
                <Form.Item
                  label={t("sim.insert_modal.type_notify")}
                  name="notify"
                  rules={[{ required: true, message: "Missing normal field" }]}
                >
                  <Select options={peripheralOption} />
                </Form.Item>
              ) : (
                []
              )}

              <Flex gap="middle">
                <Form.Item>
                  <Button onClick={save} type="primary">
                    {t("utils.submit")}
                  </Button>
                </Form.Item>

                {isEdit ? (
                  <Form.Item>
                    <Button danger onClick={removeSchedule} type="default">
                      {t("utils.delete")}
                    </Button>
                  </Form.Item>
                ) : (
                  []
                )}
              </Flex>
            </Form>
          </Wrapper>
        </Modal>
      ) : (
        []
      )}
    </>
  );
};

export default InsertModal;
