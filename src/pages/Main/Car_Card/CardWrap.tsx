import React, { memo } from "react";
import "./car_info.css";

import Cards from "./Cards";
import { useAtomValue } from "jotai";
import { darkMode } from "@/utils/gloable";
import TittleTools from "./TittleTools";
import styled from "styled-components";
import { ConfigProvider } from "antd";
import { FONT_UI } from "@/styles/fonts";

const IndustrialContainer = styled.div<{ $isDark: boolean }>`
  font-family: var(--font-ui);
  background: var(--c-bg-subtle);
  padding: 18px 14px;

  & * {
    font-family: inherit;
  }
  border-radius: 0;
  min-height: 100%;
`;

const CarCardWrap: React.FC = () => {
  const isDark = useAtomValue(darkMode);
  return (
    // 側欄裡的 antd 元件 (選單、按鈕、彈出選單) 也用介面字, 不用全站的等寬字
    <ConfigProvider theme={{ token: { fontFamily: FONT_UI } }}>
      <IndustrialContainer $isDark={isDark}>
        <TittleTools></TittleTools>
        <Cards></Cards>
      </IndustrialContainer>
    </ConfigProvider>
  );
};

export default memo(CarCardWrap);
