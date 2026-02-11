import React, { useState } from "react";
import styled from "styled-components";
import TitleTools from "./TitleTools";
import MissionTable from "./components/MissionTable";
import ScheduleTable from "./components/ScheduleTable";
import { useAtomValue } from "jotai";
import { darkMode } from "@/utils/gloable";

const IndustrialContainer = styled.div<{ $isDark: boolean }>`
  font-family: "Roboto Mono", monospace;
  background: ${({ $isDark }) => ($isDark ? "#1a1a1a" : "#f5f5f5")};
  padding: 20px;
  border-radius: 4px;
  min-height: 100vh;
`;
export type Mission_Switch = "mission" | "schedule";
const MissionWrap: React.FC = () => {
  const isDark = useAtomValue(darkMode);
  const [viewSwitch, setViewSwitch] = useState<Mission_Switch>("mission");

  return (
    <IndustrialContainer $isDark={isDark}>
      <TitleTools viewSwitch={viewSwitch} setViewSwitch={setViewSwitch} />
      {viewSwitch === "mission" ? <MissionTable /> : <ScheduleTable />}
    </IndustrialContainer>
  );
};

export default MissionWrap;
