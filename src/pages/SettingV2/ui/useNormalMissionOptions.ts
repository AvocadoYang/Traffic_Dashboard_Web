import { useMemo } from "react";
import useAllMissionTitles from "@/api/useMissionTitle";

/**
 * 可以直接派給車輛的任務(掛在 normal-mission 分類底下的)。
 * 貨架那邊用的是 dynamic-mission,兩者不通用。
 */
const useNormalMissionOptions = () => {
  const { data } = useAllMissionTitles();

  return useMemo(
    () =>
      data
        ?.filter((g) =>
          g.MissionTitleBridgeCategory.some(
            (s) => s.Category?.tagName === "normal-mission",
          ),
        )
        .map((v) => ({ value: v.id, label: v.name })) ?? [],
    [data],
  );
};

export default useNormalMissionOptions;
