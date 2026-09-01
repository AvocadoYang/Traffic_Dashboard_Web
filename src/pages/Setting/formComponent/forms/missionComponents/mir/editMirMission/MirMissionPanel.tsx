
import FormHr from "@/pages/Setting/utils/FormHr";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import React, { FC, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

dayjs.extend(relativeTime);

const IndustrialContainer = styled.div`
  font-family: "Roboto Mono", monospace;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  padding: 5px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  height: 100%; /* 或用 calc(100vh - xxx) 依你的 layout 而定 */
`;

const PanelHeader = styled.h3`
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-left: 4px solid #1890ff;
  padding: 6px 8px;
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
  transition: all 0.2s ease;

  &:hover {
    background: #f0f5ff;
    border-left-color: #40a9ff;
  }
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  width: 100%;
  padding: 0 12px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;




const EditMirMissionPanel: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const { t } = useTranslation();

  return (
    <IndustrialContainer>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          height: "100%",
        }}
      >
        <PanelHeader {...listeners} {...attributes}>
          ""
        </PanelHeader>
        <FormHr />

        
      </div>
    </IndustrialContainer>
  );
};

export default EditMirMissionPanel;
