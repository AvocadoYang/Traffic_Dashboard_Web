import { Tooltip } from "antd";
import { useSetAtom } from "jotai";
import { FC, memo } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { TimelineHeight } from "../../utils/mapStatus";

const SwitchHeight = styled.div`
  position: absolute;
  z-index: 5;
  top: 75%;
  left: 20px;
  transform: translateY(-50%);
  background-color: #f5f5f5;
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

  &:hover {
    opacity: 1;
  }
`;

const SwitchPanelHeightBtn: FC<{}> = () => {
  const { t } = useTranslation();
  const setHeightMode = useSetAtom(TimelineHeight);

  const toggleHeightMode = () => {
    setHeightMode((prevMode) =>
      prevMode === "mini" ? "normal" : prevMode === "normal" ? "full" : "mini",
    );
  };
  return (
    <Tooltip title={t("sim.timeline.change_timeline_height")} placement="right">
      <SwitchHeight onClick={toggleHeightMode}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <title>ruler</title>
          <path d="M1.39,18.36L3.16,16.6L4.58,18L5.64,16.95L4.22,15.54L5.64,14.12L8.11,16.6L9.17,15.54L6.7,13.06L8.11,11.65L9.53,13.06L10.59,12L9.17,10.59L10.59,9.17L13.06,11.65L14.12,10.59L11.65,8.11L13.06,6.7L14.47,8.11L15.54,7.05L14.12,5.64L15.54,4.22L18,6.7L19.07,5.64L16.6,3.16L18.36,1.39L22.61,5.64L5.64,22.61L1.39,18.36Z" />
        </svg>
      </SwitchHeight>
    </Tooltip>
  );
};

export default memo(SwitchPanelHeightBtn, () => true);
