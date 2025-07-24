import client from "@/api/axiosClient";
import useName from "@/api/useAmrName";
import useMap from "@/api/useMap";
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
  Input,
  message,
  Modal,
  Radio,
  Select,
  Space,
} from "antd";
import { Dispatch, FC, SetStateAction, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const Wrapper = styled.div`
  max-height: 72vh;
  overflow-y: auto;
  padding-right: 8px;
`;

type Mission_Type = "DYNAMIC" | "NORMAL" | "NOTIFY";

const InsertModal: FC<{
  isOpen: boolean;
  selectTime: string | null;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  handleClose: () => void;
}> = ({ isOpen, selectTime, setIsOpen, handleClose }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { data: name } = useName();
  const [missionType, setMissionType] = useState<Mission_Type>("DYNAMIC");
  const { data: missionTitle } = useAllMissionTitles();
  const mapData = useMap();
  const { data: peripheralName } = usePeripheralName();
  const [messageApi, contextHolder] = message.useMessage();

  const peripheralOption = peripheralName?.map((v) => ({
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
    saveMutation.mutate({ ...data, timestamp: selectTime });
    console.log(data);
  };

  return (
    <>
      {contextHolder}
      {isOpen ? (
        <Modal open={isOpen} onCancel={handleClose} footer={[]}>
          <Wrapper>
            <h1>{t("sim.insert_modal.title")}</h1>

            <Form
              form={form}
              layout="vertical"
              initialValues={{
                type: "DYNAMIC",
                priority: 1,
              }}
            >
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

              <Form.Item>
                <Button onClick={save} type="primary">
                  {t("utils.submit")}
                </Button>
              </Form.Item>
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
