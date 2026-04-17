import { FC } from "react";
import {
  StyledForm,
  StyledTitle,
} from "../../../mapComponents/components/AllConveyor/style";
import {
  Flex,
  Form,
  FormInstance,
  Select,
  Switch,
  Tooltip,
  Typography,
} from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import useAllMissionTitles from "@/api/useMissionTitle";

const Config: FC<{
  formConfig: FormInstance<unknown>;
}> = ({ formConfig }) => {
  const { t } = useTranslation();
  const { data: misTitle } = useAllMissionTitles();

  const taskOption = misTitle
    ?.filter((g) =>
      g.MissionTitleBridgeCategory.some(
        (s) => s.Category?.tagName === "dynamic-mission",
      ),
    )
    .map((v) => ({ value: v.id, label: v.name ?? `Mission ${v.id}` }));

  return (
    <>
      <div
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          maxHeight: "70vh",
          overflowY: "auto",
          width: "50%",
        }}
      >
        <StyledForm form={formConfig} layout="vertical" size="large">
          <StyledTitle level={3}>{t("stack.edit_config_title")}</StyledTitle>

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
            name="loadMissionId"
            // rules={[{ required: true, message: t('shelf.cargo_mission.load_mission_required') }]}
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
            name="offloadMissionId"
            //  rules={[{ required: true, message: t('shelf.cargo_mission.offload_mission_required') }]}
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
        </StyledForm>
      </div>
    </>
  );
};

export default Config;
