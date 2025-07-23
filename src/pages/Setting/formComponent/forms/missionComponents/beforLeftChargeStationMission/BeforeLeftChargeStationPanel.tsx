import { FC } from "react";
import { useTranslation } from "react-i18next";
import FormHr from "@/pages/Setting/utils/FormHr";
import BeforeLeftChargeStationTable from "./BeforeLeftChargeStationTable";
import BeforeLeftChargeStationForm from "./BeforeLeftChargeStationForm";
import styled from "styled-components";

const Wrapper = styled.div`
  min-width: 600px;
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
    <>
      <div>
        <h3 className="drop_button_style" {...listeners} {...attributes}>
          {t(
            "mission.before_left_charge_station_mission.before_left_charge_station_mission",
          )}
        </h3>
        <FormHr />
        <Wrapper>
          <BeforeLeftChargeStationForm />
          <BeforeLeftChargeStationTable />
        </Wrapper>
      </div>
    </>
  );
};

export default BeforeLeftChargeStationPanel;
