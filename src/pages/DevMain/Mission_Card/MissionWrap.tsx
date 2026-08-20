import React from "react";
import styled from "styled-components";
import MissionTable from "./components/MissionTable";
import { useAtomValue } from "jotai";
import { darkMode } from "@/utils/gloable";

const IndustrialContainer = styled.div<{ $isDark: boolean }>`
  font-family: "Roboto Mono", monospace;
  background: ${({ $isDark }) => ($isDark ? "#1a1a1a" : "#f5f5f5")};
  padding: 20px;
  border-radius: 4px;
  min-height: 100%;
`;

const MissionWrap: React.FC = () => {
  const isDark = useAtomValue(darkMode);

  return (
    <IndustrialContainer $isDark={isDark}>

    <MissionTable /> 
    </IndustrialContainer>
  );
};

export default MissionWrap;
