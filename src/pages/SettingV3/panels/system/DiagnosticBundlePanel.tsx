import { FC } from "react";
import { PanelShell } from "@/pages/SettingV3/ui/primitives";
import DiagnosticBundleSection from "./DiagnosticBundleSection";

const DiagnosticBundlePanel: FC = () => (
  <PanelShell>
    <DiagnosticBundleSection />
  </PanelShell>
);

export default DiagnosticBundlePanel;
