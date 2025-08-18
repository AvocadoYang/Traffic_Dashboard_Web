import { MTType } from "@/api/useMissionTitle";
import React, { FC } from "react";
import MissionTable from "./MissionTable";
import MissionList from "./MissionList";

interface SwitchTableProps {
  selectedMissionKey: string;
  setEditMissionKey: React.Dispatch<React.SetStateAction<string>>;
  setOpenMissionModel: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedMissionKey: React.Dispatch<React.SetStateAction<string>>;
  setSelectedMissionCar: React.Dispatch<React.SetStateAction<string>>;
  setMissionName: React.Dispatch<React.SetStateAction<string>>;
  missionName: string;
  selectedMissionCar: string;
  filterMissionData: MTType;
  children: React.ReactNode;
}

const SwitchTable: FC<SwitchTableProps> = ({
  selectedMissionKey,
  setEditMissionKey,
  setOpenMissionModel,
  setSelectedMissionKey,
  setSelectedMissionCar,
  missionName,
  selectedMissionCar,
  filterMissionData,
  setMissionName,
  children,
}) =>
  selectedMissionKey === "" ? (
    <>
      {children}
      <MissionTable
        selectedMissionKey={selectedMissionKey}
        setEditMissionKey={setEditMissionKey}
        setOpenMissionModel={setOpenMissionModel}
        setMissionName={setMissionName}
        setSelectedMissionKey={setSelectedMissionKey}
        setSelectedMissionCar={setSelectedMissionCar}
        allMissionTitle={filterMissionData}
      />
    </>
  ) : (
    <MissionList
      selectedMissionKey={selectedMissionKey}
      setSelectedMissionKey={setSelectedMissionKey}
      missionName={missionName}
      selectedMissionCar={selectedMissionCar}
    />
  );
export default SwitchTable;
