import { FC } from "react";
import { Tooltip } from "antd";
import { useSetAtom } from "jotai";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { OpenScenarioDrawer } from "../../utils/mapStatus";

// 左側欄由上往下: 11% 效能 / 18% 情境 / 25% 切換腳本 /
// 30-70% 車輛面板 (top:50% + height:40vh) / 75% 時間軸高度 / 82% 排程表。
// 車輛面板那一段不能放東西, 會被蓋住。
const Btn = styled.div`
  position: absolute;
  z-index: 5;
  top: 18%;
  left: 20px;
  transform: translateY(-50%);
  background-color: var(--c-bg-subtle);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  opacity: 0.9;
  transition: opacity 0.3s ease-in-out;
  width: 3em;
  height: 3em;
  padding: 1em 0em;
  justify-content: space-between;
  cursor: pointer;

  &:hover {
    opacity: 1;
  }
`;

const OpenScenarioBtn: FC = () => {
  const { t } = useTranslation();
  const setOpen = useSetAtom(OpenScenarioDrawer);

  return (
    <Tooltip title={t("sim.scenario.title")} placement="right">
      <Btn onClick={() => setOpen((prev) => !prev)}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <title>sitemap</title>
          <path d="M9,2V8H11V11H5C3.89,11 3,11.89 3,13V16H1V22H7V16H5V13H11V16H9V22H15V16H13V13H19V16H17V22H23V16H21V13C21,11.89 20.11,11 19,11H13V8H15V2H9Z" />
        </svg>
      </Btn>
    </Tooltip>
  );
};

export default OpenScenarioBtn;
