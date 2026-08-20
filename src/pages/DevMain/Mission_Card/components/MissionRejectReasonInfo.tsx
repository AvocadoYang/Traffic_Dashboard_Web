import { Collapse, Typography } from "antd";
import { useTranslation } from "react-i18next";

const { Panel } = Collapse;
const { Text } = Typography;

export default function MissionRejectReasonInfo() {
  const { t } = useTranslation();

  const li = (key: string) => <li>{t(`mission_reject_reason.${key}`)}</li>;

  return (
    <div style={{ maxWidth: 420, paddingRight: 8 }}>
      <Text strong style={{ fontSize: 16, display: "block", marginBottom: 12 }}>
        {t("mission_reject_reason.title")}
      </Text>

      <Collapse ghost>
        <Panel header={t("mission_reject_reason.cat1")} key="1">
          <ul>
            {li("cat1_1")}
            {li("cat1_2")}
            {li("cat1_3")}
          </ul>
        </Panel>

        <Panel header={t("mission_reject_reason.cat2")} key="2">
          <ul>
            {li("cat2_1")}
            {li("cat2_2")}
            {li("cat2_3")}
            {li("cat2_4")}
          </ul>
        </Panel>

        <Panel header={t("mission_reject_reason.cat3")} key="3">
          <ul>
            {li("cat3_1")}
            {li("cat3_2")}
          </ul>
        </Panel>

        <Panel header={t("mission_reject_reason.cat4")} key="4">
          <ul>
            {li("cat4_1")}
            {li("cat4_2")}
            {li("cat4_3")}
            {li("cat4_4")}
            {li("cat4_5")}
          </ul>
        </Panel>

        <Panel header={t("mission_reject_reason.cat5")} key="5">
          <ul>
            {li("cat5_1")}
            {li("cat5_2")}
            {li("cat5_3")}
            {li("cat5_4")}
          </ul>
        </Panel>

        <Panel header={t("mission_reject_reason.cat6")} key="6">
          <ul>
            {li("cat6_1")}
            {li("cat6_2")}
            {li("cat6_3")}
          </ul>
        </Panel>

        <Panel header={t("mission_reject_reason.cat7")} key="7">
          <ul>
            {li("cat7_1")}
            {li("cat7_2")}
          </ul>
        </Panel>
      </Collapse>
    </div>
  );
}
