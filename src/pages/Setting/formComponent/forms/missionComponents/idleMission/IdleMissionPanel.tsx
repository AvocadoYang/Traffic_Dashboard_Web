import { FC } from "react";
import { Flex } from "antd";
import { useTranslation } from "react-i18next";
import IdleMissionForm from "./IdleMissionForm";
import IdleMissionTable from "./IdleMissionTable";
import FormHr from "@/pages/Setting/utils/FormHr";
import styled from "styled-components";
import { ClockCircleOutlined } from "@ant-design/icons";

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
  border-left: 4px solid #13c2c2;
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
    background: #e6fffb;
    border-left-color: #36cfc9;
  }
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
    background: #13c2c2;
    border: 2px solid #ffffff;
    box-shadow: 0 0 0 2px #d9d9d9;
  }
`;

const IdleMissionPanel: FC<{
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
        <ClockCircleOutlined />
        {t("mission.idle_mission.idle_mission")}
      </PanelHeader>
      <FormHr />

      <Flex gap="middle" justify="flex-start" align="start" vertical>
        <IdleMissionForm />
        <SectionDivider />
        <IdleMissionTable />
      </Flex>
    </IndustrialContainer>
  );
};

export default IdleMissionPanel;
