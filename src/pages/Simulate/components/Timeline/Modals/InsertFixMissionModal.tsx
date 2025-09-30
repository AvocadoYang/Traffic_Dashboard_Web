import client from "@/api/axiosClient";
import useName from "@/api/useAmrName";
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
  TimePicker,
} from "antd";
import dayjs from "dayjs";
import { FC, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useAtom } from "jotai";
import {
  IsEditSchedule,
  OpenFixedEventMissionEditModal,
  SelectTime,
} from "../../../utils/mapStatus";
import usePeripheralGroup from "@/api/usePeripheralGroup";
import { Mission_Schedule } from "@/types/timeline";

dayjs.extend(customParseFormat);

const Wrapper = styled.div`
  max-height: 72vh;
  overflow-y: auto;
  padding-right: 8px;
`;

interface FormValues {
  timestamp: dayjs.Dayjs;
  end_timestamp: dayjs.Dayjs;
  styleRow: number;
  amrId: string;
  priority: MissionPriority;
  activeInterval: number; // minutes
  task: {
    loadGroupId: string;
    offloadGroupId: string;
  }[];
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

const InsertFixMissionModal: FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm<FormValues>();
  const { data: name } = useName();
  const { data: peripheralGroup } = usePeripheralGroup();
  const [messageApi, contextHolder] = message.useMessage();

  const [isOpen, setIsOpen] = useAtom(OpenFixedEventMissionEditModal);
  const [isEdit, setIsEdit] = useAtom(IsEditSchedule);
  const [selectTime, setSelectTime] = useAtom(SelectTime);
  const [localEditTask, setLocalEditTask] = useState<Mission_Schedule | null>(
    null
  ); // 沒有它會暴 id 會不正確

  const peripheralOption = useMemo(
    () =>
      peripheralGroup
        ?.filter((v) => v.name)
        .map((v) => ({
          label: `
            ${t("sim.timeline.name")}: ${v.name}
            ${t("sim.timeline.location")}: ${v.description || "none"}
          `,
          value: v.id,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)) || [],
    [peripheralGroup, t]
  );

  const handleClose = () => {
    setIsOpen(false);
    setIsEdit(false);
    setSelectTime(null);
    setLocalEditTask(null);
    form.resetFields();
  };

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

  const saveMutation = useMutation({
    mutationFn: (
      payload: Omit<Mission_Schedule, "id" | "isEnable" | "timelineMission"> & {
        timelineMission: NonNullable<Mission_Schedule["timelineMission"]>;
      }
    ) => {
      return client.post(
        "api/simulate/insert-timeline-random-group-to-group-mission",
        payload
      );
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      handleClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const save = () => {
    form
      .validateFields()
      .then((data: FormValues) => {
        if (
          data.timestamp &&
          data.end_timestamp &&
          dayjs(data.end_timestamp).isBefore(dayjs(data.timestamp))
        ) {
          message.warning("End time must be later than start time");
          return;
        }

        const formattedTimestamp = data.timestamp?.format("HH:mm");
        const formattedTimestampRangeEnd = data.end_timestamp?.format("HH:mm");
        const base = {
          timestamp: formattedTimestamp,
          end_timestamp: formattedTimestampRangeEnd,
          amrId: data.amrId,
          priority: data.priority,
          styleRow: data.styleRow,
          activeInterval: data.activeInterval,
          task: data.task,
        };
        // console.log(base);

        saveMutation.mutate(base as any);
      })
      .catch(() => {
        void messageApi.error(t("sim.insert_modal.validation_error"));
      });
  };

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
                label={t("sim.insert_modal.range_end_time")}
                name="end_timestamp"
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
                <InputNumber disabled min={0} max={10} />
              </Form.Item>
            </Flex>

            <Form.Item
              label={t("sim.insert_modal.gap_time")}
              name="activeInterval"
              rules={[
                { required: true, message: t("sim.insert_modal.amr_required") },
              ]}
            >
              <InputNumber min={1} />
            </Form.Item>

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

            <Form.List
              name="task"
              rules={[
                {
                  validator: async (_, value) => {
                    if (!value || value.length === 0) {
                      return Promise.reject(
                        new Error(t("sim.insert_modal.dynamic_required"))
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
                          name={[name, "loadGroupId"]}
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
                          name={[name, "offloadGroupId"]}
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

            <Flex gap="middle">
              <Form.Item>
                <Button onClick={save} type="primary">
                  {t("utils.submit")}
                </Button>
              </Form.Item>
            </Flex>
          </Form>
        </Wrapper>
      </Modal>
    </>
  );
};

export default InsertFixMissionModal;
