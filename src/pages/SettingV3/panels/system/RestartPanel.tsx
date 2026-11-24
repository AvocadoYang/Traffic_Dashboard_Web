import { FC } from "react";
import { PanelShell } from "@/pages/SettingV3/ui/primitives";
import RestartSection from "./RestartSection";

const RestartPanel: FC = () => (
  <PanelShell>
    <RestartSection />
  </PanelShell>
);

export default RestartPanel;
