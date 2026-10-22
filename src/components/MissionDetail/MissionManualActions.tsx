import { FC } from "react";
import { Alert, Flex, Spin, Typography } from "antd";
import moment from "moment";
import { useTranslation } from "react-i18next";
import useMissionDetail from "@/api/useMissionDetail";

const { Text } = Typography;

/** 任務執行中有人手動介入 (直接下一動 / 重送這一步) 的紀錄; 沒有就什麼都不顯示 */
const MissionManualActions: FC<{ missionId: string }> = ({ missionId }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useMissionDetail(missionId);

  if (isLoading) return <Spin size="small" />;
  const actions = data?.manual_actions ?? [];
  if (actions.length === 0) return null;

  return (
    <Flex vertical gap={8}>
      {actions.map((a) => {
        const who =
          [a.account, a.client_name, a.ip].filter(Boolean).join(" · ") ||
          t("cargo_history.unknown_operator");
        return (
          <Alert
            key={a.id}
            type="warning"
            showIcon
            message={
              <Flex gap="small" wrap>
                <Text strong>
                  {t(
                    a.action === "RESEND_STEP"
                      ? "mission_manual.resend_step"
                      : "mission_manual.force_next_step",
                    { step: (a.step_idx ?? 0) + 1 },
                  )}
                </Text>
                {a.step_label && <Text code>{a.step_label}</Text>}
              </Flex>
            }
            description={
              <Text type="secondary">
                {moment(a.created_at).format("YYYY-MM-DD HH:mm:ss")} · {who}
              </Text>
            }
          />
        );
      })}
    </Flex>
  );
};

export default MissionManualActions;
