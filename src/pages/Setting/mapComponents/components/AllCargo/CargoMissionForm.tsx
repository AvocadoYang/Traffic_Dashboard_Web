import {
  Form,
  Select,
  Input,
  FormInstance,
  Skeleton,
  Typography,
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
  QuestionCircleOutlined,
} from "@ant-design/icons";
import { editHalfPanelStyle, EDIT_TITLE_COLOR } from "../editModalStyle";

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

  // 這兩份選單是在下面的載入檢查「之前」算的:點位資料還沒載完時 loc 是 undefined,
  // 先當成空清單,不然還沒走到載入畫面整頁就先壞了。
  const locationOption = useMemo(() => {
    const info = (loc ?? []) as LocWithoutArr[];
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


  const taskOption = misTitle
    ?.filter((g) =>
      g.MissionTitleBridgeCategory.some(
        (s) => s.Category?.tagName === "dynamic-mission",
      ),
    )
    .map((v) => ({ value: v.id, label: v.name ?? `Mission ${v.id}` }));

  const dirOption = yaw?.map((v) => ({ value: v.id, label: v.yaw }));


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

    form.setFieldsValue({
      load: loadTask,
      offload: offloadTask,
      yaw: shelf.Dir?.id,
      prepare_point_id: defaultPreparedPoint,
    });
  }, [form, shelf, loc, locId]);

  // 載入中也維持跟表單同一張卡片,右邊的樓層設定才不會被擠到變形
  if (!shelf || !loc) {
    return (
      <div style={editHalfPanelStyle}>
        <Skeleton active paragraph={{ rows: 5 }} />
      </div>
    );
  }

  return (
    <div style={editHalfPanelStyle}>
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
            color: EDIT_TITLE_COLOR,
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

      </Form>
    </div>
  );
};

export default CargoMissionForm;
