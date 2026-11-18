import React, { useState } from "react";
import styled from "styled-components";
import TitleTools from "./TitleTools";
import MissionTable from "./components/MissionTable";
import ScheduleTable from "./components/ScheduleTable";
import { useAtomValue } from "jotai";
import { darkMode } from "@/utils/gloable";
import { ConfigProvider } from "antd";
import { FONT_UI } from "@/styles/fonts";

const IndustrialContainer = styled.div<{ $isDark: boolean }>`
  font-family: var(--font-ui);
  background: var(--c-bg-subtle);
  padding: 18px 14px;

  /* 全站是 * { 等寬字 }, 側欄裡一律跟著介面字 */
  & * {
    font-family: inherit;
  }
  border-radius: 0;
  min-height: 100%;
`;
export type Mission_Switch = "mission" | "schedule";
const MissionWrap: React.FC = () => {
  const isDark = useAtomValue(darkMode);
  const [viewSwitch, setViewSwitch] = useState<Mission_Switch>("mission");

  return (
    // 側欄裡的 antd 元件 (表格、按鈕、篩選選單) 也用介面字
    <ConfigProvider theme={{ token: { fontFamily: FONT_UI } }}>
      <IndustrialContainer $isDark={isDark}>
        <TitleTools viewSwitch={viewSwitch} setViewSwitch={setViewSwitch} />
        {viewSwitch === "mission" ? <MissionTable /> : <ScheduleTable />}
      </IndustrialContainer>
    </ConfigProvider>
  );
};

export default MissionWrap;
