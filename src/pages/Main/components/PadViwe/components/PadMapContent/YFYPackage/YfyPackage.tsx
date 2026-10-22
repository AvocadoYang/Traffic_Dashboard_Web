import { FC, memo } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import {
  QuickMissionLoad,
  QuickMissionOffload,
  QuickMissionSettingMode,
  StartQuickMissionSetting,
} from "@/pages/Main/global/jotai";
import { CargoPanelTarget } from "@/components/CargoPanel/state";
import { Package_Info } from "@/types/peripheral";
import PackageLayer from "@/pages/Setting/mapComponents/components/YFYPackage/PackageLayer";
import { PackagePortView } from "@/pages/Setting/mapComponents/components/YFYPackage/PackageStrip";

/**
 * 主畫面地圖上的包膜線。
 * 派車選點位時:選「放貨」只能點入口(最前面),選「取貨」只能點出口(最後面)。
 * 平常點任何一端都是打開這條線登記的貨。
 */
const YFYPackage: FC = () => {
  const { t } = useTranslation();
  const [selectMode, setQuickSettingMode] = useAtom(QuickMissionSettingMode);
  const [isSelecting, setStartQuickSetting] = useAtom(StartQuickMissionSetting);
  const setLoad = useSetAtom(QuickMissionLoad);
  const setOffload = useSetAtom(QuickMissionOffload);
  const openCargoPanel = useSetAtom(CargoPanelTarget);

  const portView = (info: Package_Info): PackagePortView => {
    const count = info.cargo.length;
    const isFull = info.capacity > 0 && count >= info.capacity;
    // 入口:登記還沒滿才能放;出口:線上有登記的貨才能取
    const canSelect =
      !info.disable &&
      ((selectMode === "offload" && info.role === "ENTRY" && !isFull) ||
        (selectMode === "load" && info.role === "EXIT" && count > 0));

    return {
      state: !isSelecting ? "idle" : canSelect ? "selectable" : "blocked",
      disabled: info.disable,
      booked: !!info.booker,
      title: t(
        info.role === "ENTRY" ? "package.entry_title" : "package.exit_title",
        { name: info.name || info.locationId },
      ),
      onClick: (e) => {
        // 不要再傳到地圖本身的點擊處理
        e.stopPropagation();
        if (!isSelecting) {
          openCargoPanel({ type: "PACKAGE", locationId: info.locationId });
          return;
        }
        if (!canSelect || selectMode === null) return;

        const endpoint = {
          columnName: info.name,
          locationId: info.locationId,
          level: 0,
        };
        if (selectMode === "load") {
          setLoad({ missionType: "load", ...endpoint });
        } else {
          setOffload({ missionType: "offload", ...endpoint });
        }
        setStartQuickSetting(false);
        setQuickSettingMode(null);
      },
    };
  };

  return <PackageLayer portView={portView} />;
};

export default memo(YFYPackage);
