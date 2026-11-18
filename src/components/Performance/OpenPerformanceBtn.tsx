import { FC } from "react";
import { Tooltip } from "antd";
import { useSetAtom } from "jotai";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { OpenPerformancePanel } from "@/utils/gloable";

// 各頁的側欄排法不同 (模擬頁用百分比、Main 用 px), 所以位置交給呼叫端指定,
// 元件本身只負責外觀與開關。
const Btn = styled.div<{ $top: string; $left: string; $centered: boolean }>`
  position: absolute;
  z-index: 5;
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  ${({ $centered }) => ($centered ? "transform: translateY(-50%);" : "")}
  box-sizing: border-box;
  /* 固定 px: 用 em 的話字體大小偏好調大, 按鈕變大就會壓到旁邊的按鈕 */
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text);
  background-color: var(--c-bg);
  border: 1px solid var(--c-border-strong);
  border-radius: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;

  svg {
    width: 22px;
    height: 22px;
    fill: currentColor;
  }

  &:hover {
    color: var(--c-header-accent);
    border-color: var(--c-header-accent);
  }
`;

const OpenPerformanceBtn: FC<{
  /** 垂直位置。模擬頁用 % (需要置中補正), Main 用 px */
  top?: string;
  left?: string;
}> = ({ top = "11%", left = "20px" }) => {
  const { t } = useTranslation();
  const setOpen = useSetAtom(OpenPerformancePanel);

  return (
    <Tooltip title={t("sim.perf.title")} placement="right">
      <Btn
        $top={top}
        $left={left}
        $centered={top.endsWith("%")}
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <title>speedometer</title>
          <path d="M12,16A3,3 0 0,1 9,13C9,11.88 9.61,10.9 10.5,10.39L20.21,4.77L14.68,14.35C14.18,15.33 13.17,16 12,16M12,3C13.81,3 15.5,3.5 16.97,4.32L14.87,5.53C14,5.19 13,5 12,5A8,8 0 0,0 4,13C4,15.21 4.89,17.21 6.34,18.65H6.35C6.74,19.04 6.74,19.67 6.35,20.06C5.96,20.45 5.32,20.45 4.93,20.07V20.07C3.12,18.26 2,15.76 2,13A10,10 0 0,1 12,3M22,13C22,15.76 20.88,18.26 19.07,20.07V20.07C18.68,20.45 18.05,20.45 17.66,20.06C17.27,19.67 17.27,19.04 17.66,18.65V18.65C19.11,17.2 20,15.21 20,13C20,12 19.81,11 19.46,10.1L20.67,8C21.5,9.5 22,11.18 22,13Z" />
        </svg>
      </Btn>
    </Tooltip>
  );
};

export default OpenPerformanceBtn;
