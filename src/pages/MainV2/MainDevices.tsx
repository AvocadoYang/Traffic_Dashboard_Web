import { memo } from "react";
import { useAtomValue } from "jotai";
import AllCargo from "@/pages/Main/components/PadViwe/components/PadMapContent/AllCargo/AllCargo";
import AllStack from "@/pages/Main/components/PadViwe/components/PadMapContent/AllStack/AllStack";
import YfyPackage from "@/pages/Main/components/PadViwe/components/PadMapContent/YFYPackage/YfyPackage";
import { AllElevator } from "@/pages/Main/components/PadViwe/components/PadMapContent/AllElevator";
import AllConveyor from "@/pages/Main/components/PadViwe/components/PadMapContent/AllConveyor/AllConveyor";
import AllGateWaitPoint from "@/pages/Main/components/PadViwe/components/PadMapContent/AllGateWaitPoint/AllGateWaitPoint";
import AllLiftGate from "@/pages/Main/components/PadViwe/components/PadMapContent/AllGate/AllLiftGate";
import AllChargeStation from "@/pages/Main/components/PadViwe/components/PadMapContent/AllChargeStation/AllChargeStation";
import StatusPanel from "@/pages/Main/components/PadViwe/components/PadMapContent/AllChargeStation/StatusPanel";
import LocalizationCorrectionGhost from "@/pages/Main/components/PadViwe/components/PadMapContent/component/LocalizationCorrection/LocalizationCorrectionGhost";
import { OpenChargeStationModal } from "@/pages/Main/global/jotai";

/**
 * 地圖上的設備: 數量不多, 但點擊、Popover、快速任務選層這些互動很多,
 * 先沿用首頁原本的元件 (座標是底圖像素, 疊在畫布地圖的設備層), 畫面和操作跟舊首頁一樣。
 */
const MainDevices = () => {
  const showChargeConfig = useAtomValue(OpenChargeStationModal);
  return (
    <>
      <LocalizationCorrectionGhost />
      <AllCargo />
      <AllStack />
      <YfyPackage />
      <AllElevator />
      <AllConveyor />
      <AllGateWaitPoint />
      <AllLiftGate />
      <AllChargeStation />
      {showChargeConfig ? <StatusPanel locId={showChargeConfig} /> : null}
    </>
  );
};

export default memo(MainDevices);
