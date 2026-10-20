import { FC } from "react";
import {
  StyledForm,
  StyledTitle,
} from "../../../mapComponents/components/AllConveyor/style";
import {
  Flex,
  Form,
  FormInstance,
  InputNumber,
  Select,
  Switch,
  Tooltip,
  Typography,
} from "antd";
import {
  QuestionCircleOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import useAllMissionTitles from "@/api/useMissionTitle";
import { editHalfPanelStyle } from "@/pages/Setting/mapComponents/components/editModalStyle";

const Config: FC<{
  formConfig: FormInstance<unknown>;
}> = ({ formConfig }) => {
  const { t } = useTranslation();
  const { data: misTitle } = useAllMissionTitles();
  // const { data: yaw } = useYaw();
  const taskOption = misTitle
    ?.filter((g) =>
      g.MissionTitleBridgeCategory.some(
        (s) => s.Category?.tagName === "dynamic-mission",
      ),
    )
    .map((v) => ({ value: v.id, label: v.name ?? `Mission ${v.id}` }));

  // const dirOption = yaw?.map((v) => ({ value: v.id, label: v.yaw }));



  return (
    <>
      <div style={editHalfPanelStyle}>
        <StyledForm form={formConfig} layout="vertical" size="large">
          <StyledTitle level={3}>{t("stack.edit_config_title")}</StyledTitle>

          <Form.Item
            label={t("conveyor.edit_fork_height")}
            name="forkHeight"
            //  rules={[{ required: true, message: t('conveyor.error_fork_height') }]}
          >
            <InputNumber min={0} />
          </Form.Item>

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

          {/* <Form.Item
              label={
                <>
                  <Flex align="center" justify="center">
                    <Typography.Text>{t('shelf.cargo_mission.yaw')}</Typography.Text>
                    <Tooltip title={t('shelf.cargo_mission.yaw_desc')}>
                      <QuestionCircleOutlined style={{ marginLeft: 8 }} />
                    </Tooltip>
                  </Flex>
                </>
              }
              name="yaw"
              rules={[{ required: true, message: t('shelf.cargo_mission.yaw_required') }]}
            >
              <Select options={dirOption} placeholder={t('utils.select')} showSearch />
            </Form.Item> */}

          <Form.Item
            label={t("conveyor.enable_loading")}
            name="activeLoad"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label={t("conveyor.enable_offloading")}
            name="activeOffload"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

        </StyledForm>
      </div>
    </>
  );
};

export default Config;
