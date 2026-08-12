import React, { memo } from "react";
import "./car_info.css";

import Cards from "./Cards";
import { useAtomValue } from "jotai";
import { darkMode } from "@/utils/gloable";
import TittleTools from "./TittleTools";
import styled from "styled-components";

const IndustrialContainer = styled.div<{ $isDark: boolean }>`
  font-family: "Roboto Mono", monospace;
  background: ${({ $isDark }) => ($isDark ? "#1a1a1a" : "#f5f5f5")};
  padding: 20px;
  border-radius: 4px;
  min-height: 100%;
`;

const CarCardWrap: React.FC = () => {
  const isDark = useAtomValue(darkMode);
  return (
    <>
      <IndustrialContainer $isDark={isDark}>
        <TittleTools></TittleTools>
        <Cards></Cards>
      </IndustrialContainer>
    </>
  );
};

export default memo(CarCardWrap);
