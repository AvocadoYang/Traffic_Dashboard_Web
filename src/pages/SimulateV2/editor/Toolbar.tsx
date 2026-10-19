import { FC, ReactNode } from "react";
import { Button, Tooltip } from "antd";
import {
  AimOutlined,
  CarOutlined,
  ColumnWidthOutlined,
  DeleteOutlined,
  ExpandOutlined,
  InboxOutlined,
  NodeIndexOutlined,
  PictureOutlined,
  RedoOutlined,
  SelectOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { deleteItems } from "../model/ops";
import {
  EMPTY_SELECTION,
  Tool,
  canRedoAtom,
  canUndoAtom,
  commitAtom,
  fitRequestAtom,
  redoAtom,
  selectionAtom,
  switchToolAtom,
  toolAtom,
  undoAtom,
} from "../state/editorAtoms";

const Bar = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 6px;
  background: var(--c-bg);
  border-right: 1px solid var(--c-border);
  overflow-y: auto;
`;

const Sep = styled.div`
  width: 24px;
  height: 1px;
  margin: 4px 0;
  background: var(--c-border);
`;

const TOOLS: { tool: Tool; key: string; icon: ReactNode }[] = [
  { tool: "select", key: "V", icon: <SelectOutlined /> },
  { tool: "point", key: "P", icon: <AimOutlined /> },
  { tool: "path", key: "L", icon: <NodeIndexOutlined /> },
  { tool: "station", key: "S", icon: <InboxOutlined /> },
  { tool: "standby", key: "W", icon: <CarOutlined /> },
  { tool: "measure", key: "M", icon: <ColumnWidthOutlined /> },
];

const Toolbar: FC<{ onOpenBackground: () => void }> = ({ onOpenBackground }) => {
  const { t } = useTranslation();
  const tool = useAtomValue(toolAtom);
  const switchTool = useSetAtom(switchToolAtom);
  const undo = useSetAtom(undoAtom);
  const redo = useSetAtom(redoAtom);
  const canUndo = useAtomValue(canUndoAtom);
  const canRedo = useAtomValue(canRedoAtom);
  const selection = useAtomValue(selectionAtom);
  const setSelection = useSetAtom(selectionAtom);
  const commit = useSetAtom(commitAtom);
  const fit = useSetAtom(fitRequestAtom);
  const hasSelection = selection.nodeIds.length + selection.pathIds.length > 0;

  const tip = (title: string, key?: string) => (key ? `${title} (${key})` : title);

  return (
    <Bar>
      {TOOLS.map((item) => (
        <Tooltip key={item.tool} title={tip(t(`sim_v2.tool.${item.tool}`), item.key)} placement="right">
          <Button
            type={tool === item.tool ? "primary" : "text"}
            icon={item.icon}
            aria-label={t(`sim_v2.tool.${item.tool}`)}
            data-tool={item.tool}
            onClick={() => switchTool(item.tool)}
          />
        </Tooltip>
      ))}
      <Sep />
      <Tooltip title={t("sim_v2.tool.background")} placement="right">
        <Button
          type={tool === "calibrate" ? "primary" : "text"}
          icon={<PictureOutlined />}
          aria-label={t("sim_v2.tool.background")}
          data-tool="background"
          onClick={onOpenBackground}
        />
      </Tooltip>
      <Sep />
      <Tooltip title={tip(t("sim_v2.tool.undo"), "Ctrl+Z")} placement="right">
        <Button type="text" icon={<UndoOutlined />} disabled={!canUndo} onClick={() => undo()} aria-label={t("sim_v2.tool.undo")} />
      </Tooltip>
      <Tooltip title={tip(t("sim_v2.tool.redo"), "Ctrl+Y")} placement="right">
        <Button type="text" icon={<RedoOutlined />} disabled={!canRedo} onClick={() => redo()} aria-label={t("sim_v2.tool.redo")} />
      </Tooltip>
      <Tooltip title={tip(t("sim_v2.tool.delete"), "Delete")} placement="right">
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          disabled={!hasSelection}
          aria-label={t("sim_v2.tool.delete")}
          onClick={() => {
            commit((d) => deleteItems(d, selection.nodeIds, selection.pathIds));
            setSelection(EMPTY_SELECTION);
          }}
        />
      </Tooltip>
      <Tooltip title={tip(t("sim_v2.tool.fit"), "F")} placement="right">
        <Button type="text" icon={<ExpandOutlined />} onClick={() => fit((n) => n + 1)} aria-label={t("sim_v2.tool.fit")} />
      </Tooltip>
    </Bar>
  );
};

export default Toolbar;
