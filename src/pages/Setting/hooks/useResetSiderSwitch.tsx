import { useAtom, useSetAtom } from "jotai";
import {
  EditLocationPanelSwitch,
  EditLocationListTableSwitch,
  QuickEditLocationPanelSwitch,
  EditRoadPanelSwitch,
  EditZoneSwitch,
  showAllZonesSwitch,
  isOpenSwitchMap,
} from "@/utils/siderGloble";
import { useEffect } from "react";
import { showBlockId } from "@/utils/gloable";

const useResetSiderSwitch = () => {
  const [, setOpenEditLocationPanel] = useAtom(EditLocationPanelSwitch);
  const [, setEditRoadPanelSwitch] = useAtom(EditRoadPanelSwitch);
  const [, setQuickEditLocationPanel] = useAtom(QuickEditLocationPanelSwitch);
  const [, setShowAllLocationListTable] = useAtom(EditLocationListTableSwitch);
  const [, setOpenEditZone] = useAtom(EditZoneSwitch);
  const setOpenSwitchMap = useSetAtom(isOpenSwitchMap);
  const [, setShowAllZonesSwitch] = useAtom(showAllZonesSwitch);
  const [, setShowBlockId] = useAtom(showBlockId);
  useEffect(() => {
    setShowAllLocationListTable(false);
    setOpenEditLocationPanel(false);
    setEditRoadPanelSwitch(false);
    setQuickEditLocationPanel(false);
    setOpenEditZone(false);
    setShowAllZonesSwitch(true);
    setOpenSwitchMap(false);
    setShowBlockId("");
  }, []);
};

export default useResetSiderSwitch;
