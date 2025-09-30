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
  SelectTime,
} from "../../../utils/mapStatus";
import { Mission_Schedule } from "@/types/timeline";

dayjs.extend(customParseFormat);

const Wrapper = styled.div`
  max-height: 72vh;
  overflow-y: auto;
  padding-right: 8px;
`;

type Mission_Type = "DYNAMIC" | "NORMAL" | "NOTIFY";

interface FormValues {
  timestamp: dayjs.Dayjs;
  styleRow: number;
  isEnable?: boolean;
  amrId: string;
  priority: MissionPriority;
  missionType: Mission_Type;
  dynamic?: { loadFrom: string; offloadTo: string }[];
  normal?: string | null;
  notify?: string | null;
}
export interface EditTimelineMissionPayload {
  id: string;
  oldTimestamp: string;
  timestamp: string;
  type: "MISSION";
  isEnable: boolean;
  styleRow: number;

  timelineMission: {
    amrId: string;
    priority: number;
    type: "DYNAMIC" | "NORMAL" | "NOTIFY";
    normalMissionId?: string | null;
    notifyMissionSourcePointNameId?: string | null;
    dynamicMission?:
      | {
          loadFromId: string;
          offloadToId: string;
        }[]
      | null;
  } | null;
}

const InsertModal: FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm<FormValues>();
  const { data: name } = useName();
  const [missionType, setMissionType] = useState<Mission_Type>("DYNAMIC");
  const { data: missionTitle } = useAllMissionTitles();
  const { data: peripheralName } = usePeripheralName();
  const [messageApi, contextHolder] = message.useMessage();

  const [isOpen, setIsOpen] = useAtom(OpenEditModal);
  const [isEdit, setIsEdit] = useAtom(IsEditSchedule);
  const [selectTime, setSelectTime] = useAtom(SelectTime);
  const editTask = useAtomValue(EditTask);
  const [localEditTask, setLocalEditTask] = useState<Mission_Schedule | null>(
    null,
  ); // 沒有它會暴 id 會不正確

  const handleClose = () => {
    setIsOpen(false);
    setIsEdit(false);
    setSelectTime(null);
    setLocalEditTask(null);
    form.resetFields();
  };

  const peripheralOption = useMemo(
    () =>
      peripheralName
        ?.filter((v) => v.name)
        .map((v) => ({
          label: `
            ${t("sim.timeline.name")}: ${v.name || t("sim.timeline.no_set")}
            ${t("sim.timeline.location")}: ${v.locationId}
            ${t("sim.timeline.type")}: ${v.type}
            ${t("sim.timeline.level")}: ${
              v.level !== null && v.level !== undefined
                ? v.level + 1
                : t("sim.timeline.no_set")
            }
          `,
          value: v.peripheralNameId,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)) || [],
    [peripheralName, t],
  );

  const amrOption = useMemo(() => {
    const options =
      name?.amrs
        .filter((c) => c.isReal === false)
        .map((m) => ({
          label: `${m.amrId} ${m.isReal ? "" : t("simulate")}`,
          value: m.amrId,
        })) || [];

    return options
      ? [...options, { value: "none", label: t("utils.random") }]
      : [];
  }, [name, t]);

  const missionOption = useMemo(
    () => [
      { value: "DYNAMIC", label: t("sim.insert_modal.dynamic") },
      { value: "NORMAL", label: t("sim.insert_modal.normal") },
      { value: "NOTIFY", label: t("sim.insert_modal.notify") },
    ],
    [t],
  );

  const missionOptions = useMemo(
    () =>
      missionTitle
        ?.filter((g) =>
          g.MissionTitleBridgeCategory.some(
            (s) => s.Category?.tagName === "normal-mission",
          ),
        )
        .map((v) => ({
          value: v.id,
          label: v.name,
        })) || [],
    [missionTitle],
  );

  const saveMutation = useMutation({
    mutationFn: (
      payload: Omit<Mission_Schedule, "id" | "isEnable" | "timelineMission"> & {
        timelineMission: NonNullable<Mission_Schedule["timelineMission"]>;
      },
    ) => {
      return client.post("api/simulate/insert-timeline-mission", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      handleClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const editMutation = useMutation({
    mutationFn: (payload: EditTimelineMissionPayload) => {
      return client.post("api/simulate/edit-timeline-mission", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      handleClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const removeMutation = useMutation({
    mutationFn: (payload: { id: string; time: string }) => {
      return client.post("api/simulate/remove-timeline-mission", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      handleClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleChangeMissionType = (type: Mission_Type) => {
    setMissionType(type);
    form.setFieldsValue({
      dynamic: [],
      normal: null,
      notify: null,
    });
  };

  const save = () => {
    form
      .validateFields()
      .then((data: FormValues) => {
        const formattedTimestamp = data.timestamp?.format("HH:mm");
        const base = {
          timestamp: formattedTimestamp,
          amrId: data.amrId,
          priority: data.priority,
          type: data.missionType,
          styleRow: data.styleRow,
          dynamic: data.missionType === "DYNAMIC" ? data.dynamic : undefined,
          normal: data.missionType === "NORMAL" ? data.normal : undefined,
          notify: data.missionType === "NOTIFY" ? data.notify : undefined,
        };

        if (isEdit) {
          if (!localEditTask?.id || !selectTime) {
            void messageApi.error(t("sim.insert_modal.error_missing_id"));
            return;
          }

          editMutation.mutate({
            id: localEditTask.id,
            oldTimestamp: selectTime,
            timestamp: formattedTimestamp,
            type: "MISSION",
            isEnable: data.isEnable ?? true,
            styleRow: data.styleRow,
            timelineMission: {
              amrId: data.amrId,
              priority: data.priority,
              type: data.missionType,
              normalMissionId:
                data.missionType === "NORMAL" ? data.normal : null,
              notifyMissionSourcePointNameId:
                data.missionType === "NOTIFY" ? data.notify : null,
              dynamicMission:
                data.missionType === "DYNAMIC" && data.dynamic
                  ? data.dynamic.map((d) => ({
                      loadFromId: d.loadFrom,
                      offloadToId: d.offloadTo,
                    }))
                  : null,
            },
          });
        } else {
          saveMutation.mutate(base as any);
        }
      })
      .catch(() => {
        void messageApi.error(t("sim.insert_modal.validation_error"));
      });
  };

  const removeSchedule = () => {
    if (!editTask?.id || !editTask?.time) {
      void messageApi.error(t("sim.insert_modal.error_missing_id"));
      return;
    }
    removeMutation.mutate({ id: editTask.id, time: editTask.time });
  };

  useEffect(() => {
    if (!isEdit || !editTask) return;
    // console.log(editTask,' edit===')
    setLocalEditTask(editTask);

    if (!localEditTask) {
      setLocalEditTask(editTask);
      form.setFieldsValue({
        timestamp: dayjs(editTask.time, "HH:mm"),
        styleRow: editTask.styleRow,
        isEnable: editTask.isEnable,
        amrId: editTask.timelineMission?.amrId,
        priority: editTask.timelineMission?.priority,
        missionType: editTask.timelineMission?.type as Mission_Type,
        dynamic: editTask.timelineMission?.dynamicMission?.map((d) => ({
          loadFrom: d.loadFromId,
          offloadTo: d.offloadToId,
        })),
        normal: editTask.timelineMission?.normalMissionId,
        notify: editTask.timelineMission?.notifyMissionSourcePointName,
      });
      setMissionType(editTask.timelineMission?.type as Mission_Type);
    }
  }, [isEdit, form, localEditTask]);

  // useEffect(() => {
  //   if (!isEdit && selectTime) {
  //     form.setFieldValue("timestamp", dayjs(selectTime, "HH:mm"));
  //   }
  // }, [selectTime, isEdit, form]);

  return (
    <>
      {contextHolder}
      <Modal open={isOpen} onCancel={handleClose} footer={[]} zIndex={10}>
        <Wrapper>
          <h1>
            {isEdit
              ? t("sim.insert_modal.edit_title")
              : t("sim.insert_modal.title")}
          </h1>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              missionType: "DYNAMIC",
              priority: MissionPriority.NORMAL,
              timestamp: selectTime ? dayjs(selectTime, "HH:mm") : undefined,
              styleRow: 0,
              isEnable: true,
            }}
          >
            <Flex gap="large" justify="space-between">
              <Form.Item
                label={t("sim.insert_modal.time")}
                name="timestamp"
                rules={[
                  {
                    required: true,
                    message: t("sim.insert_modal.time_required"),
                  },
                ]}
              >
                <TimePicker needConfirm={false} format="HH:mm" />
              </Form.Item>
              <Form.Item
                label={t("sim.insert_modal.style_row")}
                name="styleRow"
                rules={[
                  {
                    required: true,
                    message: t("sim.insert_modal.row_required"),
                  },
                ]}
              >
                <InputNumber min={0} max={10} />
              </Form.Item>
              {isEdit && (
                <Form.Item
                  label={t("sim.insert_modal.is_enable")}
                  name="isEnable"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              )}
            </Flex>
            <Form.Item
              label={t("sim.insert_modal.amr")}
              name="amrId"
              rules={[
                { required: true, message: t("sim.insert_modal.amr_required") },
              ]}
            >
              <Select
                showSearch
                placeholder={t("sim.insert_modal.select_amr")}
                options={amrOption}
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
            <Form.Item
              label={t("sim.insert_modal.type")}
              name="missionType"
              rules={[
                {
                  required: true,
                  message: t("sim.insert_modal.type_required"),
                },
              ]}
            >
              <Select
                options={missionOption}
                onChange={handleChangeMissionType}
              />
            </Form.Item>
            {missionType === "DYNAMIC" && (
              <Form.List
                name="dynamic"
                rules={[
                  {
                    validator: async (_, value) => {
                      if (!value || value.length === 0) {
                        return Promise.reject(
                          new Error(t("sim.insert_modal.dynamic_required")),
                        );
                      }
                    },
                  },
                ]}
              >
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Card key={key} size="small" style={{ marginBottom: 12 }}>
                        <Flex wrap="wrap" gap={16} align="center">
                          <Form.Item
                            {...restField}
                            label={t("sim.insert_modal.load_from")}
                            name={[name, "loadFrom"]}
                            rules={[
                              {
                                required: true,
                                message: t("sim.insert_modal.load_required"),
                              },
                            ]}
                            style={{ minWidth: 280, flex: 1 }}
                          >
                            <Select
                              options={peripheralOption}
                              showSearch
                              filterOption={(input, option) =>
                                (option?.label ?? "")
                                  .toString()
                                  .toLowerCase()
                                  .includes(input.toLowerCase())
                              }
                              placeholder={t("sim.insert_modal.load_from")}
                            />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            label={t("sim.insert_modal.offload_to")}
                            name={[name, "offloadTo"]}
                            rules={[
                              {
                                required: true,
                                message: t("sim.insert_modal.offload_required"),
                              },
                            ]}
                            style={{ minWidth: 280, flex: 1 }}
                          >
                            <Select
                              showSearch
                              filterOption={(input, option) =>
                                (option?.label ?? "")
                                  .toString()
                                  .toLowerCase()
                                  .includes(input.toLowerCase())
                              }
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
            )}
            {missionType === "NORMAL" && (
              <Form.Item
                label={t("sim.insert_modal.type_normal")}
                name="normal"
                rules={[
                  {
                    required: true,
                    message: t("sim.insert_modal.normal_required"),
                  },
                ]}
              >
                <Select
                  options={missionOptions}
                  placeholder={t("sim.insert_modal.select_normal")}
                />
              </Form.Item>
            )}
            {missionType === "NOTIFY" && (
              <Form.Item
                label={t("sim.insert_modal.type_notify")}
                name="notify"
                rules={[
                  {
                    required: true,
                    message: t("sim.insert_modal.notify_required"),
                  },
                ]}
              >
                <Select
                  options={peripheralOption}
                  placeholder={t("sim.insert_modal.select_notify")}
                />
              </Form.Item>
            )}
            <Flex gap="middle">
              <Form.Item>
                <Button
                  onClick={save}
                  type="primary"
                  loading={saveMutation.isPending || editMutation.isPending}
                >
                  {t("utils.submit")}
                </Button>
              </Form.Item>
              {isEdit && (
                <Form.Item>
                  <Button
                    danger
                    onClick={removeSchedule}
                    type="default"
                    loading={removeMutation.isPending}
                  >
                    {t("utils.delete")}
                  </Button>
                </Form.Item>
              )}
            </Flex>
          </Form>
        </Wrapper>
      </Modal>
    </>
  );
};

export default InsertModal;
