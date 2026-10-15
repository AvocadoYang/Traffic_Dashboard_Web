import { FC } from "react";
import { Segmented } from "antd";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { PathDirection } from "../model/types";
import { commitAtom, docAtom, toolAtom } from "../state/editorAtoms";

const Bar = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  pointer-events: none;
  z-index: 2;

  > * {
    pointer-events: auto;
  }
`;

const Hint = styled.div`
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  color: var(--c-text-secondary);
  font-size: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
`;

/** 畫布上方: 目前工具怎麼用; 畫路線時可以切換新路線的方向 */
const HintBar: FC = () => {
  const { t } = useTranslation();
  const tool = useAtomValue(toolAtom);
  const doc = useAtomValue(docAtom);
  const commit = useSetAtom(commitAtom);

  return (
    <Bar>
      <Hint data-testid="simv2-hint">{t(`sim_v2.hint.${tool}`)}</Hint>
      {tool === "path" && (
        <Segmented<PathDirection>
          size="small"
          value={doc.editor.defaultDirection}
          options={[
            { value: "two-way", label: t("sim_v2.direction.two-way") },
            { value: "one-way", label: t("sim_v2.direction.one-way") },
          ]}
          onChange={(v) => commit((d) => ({ ...d, editor: { ...d.editor, defaultDirection: v } }))}
        />
      )}
    </Bar>
  );
};

export default HintBar;
