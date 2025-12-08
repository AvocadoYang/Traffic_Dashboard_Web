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
import styled from "styled-components";
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

// Industrial Styled Components
const IndustrialContainer = styled.div`
  font-family: "Roboto Mono", monospace;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const PanelHeader = styled.h3`
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-left: 4px solid #1890ff;
  padding: 12px 16px;
  margin: 0 0 20px 0;
  font-family: "Roboto Mono", monospace;
  color: #262626;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 14px;
  cursor: move;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;

  &:hover {
    background: #f0f5ff;
    border-left-color: #40a9ff;
  }
`;

const ControlRow = styled(Row)`
  margin-bottom: 16px;
`;

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;
  font-weight: 600;
  border-radius: 4px;
  transition: all 0.2s ease;

  &.ant-btn-primary {
    background: #1890ff;
    border-color: #1890ff;

    &:hover {
      background: #40a9ff;
      border-color: #40a9ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  }

  &.reload-btn {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    color: #595959;

    &:hover {
      background: #fafafa;
      border-color: #1890ff;
      color: #1890ff;
    }
  }
`;

const IndustrialInput = styled(Input)`
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  height: 36px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;

  &:hover {
    border-color: #40a9ff;
  }

  &:focus {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }

  &::placeholder {
    color: #bfbfbf;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
  }
`;

const IndustrialSelect = styled(Select)`
  font-family: "Roboto Mono", monospace;

  .ant-select-selector {
    height: 36px !important;
    border: 1px solid #d9d9d9 !important;
    border-radius: 4px !important;
    font-size: 12px;
    display: flex;
    align-items: center;

    &:hover {
      border-color: #40a9ff !important;
    }
  }

  &.ant-select-focused .ant-select-selector {
    border-color: #1890ff !important;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
  }

  .ant-select-selection-placeholder {
    color: #bfbfbf;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
  }
`;

const IndustrialModal = styled(Modal)`
  .ant-modal-content {
    background: #ffffff;
    border: 2px solid #d9d9d9;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .ant-modal-header {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    border-left: 4px solid #1890ff;
    padding: 16px 24px;
  }

  .ant-modal-title {
    color: #262626;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: "Roboto Mono", monospace;
  }

  .ant-modal-body {
    padding: 24px;
  }

  .ant-modal-footer {
    border-top: 1px solid #d9d9d9;
    padding: 16px 24px;

    .ant-btn {
      font-family: "Roboto Mono", monospace;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 1px;
      height: 36px;
      font-weight: 600;
    }
  }
`;

const FormLabel = styled.span`
  color: #595959;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: "Roboto Mono", monospace;
  font-weight: 600;
`;

const StyledForm = styled(Form)`
  .ant-form-item-label > label {
    color: #595959;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: "Roboto Mono", monospace;
    font-weight: 600;
  }
`;

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
  const { data: allMissionTitle, refetch: refetchMission } =
    useAllMissionTitlesDetail();
  const { data: cat } = useCategory();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const catOption = cat?.map((v) => ({ value: v.id, label: v.tagName })) || [];
  const filterMissionData = useMemo(
    () => allMissionTitle?.filter((m) => m.name.includes(search)) || [],
    [search, allMissionTitle]
  );

  const addMutation = useMutation(
    (newMission: MissionListType) =>
      client.post("api/setting/add-mission-title", newMission),
    {
      onSuccess: async () => {
        await queryClient.refetchQueries({
          queryKey: ["all-mission-title-detail"],
        });
        messageApi.success(t("utils.success"));
      },
      onError: () => {
        messageApi.error(t("utils.error"));
      },
    }
  );

  const refetchData = async () => {
    setLoadingTitle(true);
    refetchMission();
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
        (formData.robot_type_id = item.id)
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
  }, [tag, catOption]);

  return (
    <IndustrialContainer>
      {contextHolder}
      <div>
        <PanelHeader {...listeners} {...attributes}>
          {t("mission.add_mission.title")}
        </PanelHeader>
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
            <ControlRow gutter={12}>
              <Col span={8}>
                <IndustrialButton
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={createMissionBtn}
                  block
                >
                  {t("mission.add_mission.create_mission")}
                </IndustrialButton>
              </Col>
              <Col span={12}>
                <IndustrialInput
                  placeholder={t("mission.add_mission.search_mission")}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Col>
              <Col span={4}>
                <IndustrialButton
                  className="reload-btn"
                  shape="circle"
                  loading={loadingTitle}
                  icon={<ReloadOutlined />}
                  onClick={() => refetchData()}
                />
              </Col>
            </ControlRow>
          </SwitchTable>
        </Flex>
      </div>

      {/* Create Mission Modal */}
      <IndustrialModal
        title={t("mission.add_mission.create_mission")}
        open={openWithCreateMission}
        onOk={handleAdd}
        onCancel={() => {
          createMissionForm.setFieldValue("name", "");
          setOpenWithCreateMission(false);
        }}
        okText={t("utils.confirm") || "CONFIRM"}
        cancelText={t("utils.cancel") || "CANCEL"}
      >
        <StyledForm
          form={createMissionForm}
          labelCol={{ span: 6 }}
          autoComplete="off"
          layout="horizontal"
        >
          <Form.Item
            label={t("mission.add_mission.name")}
            name="name"
            rules={[
              { required: true, message: t("mission.add_mission.car_warn") },
            ]}
          >
            <IndustrialInput placeholder={t("mission.add_mission.name")} />
          </Form.Item>
          <Form.Item
            label={t("mission.add_mission.car")}
            name="robot_type_id"
            rules={[
              { required: true, message: t("mission.add_mission.car_warn") },
            ]}
          >
            <IndustrialSelect
              placeholder={t("mission.add_mission.car")}
              options={newCarList}
            />
          </Form.Item>
          <Form.Item
            label={t("mission.add_mission.tag")}
            name="category"
            rules={[
              { required: true, message: t("mission.add_mission.tag_warn") },
            ]}
          >
            <IndustrialSelect
              placeholder={t("mission.add_mission.tag")}
              mode="multiple"
              options={catOption}
              onChange={(v) => setTag(v)}
            />
          </Form.Item>
        </StyledForm>
      </IndustrialModal>

      {/* Edit Mission Modal */}
      {openMissionModel && (
        <MissionForm
          editMissionKey={editMissionKey}
          formMission={formMission}
          openMissionModel={openMissionModel}
          setOpenMissionModel={setOpenMissionModel}
        />
      )}
    </IndustrialContainer>
  );
};

export default EditMissionPanel;
