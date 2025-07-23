import {
  OpenCarCardInfo,
  OpenMissionCardInfo,
  viewBtn,
} from "@/pages/Main/global/jotai";
import { Layout } from "antd";
import { useAtom, useAtomValue } from "jotai";
import CardWrap from "./PadContentCards/CardWrap";
import { memo, useEffect, useState } from "react";
import CycleMissionTable from "../../missionModal/CycleMission/CycleMissionTable";
import AlarmView from "./AlarmView/AlarmView";
import CarList from "./CarAndMissionView/CarList";
import MissionList from "./CarAndMissionView/MissionList";

const dataIndex = [
  [{ key: "map_2D_view" }, { key: "map_3D_view" }],
  [
    { key: "quick_mission" },
    { key: "auto_mission" },
    { key: "new_mission" },
    // { key: 'input_mission' }
  ],
  [{ key: "mission_info" }, { key: "car_info" }],
];

const { Content } = Layout;
const PadContent = () => {
  const view = useAtomValue(viewBtn);
  const [displayArray, setDisplayArray] = useState<{ key: string }[]>(
    dataIndex[1],
  );
  const [openCarCardInfo, setOpenCarCardInfo] = useAtom(OpenCarCardInfo);
  const [openMissionCardInfo, setOpenMissionCardInfo] =
    useAtom(OpenMissionCardInfo);

  const [showAlertView, setShowAlertView] = useState<boolean>(false);
  const [openCycleMissionList, setOpenCycleMissionList] =
    useState<boolean>(false);
  useEffect(() => {
    switch (view) {
      case 0:
        setShowAlertView(false);
        setOpenCarCardInfo(false);
        setOpenMissionCardInfo(false);
        setDisplayArray(dataIndex[view]);
        break;
      case 1:
        setShowAlertView(false);
        setOpenCarCardInfo(false);
        setOpenMissionCardInfo(false);
        setDisplayArray(dataIndex[view]);
        break;
      case 2:
        setShowAlertView(false);
        setOpenCarCardInfo(false);
        setOpenMissionCardInfo(false);
        setDisplayArray(dataIndex[view]);
        break;
      case 3:
        setShowAlertView(true);
        setOpenMissionCardInfo(false);
        setOpenCarCardInfo(false);
        break;
      default:
        console.log("error");
        break;
    }
  }, [view]);

  return (
    <Content className="pad-content" style={{ overflowY: "scroll" }}>
      {(() => {
        if (showAlertView) {
          return <AlarmView></AlarmView>;
        }
        if (openCycleMissionList) {
          return (
            <CycleMissionTable
              setOpenCycleMissionList={setOpenCycleMissionList}
            ></CycleMissionTable>
          );
        }
        if (openCarCardInfo) {
          return <CarList></CarList>;
        }
        if (openMissionCardInfo) {
          return <MissionList></MissionList>;
        }
        return displayArray.map((card) => {
          return (
            <CardWrap
              key={card.key}
              id={card.key}
              setOpenCycleMissionList={setOpenCycleMissionList}
            ></CardWrap>
          );
        });
      })()}
    </Content>
  );
};

export default memo(PadContent);
