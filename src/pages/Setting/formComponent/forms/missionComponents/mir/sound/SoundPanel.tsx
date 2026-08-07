import FormHr from "@/pages/Setting/utils/FormHr";
import React, { FC, useState } from "react";
import styled from "styled-components";
import { Button, Tooltip } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { SoundsTable } from "./SoundsTable";
import { CreateSoundModal } from "./CreateSoundModal";

import type { SoundRow } from "../../../../../../../api/useSound";
import { EditSoundModal } from "./EditSoundModal";

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

const SoundsHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 0 4px;
`;

const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e2a4a;
`;

const HelpIcon = styled(QuestionCircleOutlined)`
  color: #98a2b3;
  font-size: 15px;
`;

const CreateButton = styled(Button)`
  background: #1e2a4a;
  border-color: #1e2a4a;

  &:hover,
  &:focus {
    background: #2a3a63 !important;
    border-color: #2a3a63 !important;
  }
`;

const SoundPanel: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSound, setEditingSound] = useState<SoundRow | null>(null);

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
          Sound
        </PanelHeader>
        <FormHr />
        <div style={{ flex: 1, minHeight: 0, width: "100%" }}>
          <SoundsHeaderRow>
            <TitleGroup>
              <Title>Sounds</Title>
              <Tooltip title="管理可以在任務中播放的聲音檔">
                <HelpIcon />
              </Tooltip>
            </TitleGroup>
            <CreateButton type="primary" onClick={() => setCreateOpen(true)}>
              Create
            </CreateButton>
          </SoundsHeaderRow>

          <SoundsTable onSelect={setEditingSound} />

          <CreateSoundModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
          />
          <EditSoundModal
            open={!!editingSound}
            sound={editingSound}
            onClose={() => setEditingSound(null)}
          />
        </div>
      </div>
    </IndustrialContainer>
  );
};

export default SoundPanel;