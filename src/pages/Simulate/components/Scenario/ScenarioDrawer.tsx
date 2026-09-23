import { FC } from "react";
import { Drawer, Tabs } from "antd";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { OpenScenarioDrawer } from "../../utils/mapStatus";
import CargoSourceTab from "./CargoSourceTab";
import RoutingRuleTab from "./RoutingRuleTab";
import CargoSinkTab from "./CargoSinkTab";
import ForecastPanel from "./ForecastPanel";
import RandomMissionTab from "./RandomMissionTab";

/**
 * 情境設定。取代在時間軸上一格一格手擺事件 ——
 * 貨源決定貨從哪來, 派送規則決定它去哪, 出口決定它怎麼消失。
 */
const ScenarioDrawer: FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useAtom(OpenScenarioDrawer);

  return (
    <Drawer
      open={isOpen}
      onClose={() => setIsOpen(false)}
      title={t("sim.scenario.title")}
      placement="left"
      width={720}
      destroyOnClose
    >
      <Tabs
        defaultActiveKey="random"
        items={[
          {
            key: "sources",
            label: t("sim.scenario.tab_sources"),
            children: <CargoSourceTab />,
          },
          {
            key: "rules",
            label: t("sim.scenario.tab_rules"),
            children: <RoutingRuleTab />,
          },
          {
            key: "sinks",
            label: t("sim.scenario.tab_sinks"),
            children: <CargoSinkTab />,
          },
          {
            key: "random",
            label: t("sim.scenario.tab_random"),
            children: <RandomMissionTab />,
          },
          {
            key: "forecast",
            label: t("sim.scenario.tab_forecast"),
            children: <ForecastPanel />,
          },
        ]}
      />
    </Drawer>
  );
};

export default ScenarioDrawer;
