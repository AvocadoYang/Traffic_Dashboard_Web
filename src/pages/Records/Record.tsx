import styled from "styled-components";
import Layout, { Content } from "antd/es/layout/layout";
import { ConfigProvider, Segmented } from "antd";
import Header from "@/components/Header";
import { FC, useState } from "react";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import WarningTable from "./WarningTable";
import AlarmTable from "./AlarmTable";
import SystemAlarmTable from "./SystemAlarmTable";
import useIsWebMediaQuery from "@/hooks/useIsWebMediaQuery";
import { mq } from "@/styles/responsive";
import { themeAtom } from "@/theme";

// 整頁固定在一個螢幕高,捲動交給各個面板裡的表格,
// 這樣表頭跟換頁鈕永遠看得到。
const StyledLayout = styled(Layout)`
  height: var(--app-height);
  overflow: hidden;
`;

const StyledContent = styled(Content)`
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--c-bg-muted);
  /* 橫放的手機高度不夠時,整頁還是可以往下捲,不會把表格壓到看不見 */
  overflow-y: auto;

  ${mq.pad} {
    gap: var(--space-md);
    padding: var(--space-md);
  }
`;

const TabBar = styled.div`
  flex: 0 0 auto;
`;

// 桌機:三種紀錄並排。
// 平板 / 手機:一次只看一種(用上面的分頁切換),面板吃滿整個寬度。
const PanelGrid = styled.div`
  flex: 1 1 auto;
  min-height: 320px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-md);

  ${mq.web} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

type RecordTab = "system" | "warning" | "alarm";

const Record: FC = () => {
  const { t } = useTranslation();
  const isWeb = useIsWebMediaQuery();
  const [tab, setTab] = useState<RecordTab>("system");
  // antd 的 token 不能吃 var(),要餵真實色碼,所以這裡直接拿 palette
  const { colors } = useAtomValue(themeAtom);

  return (
    <StyledLayout>
      <Header />
      <StyledContent>
        {!isWeb && (
          <TabBar>
            <ConfigProvider
              theme={{
                components: {
                  Segmented: {
                    trackBg: colors.bg,
                    itemColor: colors.textSecondary,
                    itemHoverColor: colors.text,
                    itemHoverBg: colors.bgMuted,
                    itemSelectedBg: colors.headerAccentSoft,
                    itemSelectedColor: colors.headerAccent,
                  },
                },
              }}
            >
              <Segmented<RecordTab>
                block
                value={tab}
                onChange={setTab}
                options={[
                  { label: t("records.system_alarm"), value: "system" },
                  { label: t("records.warning"), value: "warning" },
                  { label: t("records.alarm"), value: "alarm" },
                ]}
              />
            </ConfigProvider>
          </TabBar>
        )}
        <PanelGrid>
          {(isWeb || tab === "system") && <SystemAlarmTable />}
          {(isWeb || tab === "warning") && <WarningTable />}
          {(isWeb || tab === "alarm") && <AlarmTable />}
        </PanelGrid>
      </StyledContent>
    </StyledLayout>
  );
};

export default Record;
