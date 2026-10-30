import { FC } from "react";
import { useTranslation } from "react-i18next";
import HelpButton from "../../ui/HelpButton";

/**
 * 「輸送帶派送」面板各區塊旁的問號。說明文字在 conveyor_dispatch.help;
 * 群組擺放規則和巷道的說明跟著設定搬到「群組取放規則」(GroupPickPlaceHelp)。
 */
export type HelpTopic = "runtime" | "rules";

const ConveyorDispatchHelp: FC<{ topic: HelpTopic }> = ({ topic }) => {
  const { t } = useTranslation();
  return (
    <HelpButton
      i18nKey={`conveyor_dispatch.help.${topic}`}
      label={t("conveyor_dispatch.help.open")}
    />
  );
};

export default ConveyorDispatchHelp;
