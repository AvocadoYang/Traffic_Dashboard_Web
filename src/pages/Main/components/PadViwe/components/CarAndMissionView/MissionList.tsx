import { memo } from "react";
import "../../style.css";
import { RollbackOutlined } from "@ant-design/icons";
import MissionWrap from "../../../../Mission_Card/MissionWrap";
import { useSetAtom } from "jotai";
import { OpenMissionCardInfo } from "@/pages/Main/global/jotai";

const MissionList = () => {
  const setOpenMissionCardInfo = useSetAtom(OpenMissionCardInfo);
  return (
    <div className="car-and-mission-wrap">
      <RollbackOutlined
        className="rollback-icon"
        onClick={() => setOpenMissionCardInfo(false)}
      />
      <MissionWrap></MissionWrap>
    </div>
  );
};

export default memo(MissionList);
