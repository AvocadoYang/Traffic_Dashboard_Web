import { useAtom, useAtomValue } from "jotai";
import { useAmrPose } from "@/sockets/useAMRInfo";
import { useMiRStatus } from "@/sockets/useMirStatus";
import { localizationCorrection } from "@/utils/gloable";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { sanitizeSignedDeg } from "@/utils/utils";

/**
 * 定位校正 (車輛卡片的「定位校正」) 的幽靈車身: 車現在的位置加上拖出來的位移 / 旋轉 (yaw 是度, -180~180)。
 * 3D 地圖用的; 什麼時候顯示照 2D 的 LocalizationCorrectionGhost: 車回報的地圖要是目前這張
 */
export const useCorrectionGhost = () => {
  const [correction, setCorrection] = useAtom(localizationCorrection);
  const { pose } = useAmrPose(correction?.amrId ?? "");
  const mirStatus = useMiRStatus(correction?.amrId ?? "");
  const mapId = useAtomValue(currentMapIdAtom);
  const ghost =
    correction && pose
      ? { x: pose.x + correction.dx, y: pose.y + correction.dy, yaw: sanitizeSignedDeg(pose.yaw + correction.dYaw) }
      : null;
  const visible = !!ghost && mirStatus.active_map_id === mapId;
  return { correction, setCorrection, pose, ghost, visible };
};
