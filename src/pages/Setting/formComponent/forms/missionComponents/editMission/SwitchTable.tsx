import { MTType } from "@/api/useMissionTitle";
import React, { FC } from "react";
import MissionTable from "./MissionTable";
import MissionList from "./MissionList";
import styled from "styled-components";

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

const Container = styled.div`
  display: flex;
  width: 100%;
  transition: all 0.3s ease;
`;

const Panel = styled.div<{ width: string; hidden?: boolean }>`
  width: ${(p) => p.width};
  transition: all 0.3s ease;
  overflow: hidden;
  ${(p) => p.hidden && `visibility: hidden; height: 0;`}
`;

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
}) => {
  return (
    <Container>
      <Panel width={selectedMissionKey === "" ? "100%" : "0%"}>
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
      </Panel>

      <Panel width={selectedMissionKey === "" ? "0%" : "100%"}>
        <MissionList
          selectedMissionKey={selectedMissionKey}
          setSelectedMissionKey={setSelectedMissionKey}
          missionName={missionName}
          selectedMissionCar={selectedMissionCar}
        />
      </Panel>
    </Container>
  );
};
export default SwitchTable;
