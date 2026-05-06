import { useSetAtom } from "jotai";
import { OpenScheduleTable } from "../../utils/mapStatus";
import { Tooltip } from "antd";
import styled from "styled-components";
import { useTranslation } from "react-i18next";

const SwitchHeight = styled.div`
  position: absolute;
  z-index: 5;
  top: 82%;
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

const OpenScheduleTableBtn = () => {
  const { t } = useTranslation();
  const setOpen = useSetAtom(OpenScheduleTable);

  return (
    <Tooltip title={t("sim.timeline.table_view")} placement="right">
      <SwitchHeight onClick={() => setOpen((prev) => !prev)}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <title>table-clock</title>
          <path d="M16.5 15.82L18.94 17.23L18.19 18.53L15 16.69V13H16.5V15.82M20 10.26V5C20 3.9 19.11 3 18 3H4C2.9 3 2 3.9 2 5V17C2 18.11 2.9 19 4 19H9.68C10.81 21.36 13.21 23 16 23C19.87 23 23 19.87 23 16C23 13.62 21.81 11.53 20 10.26M18 7V9.29C17.37 9.11 16.7 9 16 9C14.5 9 13.13 9.47 12 10.26V7H18M4 7H10V11H4V7M4 17V13H9.68C9.25 13.91 9 14.93 9 16C9 16.34 9.03 16.67 9.08 17H4M16 21C13.24 21 11 18.76 11 16S13.24 11 16 11 21 13.24 21 16 18.76 21 16 21Z" />
        </svg>
      </SwitchHeight>
    </Tooltip>
  );
};

export default OpenScheduleTableBtn;
