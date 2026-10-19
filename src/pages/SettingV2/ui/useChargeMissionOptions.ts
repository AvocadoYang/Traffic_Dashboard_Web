import { useMemo } from "react";
import useAllMissionTitles from "@/api/useMissionTitle";

/**
 * 充電任務(掛在 charge 分類底下的)。後端靠這個分類認充電任務,
 * 進入充電站強制任務只能選這種。
 */
const useChargeMissionOptions = () => {
  const { data } = useAllMissionTitles();

  return useMemo(
    () =>
      data
        ?.filter((g) =>
          g.MissionTitleBridgeCategory.some(
            (s) => s.Category?.tagName === "charge",
          ),
        )
        .map((v) => ({ value: v.id, label: v.name })) ?? [],
    [data],
  );
};

export default useChargeMissionOptions;
