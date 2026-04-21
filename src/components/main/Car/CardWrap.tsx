import React, { memo } from "react";
import "./car_info.css";

import Cards from "./Cards";
import { useAtomValue } from "jotai";
import { darkMode } from "@/utils/gloable";
import TittleTools from "./TittleTools";
import styled from "styled-components";

const IndustrialContainer = styled.div`
  font-family: "Roboto Mono", monospace;
  background: "#f5f5f5";
  padding: 20px;
  border-radius: 4px;
  min-height: 100vh;
`;

const CarCardWrap: React.FC = () => {
  const isDark = useAtomValue(darkMode);
  return (
    <>
      <IndustrialContainer>
        <TittleTools></TittleTools>
        <Cards></Cards>
      </IndustrialContainer>
    </>
  );
};

export default memo(CarCardWrap);
