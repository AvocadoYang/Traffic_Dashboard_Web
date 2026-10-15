import { FC } from "react";
import { Button, Dropdown, Segmented, Select, Tooltip } from "antd";
import { CopyOutlined, DeleteOutlined, EditOutlined, ExportOutlined, MoreOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import { useAtom, useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { ProjectSummary } from "../api/simV2Api";
import { WorkspaceTab, isDirtyAtom, projectAtom, workspaceTabAtom } from "../state/editorAtoms";

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 8px 12px;
  background: var(--c-bg);
  border-bottom: 1px solid var(--c-border);
`;

const Group = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Dirty = styled.span<{ $dirty: boolean }>`
  font-size: 12px;
  color: ${(p) => (p.$dirty ? "var(--c-warning)" : "var(--c-text-muted)")};
`;

export type ProjectAction = "new" | "info" | "copy" | "export" | "delete";

/** 第 1 階段只有佈局, 其他分頁先看得到、按不了 */
const TABS: { value: WorkspaceTab; enabled: boolean }[] = [
  { value: "layout", enabled: true },
  { value: "vehicles", enabled: false },
  { value: "demand", enabled: false },
  { value: "run", enabled: false },
];

const ProjectBar: FC<{
  projects: ProjectSummary[];
  loading: boolean;
  saving: boolean;
  onSwitch: (id: string) => void;
  onAction: (action: ProjectAction) => void;
  onSave: () => void;
}> = ({ projects, loading, saving, onSwitch, onAction, onSave }) => {
  const { t } = useTranslation();
  const project = useAtomValue(projectAtom);
  const dirty = useAtomValue(isDirtyAtom);
  const [tab, setTab] = useAtom(workspaceTabAtom);

  return (
    <Bar>
      <Group>
        <Select
          showSearch
          optionFilterProp="label"
          style={{ width: 240 }}
          placeholder={t("sim_v2.project.pick")}
          loading={loading}
          value={project?.id}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          onChange={onSwitch}
          data-testid="simv2-project-select"
        />
        <Button icon={<PlusOutlined />} onClick={() => onAction("new")} data-testid="simv2-new-project">
          {t("sim_v2.project.new")}
        </Button>
        <Dropdown
          disabled={!project}
          trigger={["click"]}
          menu={{
            items: [
              { key: "info", icon: <EditOutlined />, label: t("sim_v2.project.info") },
              { key: "copy", icon: <CopyOutlined />, label: t("sim_v2.project.copy") },
              { key: "export", icon: <ExportOutlined />, label: t("sim_v2.project.export") },
              { type: "divider" },
              { key: "delete", icon: <DeleteOutlined />, label: t("sim_v2.project.delete"), danger: true },
            ],
            onClick: ({ key }) => onAction(key as ProjectAction),
          }}
        >
          <Button icon={<MoreOutlined />} aria-label={t("sim_v2.project.more")} data-testid="simv2-project-more" />
        </Dropdown>
      </Group>
      {project && (
        <Segmented<WorkspaceTab>
          value={tab}
          onChange={setTab}
          options={TABS.map((x) => ({
            value: x.value,
            disabled: !x.enabled,
            label: x.enabled ? (
              t(`sim_v2.tab.${x.value}`)
            ) : (
              <Tooltip title={t("sim_v2.tab.next_phase")}>
                <span>{t(`sim_v2.tab.${x.value}`)}</span>
              </Tooltip>
            ),
          }))}
        />
      )}
      {project && (
        <Group style={{ marginLeft: "auto" }}>
          <Dirty $dirty={dirty} data-testid="simv2-dirty">
            {dirty ? t("sim_v2.project.unsaved") : t("sim_v2.project.saved")}
          </Dirty>
          <Tooltip title="Ctrl+S">
            <Button type="primary" icon={<SaveOutlined />} disabled={!dirty} loading={saving} onClick={onSave} data-testid="simv2-save">
              {t("sim_v2.project.save")}
            </Button>
          </Tooltip>
        </Group>
      )}
    </Bar>
  );
};

export default ProjectBar;
