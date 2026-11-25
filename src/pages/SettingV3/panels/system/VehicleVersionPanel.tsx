import { FC } from "react";
import { PanelShell } from "@/pages/SettingV3/ui/primitives";
import VehicleVersionSection from "./VehicleVersionSection";

const VehicleVersionPanel: FC = () => (
  <PanelShell>
    <VehicleVersionSection />
  </PanelShell>
);

export default VehicleVersionPanel;
