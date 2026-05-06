import {
  Form,
  Select,
  Input,
  FormInstance,
  Skeleton,
  Typography,
  InputNumber,
  Button,
  Flex,
  Tooltip,
} from "antd";
import { FC, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import useAllMissionTitles from "@/api/useMissionTitle";
import useYaw from "@/api/useYaw";
import useSpecificShelf from "@/api/useSpecificShelf";
import useLoc, { LocWithoutArr } from "@/api/useLoc";
import {
  MinusCircleOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";

const { Title } = Typography;

const CargoMissionForm: FC<{
  locId: string;
  locName: string | null;
  form: FormInstance;
}> = ({ locId, locName, form }) => {
  const { data: misTitle } = useAllMissionTitles();
  const { data: yaw } = useYaw();
  const { data: loc } = useLoc(undefined);
  const { data: shelf } = useSpecificShelf(locId);
  const { t } = useTranslation();

  const locationOption = useMemo(() => {
    const info = loc as LocWithoutArr[];
    const mixData = info
      .filter((v) => v.areaType === "Dispatch" && v.id !== locId)
      .sort((a, b) => Number(a.locationId) - Number(b.locationId))
      .map((v) => ({
        label: v.locationId,
        value: v.id,
      }));
    mixData.unshift({ label: t("shelf.cargo_mission.unset"), value: "null" });
    return mixData;
  }, [loc, locId, t]);

  const relationOption = useMemo(() => {
    const info = loc as LocWithoutArr[];
    const mixData = info
      .filter(
        (v) =>
          (v.areaType === "STORAGE" || v.areaType === "CONVEYOR") &&
          v.id !== locId,
      )
      .sort((a, b) => Number(a.locationId) - Number(b.locationId))
      .map((v) => ({
        label: v.locationId,
        value: v.locationId,
      }));
    return mixData;
  }, [loc, locId, t]);

  const taskOption = misTitle
    ?.filter((g) =>
      g.MissionTitleBridgeCategory.some(
        (s) => s.Category?.tagName === "dynamic-mission",
      ),
    )
    .map((v) => ({ value: v.id, label: v.name ?? `Mission ${v.id}` }));

  const dirOption = yaw?.map((v) => ({ value: v.id, label: v.yaw }));

  const relationshipTypeOption = [
    { value: "fixed", label: t("shelf.cargo_mission.relationship_fixed") },
    {
      value: "non-fixed",
      label: t("shelf.cargo_mission.relationship_non_fixed"),
    },
  ];

  useEffect(() => {
    if (!shelf || !loc) return;

    const loadTask = shelf.TitleBridgeLocs?.filter(
      (v) => v.missionType === "load",
    )[0]?.Title?.id;
    const offloadTask = shelf.TitleBridgeLocs?.filter(
      (v) => v.missionType === "offload",
    )[0]?.Title?.id;

    const info = loc as LocWithoutArr[];
    const currentLoc = info.find((v) => v.locationId === locId);
    const defaultPreparedPoint = currentLoc?.prepare_point?.id || null;

    const placement_priority = currentLoc?.placement_priority || 0;
    const relationships = currentLoc?.relationships
      ? Object.entries(currentLoc.relationships).map(
          ([relatedLocId, type]) => ({
            relatedLocId,
            relationshipType: type,
          }),
        )
      : [];

    form.setFieldsValue({
      load: loadTask,
      offload: offloadTask,
      yaw: shelf.Dir?.id,
      prepare_point_id: defaultPreparedPoint,
      placement_priority,
      relationships,
    });
  }, [form, shelf, loc, locId]);

  if (!shelf || !loc) return <Skeleton active paragraph={{ rows: 5 }} />;

  return (
    <div
      style={{
        width: "50%",
        background: "#fff",
        padding: "24px",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        maxHeight: "70vh",
        overflowY: "auto",
      }}
    >
      <Form
        form={form}
        layout="vertical"
        size="large"
        initialValues={{ name: locName }}
      >
        <Title
          level={3}
          style={{
            textAlign: "center",
            marginBottom: "24px",
            color: "#1890ff",
          }}
        >
          {t("shelf.cargo_mission.default_title")}
        </Title>

        <Form.Item
          label={
            <>
              <Flex align="center" justify="center">
                <Typography.Text>
                  {t("shelf.cargo_mission.load_mission")}
                </Typography.Text>
                <Tooltip title={t("shelf.cargo_mission.load_desc")}>
                  <QuestionCircleOutlined style={{ marginLeft: 8 }} />
                </Tooltip>
              </Flex>
            </>
          }
          name="load"
          //rules={[{ required: true, message: t('shelf.cargo_mission.load_mission_required') }]}
        >
          <Select
            options={taskOption}
            placeholder={t("utils.select")}
            showSearch={{
              filterOption: (input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase()),
            }}
          />
        </Form.Item>

        <Form.Item
          label={
            <>
              <Flex align="center" justify="center">
                <Typography.Text>
                  {t("shelf.cargo_mission.offload_mission")}
                </Typography.Text>
                <Tooltip title={t("shelf.cargo_mission.offload_desc")}>
                  <QuestionCircleOutlined style={{ marginLeft: 8 }} />
                </Tooltip>
              </Flex>
            </>
          }
          name="offload"
          //rules={[{ required: true, message: t('shelf.cargo_mission.offload_mission_required') }]}
        >
          <Select
            options={taskOption}
            placeholder={t("utils.select")}
            showSearch={{
              filterOption: (input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase()),
            }}
          />
        </Form.Item>

        {/* <Form.Item label={t("shelf.cargo_mission.location_name")} name="name">
          <Input placeholder={t("shelf.cargo_mission.enter_name")} />
        </Form.Item> */}

        <Form.Item
          label={
            <>
              <Flex align="center" justify="center">
                <Typography.Text>
                  {t("shelf.cargo_mission.yaw")}
                </Typography.Text>
                <Tooltip title={t("shelf.cargo_mission.yaw_desc")}>
                  <QuestionCircleOutlined style={{ marginLeft: 8 }} />
                </Tooltip>
              </Flex>
            </>
          }
          name="yaw"
          rules={[
            { required: true, message: t("shelf.cargo_mission.yaw_required") },
          ]}
        >
          <Select
            options={dirOption}
            placeholder={t("utils.select")}
            showSearch={{
              filterOption: (input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase()),
            }}
          />
        </Form.Item>

        {/* <Form.Item
          label={
            <>
              <Flex align="center" justify="center">
                <Typography.Text>
                  {t("shelf.cargo_mission.prepare_point")}
                </Typography.Text>
                <Tooltip title={t("shelf.cargo_mission.prepare_point_desc")}>
                  <QuestionCircleOutlined style={{ marginLeft: 8 }} />
                </Tooltip>
              </Flex>
            </>
          }
          name="prepare_point_id"
          rules={[
            {
              required: true,
              message: t("shelf.cargo_mission.prepare_point_required"),
            },
          ]}
        >
          <Select
            options={locationOption}
            placeholder={t("utils.select")}
            showSearch
          />
        </Form.Item> */}

        <Form.Item
          label={
            <>
              <Flex align="center" justify="center">
                <Typography.Text>
                  {t("shelf.cargo_mission.priority")}
                </Typography.Text>
                <Tooltip title={t("shelf.cargo_mission.priority_desc")}>
                  <QuestionCircleOutlined style={{ marginLeft: 8 }} />
                </Tooltip>
              </Flex>
            </>
          }
          name="placement_priority"
          rules={[
            {
              required: true,
              message: t("shelf.cargo_mission.priority_required"),
            },
            {
              type: "number",
              min: 0,
              message: t("shelf.cargo_mission.priority_min"),
            },
          ]}
        >
          <InputNumber
            min={0}
            max={100}
            style={{ width: "100%" }}
            placeholder={"10"}
          />
        </Form.Item>

        <Form.Item
          label={
            <>
              <Flex align="center" justify="center">
                <Typography.Text>
                  {t("shelf.cargo_mission.relationships")}
                </Typography.Text>
                <Tooltip title={t("shelf.cargo_mission.relationships_desc")}>
                  <QuestionCircleOutlined style={{ marginLeft: 8 }} />
                </Tooltip>
              </Flex>
            </>
          }
        >
          <Form.List name="relationships">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div
                    key={key}
                    style={{ display: "flex", gap: 8, marginBottom: 8 }}
                  >
                    <Form.Item
                      {...restField}
                      name={[name, "relatedLocId"]}
                      rules={[
                        {
                          required: true,
                          message: t(
                            "shelf.cargo_mission.related_loc_required",
                          ),
                        },
                      ]}
                      style={{ flex: 1 }}
                    >
                      <Select
                        options={relationOption}
                        placeholder={t("shelf.cargo_mission.select_location")}
                        showSearch={{
                          filterOption: (input, option) =>
                            (option?.label ?? "")
                              .toLowerCase()
                              .includes(input.toLowerCase()),
                        }}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "relationshipType"]}
                      rules={[
                        {
                          required: true,
                          message: t(
                            "shelf.cargo_mission.relationship_type_required",
                          ),
                        },
                      ]}
                      style={{ flex: 1 }}
                    >
                      <Select
                        options={relationshipTypeOption}
                        placeholder={t(
                          "shelf.cargo_mission.select_relationship_type",
                        )}
                      />
                    </Form.Item>
                    <MinusCircleOutlined
                      onClick={() => remove(name)}
                      style={{ alignSelf: "center" }}
                    />
                  </div>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    {t("shelf.cargo_mission.add_relationship")}
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CargoMissionForm;
