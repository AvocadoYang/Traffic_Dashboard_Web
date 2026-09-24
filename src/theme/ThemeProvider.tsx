import { useLayoutEffect, type FC, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { ConfigProvider } from "antd";
import { applyTheme } from "./applyTheme";
import { buildAntdTheme, buildAppAntdTheme } from "./antdTheme";
import { themeAtom } from "./themeAtom";

/**
 * 掛在 App 最外層。只負責把選到的主題灌成 <html> 上的 CSS 變數,
 * 不包 antd 的 ConfigProvider——因為舊頁(Main / Setting)還是走 antd 預設藍,
 * 整個 app 一起換 antd token 會連帶改到那些沒有驗證過的畫面。
 * 需要 antd 也跟著主題走的區塊自己包 ThemedConfigProvider(目前是 SettingV2)。
 */
export const ThemeVarsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const theme = useAtomValue(themeAtom);

  // useLayoutEffect:在瀏覽器畫下這一幀之前就把變數換掉,避免切主題時閃一下舊色。
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return <>{children}</>;
};

/** 讓底下的 antd 元件(Table / Select / Modal…)跟著主題走。 */
export const ThemedConfigProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const theme = useAtomValue(themeAtom);
  return (
    <ConfigProvider theme={buildAntdTheme(theme)}>{children}</ConfigProvider>
  );
};

/**
 * 舊頁用的版本。跟 ThemedConfigProvider 的差別見 buildAppAntdTheme:
 * 只換顏色與明暗演算法,不動排版。
 */
export const ThemedAppConfigProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const theme = useAtomValue(themeAtom);
  return (
    <ConfigProvider theme={buildAppAntdTheme(theme)}>{children}</ConfigProvider>
  );
};
