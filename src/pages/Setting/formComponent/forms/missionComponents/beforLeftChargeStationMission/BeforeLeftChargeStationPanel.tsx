import { FC } from "react";
import { useTranslation } from "react-i18next";
import FormHr from "@/pages/Setting/utils/FormHr";
import BeforeLeftChargeStationTable from "./BeforeLeftChargeStationTable";
import styled from "styled-components";
import { ThunderboltOutlined } from "@ant-design/icons";
import BeforeLeftChargeStationForm from "./BeforeLeftChargeStationForm";

const IndustrialContainer = styled.div`
  font-family: "Roboto Mono", monospace;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const PanelHeader = styled.h3`
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-left: 4px solid #722ed1;
  padding: 12px 16px;
  margin: 0 0 20px 0;
  font-family: "Roboto Mono", monospace;
  color: #262626;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 14px;
  cursor: move;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: #f9f0ff;
    border-left-color: #9254de;
  }
`;

const ContentWrapper = styled.div`
  min-width: 600px;
`;

const SectionDivider = styled.div`
  height: 2px;
  background: repeating-linear-gradient(
    90deg,
    #d9d9d9 0,
    #d9d9d9 10px,
    transparent 10px,
    transparent 20px
  );
  margin: 24px 0;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    background: #722ed1;
    border: 2px solid #ffffff;
    box-shadow: 0 0 0 2px #d9d9d9;
  }
`;

const BeforeLeftChargeStationPanel: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const { t } = useTranslation();
  return (
    <IndustrialContainer>
      <PanelHeader {...listeners} {...attributes}>
        <ThunderboltOutlined />
        {t(
          "mission.before_left_charge_station_mission.before_left_charge_station_mission"
        )}
      </PanelHeader>
      <FormHr />
      <ContentWrapper>
        <BeforeLeftChargeStationForm />
        <SectionDivider />
        <BeforeLeftChargeStationTable />
      </ContentWrapper>
    </IndustrialContainer>
  );
};

export default BeforeLeftChargeStationPanel;
