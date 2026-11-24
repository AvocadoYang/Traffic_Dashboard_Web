import { FC } from "react";
import { PanelShell } from "@/pages/SettingV3/ui/primitives";
import SnapshotSection from "./SnapshotSection";

const SnapshotPanel: FC = () => (
  <PanelShell>
    <SnapshotSection />
  </PanelShell>
);

export default SnapshotPanel;
