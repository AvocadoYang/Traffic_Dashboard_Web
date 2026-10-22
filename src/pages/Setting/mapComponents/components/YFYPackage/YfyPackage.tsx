import { FC, memo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { isShowLocation } from "@/utils/siderGloble";
import {
  IsEditingQuickRoads,
  QuickRoadsArray,
} from "@/pages/Setting/utils/settingJotai";
import { EditPackageLocationId } from "@/pages/Setting/formComponent/forms/peripheralModal/jotai";
import { Package_Info } from "@/types/peripheral";
import PackageLayer from "./PackageLayer";
import { PackagePortView } from "./PackageStrip";

/** 設定頁地圖上的包膜線:點入口或出口開它的設定;快速畫路線時改成把點位加進路線 */
const YFYPackage: FC = () => {
  const { t } = useTranslation();
  const showLocation = useAtomValue(isShowLocation);
  const quickRoad = useAtomValue(IsEditingQuickRoads);
  const setQuickRoadArr = useSetAtom(QuickRoadsArray);
  const setEditing = useSetAtom(EditPackageLocationId);

  const portView = (info: Package_Info): PackagePortView => ({
    state: "idle",
    disabled: info.disable,
    booked: !!info.booker,
    title: t(
      info.role === "ENTRY" ? "package.entry_title" : "package.exit_title",
      { name: `${info.locationId} ${info.name}`.trim() },
    ),
    onClick: () => {
      if (quickRoad) {
        setQuickRoadArr((prev) => [...prev, info.locationId]);
        return;
      }
      setEditing(info.locationId);
    },
  });

  if (!showLocation) return null;
  return <PackageLayer portView={portView} />;
};

export default memo(YFYPackage);
