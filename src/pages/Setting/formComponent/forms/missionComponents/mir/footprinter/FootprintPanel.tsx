import FormHr from "@/pages/Setting/utils/FormHr";
import React, { FC } from "react";
import styled from "styled-components";
import { FootprintEditor } from "./FootprintEditor";

const IndustrialContainer = styled.div`
  font-family: "Roboto Mono", monospace;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  padding: 5px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  height: 100%;        /* 或用 calc(100vh - xxx) 依你的 layout 而定 */
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

const FootprintPanel: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {

  return (
<IndustrialContainer>
      {/* 🎯 修改點：使用 display: flex + flex-direction: column 讓內容撐開 */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, height: "100%" }}>
        <PanelHeader {...listeners} {...attributes}>
          Footprint
        </PanelHeader>
        <FormHr />
        <div style={{ flex: 1, minHeight: 0, width: "100%" }}>
          <FootprintEditor />
        </div>
      </div>
    </IndustrialContainer>
  );
};

export default FootprintPanel;
