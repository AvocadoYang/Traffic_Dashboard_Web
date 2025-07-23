import {
  Button,
  Col,
  Form,
  Modal,
  Row,
  Input,
  Select,
  Flex,
  message,
} from "antd";
import { FC, useState, useMemo, useEffect } from "react";
import { nanoid } from "nanoid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import useAMRsample from "@/api/useAMRsample";
import useCategory from "@/api/useCategory";
import { MTType } from "@/api/useMissionTitle";
import client from "@/api/axiosClient";
import { MissionListType } from "./mission";
import FormHr from "@/pages/Setting/utils/FormHr";
import MissionForm from "./MissionForm";
import SwitchTable from "./SwitchTable";
import useAllMissionTitlesDetail from "@/api/useMissionTitleDetail";

const EditMissionPanel: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const [formMission] = Form.useForm();
  const [createMissionForm] = Form.useForm();
  const [search, setSearch] = useState("");
  const [missionName, setMissionName] = useState("");
  const [selectedMissionKey, setSelectedMissionKey] = useState("");
  const [selectedMissionCar, setSelectedMissionCar] = useState("");
  const [openMissionModel, setOpenMissionModel] = useState(false);
  const [openWithCreateMission, setOpenWithCreateMission] = useState(false);
  const [editMissionKey, setEditMissionKey] = useState("");
  const [loadingTitle, setLoadingTitle] = useState(false);
  const [canBeCreate, setCanBeCreate] = useState(false);
  const [tag, setTag] = useState<string[]>([]);
  const { data: amrs } = useAMRsample();
  const { data: allMissionTitle } = useAllMissionTitlesDetail();
  const { data: cat } = useCategory();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const catOption = cat?.map((v) => ({ value: v.id, label: v.tagName })) || [];
  const filterMissionData = useMemo(
    () => allMissionTitle?.filter((m) => m.name.includes(search)) || [],
    [search, allMissionTitle],
  );

  const addMutation = useMutation(
    (newMission: MissionListType) =>
      client.post("api/setting/add-mission-title", newMission),
    {
      onSuccess: async () => {
        await queryClient.refetchQueries({
          queryKey: ["all-mission-title-detail"],
        });
      },
    },
  );

  const refetchData = async () => {
    setLoadingTitle(true);
    await queryClient.refetchQueries({ queryKey: ["all-mission-title"] });
    setLoadingTitle(false);
  };

  const handleAdd = () => {
    if (!canBeCreate) {
      messageApi.warning(t("mission.add_mission.tag_warn"));
      return;
    }
    const formData = createMissionForm.getFieldsValue(true) as MissionListType;
    if (!formData.name) {
      messageApi.warning(t("mission.add_mission.empty_warn"));
      return;
    }
    if (!formData.robot_type_id) {
      messageApi.warning(t("mission.add_mission.empty_car_warn"));
      return;
    }
    if (allMissionTitle?.some((item) => item.name === formData.name)) {
      messageApi.warning(t("mission.add_mission.duplicate_warn"));
      return;
    }
    amrs?.forEach(
      (item) =>
        item.name === formData.robot_type_id &&
        (formData.robot_type_id = item.id),
    );
    addMutation.mutate({ ...formData, key: nanoid() });
    createMissionForm.setFieldValue("name", "");
    setOpenWithCreateMission(false);
  };

  const newCarList = amrs?.map((v) => ({ label: v.name, value: v.id }));
  const createMissionBtn = () => {
    if (!amrs?.[0]?.id) {
      messageApi.warning(t("mission.add_mission.empty_warn"));
      return;
    }
    setOpenWithCreateMission(true);
    createMissionForm.setFieldValue("robot_type_id", amrs[0].name);
  };

  useEffect(() => {
    const getName = tag.map((v) => {
      const c = catOption.find((f) => f.value === v);
      return c?.label || "";
    });

    const hasNormal = getName.includes("normal-mission");
    const hasDynamic = getName.includes("dynamic-mission");

    if ((hasNormal || hasDynamic) && !(hasNormal && hasDynamic)) {
      setCanBeCreate(true);
    } else {
      setCanBeCreate(false);
    }
  }, [tag]);

  return (
    <>
      {contextHolder}
      <div>
        <h3 className="drop_button_style" {...listeners} {...attributes}>
          {t("mission.add_mission.title")}
        </h3>
        <FormHr />
        <Flex gap="middle" justify="flex-start" align="start" vertical>
          <SwitchTable
            selectedMissionKey={selectedMissionKey}
            setEditMissionKey={setEditMissionKey}
            setOpenMissionModel={setOpenMissionModel}
            setSelectedMissionKey={setSelectedMissionKey}
            setSelectedMissionCar={setSelectedMissionCar}
            setMissionName={setMissionName}
            missionName={missionName}
            selectedMissionCar={selectedMissionCar}
            filterMissionData={filterMissionData as unknown as MTType}
          >
            <Row gutter={12}>
              <Col span={8}>
                <Button
                  icon={<PlusOutlined />}
                  onClick={createMissionBtn}
                  color="primary"
                  variant="filled"
                  style={{ marginBottom: 12 }}
                >
                  {t("mission.add_mission.create_mission")}
                </Button>
              </Col>
              <Col span={12}>
                <Input
                  placeholder={t("mission.add_mission.search_mission")}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Col>
              <Col span={4}>
                <Button
                  shape="circle"
                  loading={loadingTitle}
                  icon={<ReloadOutlined onClick={refetchData} />}
                />
              </Col>
            </Row>
          </SwitchTable>
        </Flex>
      </div>

      {/* 新增任務Create Mission Modal */}
      {openWithCreateMission ? (
        <Modal
          title={t("mission.add_mission.create_mission")}
          open={openWithCreateMission}
          onOk={handleAdd}
          onCancel={() => {
            createMissionForm.setFieldValue("name", "");
            setOpenWithCreateMission(false);
          }}
        >
          <Form
            form={createMissionForm}
            labelCol={{ span: 6 }}
            autoComplete="off"
          >
            <Form.Item
              hasFeedback
              label={t("mission.add_mission.name")}
              name="name"
              rules={[
                { required: true, message: t("mission.add_mission.car_warn") },
              ]}
            >
              <Input placeholder="請輸入任務名稱" />
            </Form.Item>
            <Form.Item
              hasFeedback
              label={t("mission.add_mission.car")}
              name="robot_type_id"
            >
              <Select placeholder="請選擇" options={newCarList} />
            </Form.Item>
            <Form.Item label={t("mission.add_mission.tag")} name="category">
              <Select
                placeholder="請選擇"
                mode="multiple"
                options={catOption}
                onChange={(v) => setTag(v)}
              />
            </Form.Item>
          </Form>
        </Modal>
      ) : (
        []
      )}

      {/* 編輯任務Edit Mission Modal */}
      {openMissionModel ? (
        <MissionForm
          editMissionKey={editMissionKey}
          formMission={formMission}
          openMissionModel={openMissionModel}
          setOpenMissionModel={setOpenMissionModel}
        />
      ) : (
        []
      )}
    </>
  );
};

export default EditMissionPanel;
