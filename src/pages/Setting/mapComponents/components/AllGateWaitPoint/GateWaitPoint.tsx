import {
  IsEditingQuickRoads,
  QuickRoadsArray,
} from "@/pages/Setting/utils/settingJotai";
import { useAtomValue, useSetAtom } from "jotai";
import React, { FC } from "react";

const GateWaitPoint: FC<{ locationId: string }> = ({ locationId }) => {
  const quickRoad = useAtomValue(IsEditingQuickRoads);
  const setQuickRoadArr = useSetAtom(QuickRoadsArray);

  const handleCon = () => {
    if (quickRoad) {
      setQuickRoadArr((prev) => [...prev, locationId]);
      return;
    }
  };

  return <div onClick={() => handleCon()}>GW</div>;
};

export default GateWaitPoint;
