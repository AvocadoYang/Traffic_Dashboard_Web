import useAllMissionTitles from "@/api/useMissionTitle";
import { QuestionCircleOutlined } from "@ant-design/icons";
import {
  Flex,
  Form,
  FormInstance,
  InputNumber,
  Select,
  Tooltip,
  Typography,
} from "antd";
import { FC } from "react";
import { useTranslation } from "react-i18next";

const { Title } = Typography;

const LeftSide: FC<{ form: FormInstance<unknown> }> = ({ form }) => {
  const { data: misTitle } = useAllMissionTitles();
  const { t } = useTranslation();

  const taskOption = misTitle
    ?.filter((g) =>
      g.MissionTitleBridgeCategory.some(
        (s) => s.Category?.tagName === "dynamic-mission",
      ),
    )
    .map((v) => ({ value: v.id, label: v.name ?? `Mission ${v.id}` }));

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
      <Form form={form} layout="vertical" size="large">
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
            showSearch
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
            showSearch
          />
        </Form.Item>

        <Form.Item
          label={
            <>
              <Flex align="center" justify="center">
                <Typography.Text>{t("elevator.fork_height")}</Typography.Text>
                <Tooltip title={t("elevator.fork_height_desc")}>
                  <QuestionCircleOutlined style={{ marginLeft: 8 }} />
                </Tooltip>
              </Flex>
            </>
          }
          name="forkHeight"
          //rules={[{ required: true, message: t('shelf.cargo_mission.offload_mission_required') }]}
        >
          <InputNumber min={10} max={5000} />
        </Form.Item>
      </Form>
    </div>
  );
};

export default LeftSide;
