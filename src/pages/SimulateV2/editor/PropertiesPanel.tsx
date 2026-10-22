import { FC, ReactNode, useMemo, useState } from "react";
import { App, Button, Empty, Input, Segmented, Select, Tag, Tooltip } from "antd";
import { AimOutlined, DeleteOutlined, MinusOutlined, PlusOutlined, SwapOutlined } from "@ant-design/icons";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { formatLength } from "../model/geometry";
import {
  createGroup,
  deleteGroup,
  deleteItems,
  nodeMap,
  pathLength,
  reversePaths,
  setKind,
  totalPathLength,
  updateGroup,
  updateNode,
  updatePaths,
  updateStations,
} from "../model/ops";
import { NodeKind, PathDirection, SimDoc, SimNode, SimPath, StationType } from "../model/types";
import { EMPTY_SELECTION, commitAtom, docAtom, selectionAtom } from "../state/editorAtoms";
import { BlurNumber, BlurText } from "./fields";
import { STATION_COLORS, useCanvasColors } from "./hooks";

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px;
  background: var(--c-bg);
  border-left: 1px solid var(--c-border);
  overflow-y: auto;
  font-size: 13px;
`;

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--c-text);
`;

const Rows = styled.div`
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  color: var(--c-text-secondary);

  > .full {
    grid-column: 1 / -1;
  }
`;

const Value = styled.span`
  color: var(--c-text);
  word-break: break-all;
`;

const Swatch = styled.i<{ $color: string; $round?: boolean; $ring?: boolean }>`
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 6px;
  vertical-align: -1px;
  background: ${(p) => (p.$ring ? "transparent" : p.$color)};
  border: ${(p) => (p.$ring ? `2px solid ${p.$color}` : "none")};
  border-radius: ${(p) => (p.$round || p.$ring ? "50%" : "2px")};
`;

const Section: FC<{ title: ReactNode; extra?: ReactNode; children: ReactNode; testId?: string }> = ({ title, extra, children, testId }) => (
  <div data-testid={testId}>
    <SectionTitle>
      <span>{title}</span>
      {extra}
    </SectionTitle>
    {children}
  </div>
);

const useKindOptions = () => {
  const { t } = useTranslation();
  return (["point", "station", "standby"] as NodeKind[]).map((k) => ({ value: k, label: t(`sim_v2.kind.${k}`) }));
};

const StationFields: FC<{ nodes: SimNode[] }> = ({ nodes }) => {
  const { t } = useTranslation();
  const commit = useSetAtom(commitAtom);
  const ids = nodes.map((n) => n.id);
  const s = nodes[0]?.station;
  if (!s) return null;
  const mixed = nodes.some((n) => JSON.stringify(n.station) !== JSON.stringify(s));
  return (
    <>
      {mixed && <div className="full">{t("sim_v2.props.mixed_station")}</div>}
      <span>{t("sim_v2.props.station_type")}</span>
      <Select<StationType>
        size="small"
        value={s.type}
        data-testid="simv2-station-type"
        options={(["pick", "drop", "both"] as StationType[]).map((v) => ({
          value: v,
          label: (
            <span>
              <Swatch $color={STATION_COLORS[v]} />
              {t(`sim_v2.station_type.${v}`)}
            </span>
          ),
        }))}
        onChange={(v) => commit((d) => updateStations(d, ids, { type: v }))}
      />
      {s.type !== "drop" && (
        <>
          <span>{t("sim_v2.props.pick_sec")}</span>
          <BlurNumber value={s.pickSec} min={0} max={3600} suffix={t("sim_v2.unit.sec")} onCommit={(v) => v !== null && commit((d) => updateStations(d, ids, { pickSec: v }))} />
        </>
      )}
      {s.type !== "pick" && (
        <>
          <span>{t("sim_v2.props.drop_sec")}</span>
          <BlurNumber value={s.dropSec} min={0} max={3600} suffix={t("sim_v2.unit.sec")} onCommit={(v) => v !== null && commit((d) => updateStations(d, ids, { dropSec: v }))} />
        </>
      )}
      {s.type !== "drop" && (
        <>
          <Tooltip title={t("sim_v2.props.buffer_tip")}>
            <span>{t("sim_v2.props.buffer")}</span>
          </Tooltip>
          <BlurNumber
            value={s.bufferMax}
            min={1}
            max={9999}
            precision={0}
            allowEmpty
            placeholder={t("sim_v2.props.unlimited")}
            suffix={t("sim_v2.unit.pallet")}
            onCommit={(v) => commit((d) => updateStations(d, ids, { bufferMax: v }))}
          />
        </>
      )}
    </>
  );
};

const PathFields: FC<{ paths: SimPath[] }> = ({ paths }) => {
  const { t } = useTranslation();
  const commit = useSetAtom(commitAtom);
  const ids = paths.map((p) => p.id);
  const first = paths[0];
  const sameDirection = paths.every((p) => p.direction === first.direction);
  const sameSpeed = paths.every((p) => p.maxSpeed === first.maxSpeed);
  return (
    <>
      <span>{t("sim_v2.props.direction")}</span>
      <Segmented<PathDirection>
        size="small"
        value={sameDirection ? first.direction : undefined}
        data-testid="simv2-path-direction"
        options={(["two-way", "one-way"] as PathDirection[]).map((v) => ({ value: v, label: t(`sim_v2.direction.${v}`) }))}
        onChange={(v) => commit((d) => updatePaths(d, ids, { direction: v }))}
      />
      {paths.some((p) => p.direction === "one-way") && (
        <>
          <span />
          <Button size="small" icon={<SwapOutlined />} onClick={() => commit((d) => reversePaths(d, ids))}>
            {t("sim_v2.props.reverse")}
          </Button>
        </>
      )}
      <Tooltip title={t("sim_v2.props.max_speed_tip")}>
        <span>{t("sim_v2.props.max_speed")}</span>
      </Tooltip>
      <BlurNumber
        value={sameSpeed ? first.maxSpeed : null}
        min={0.05}
        max={10}
        step={0.1}
        allowEmpty
        placeholder={sameSpeed ? t("sim_v2.props.vehicle_speed") : t("sim_v2.props.mixed")}
        suffix="m/s"
        onCommit={(v) => commit((d) => updatePaths(d, ids, { maxSpeed: v }))}
      />
    </>
  );
};

const NodeProps: FC<{ doc: SimDoc; node: SimNode }> = ({ doc, node }) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const commit = useSetAtom(commitAtom);
  const kindOptions = useKindOptions();
  const connections = doc.paths.filter((p) => p.from === node.id || p.to === node.id).length;
  const groups = doc.groups.filter((g) => g.nodeIds.includes(node.id));
  return (
    <Section title={t("sim_v2.props.node_title")} testId="simv2-node-props">
      <Rows>
        <span>{t("sim_v2.props.name")}</span>
        <BlurText
          value={node.name}
          testId="simv2-node-name"
          onCommit={(v) => {
            if (doc.nodes.some((n) => n.id !== node.id && n.name === v)) {
              message.error(t("sim_v2.msg.name_taken", { name: v }));
              return false;
            }
            commit((d) => updateNode(d, node.id, { name: v }));
          }}
        />
        <span>X</span>
        <BlurNumber value={node.x} step={0.1} precision={3} suffix="m" onCommit={(v) => v !== null && commit((d) => updateNode(d, node.id, { x: v }))} />
        <span>Y</span>
        <BlurNumber value={node.y} step={0.1} precision={3} suffix="m" onCommit={(v) => v !== null && commit((d) => updateNode(d, node.id, { y: v }))} />
        <span>{t("sim_v2.props.kind")}</span>
        <Segmented<NodeKind>
          size="small"
          value={node.kind}
          options={kindOptions}
          data-testid="simv2-node-kind"
          onChange={(k) => commit((d) => setKind(d, [node.id], k))}
        />
        {node.kind === "station" && <StationFields nodes={[node]} />}
        <span>{t("sim_v2.props.connections")}</span>
        <Value>{t("sim_v2.props.connections_count", { count: connections })}</Value>
        {groups.length > 0 && (
          <>
            <span>{t("sim_v2.props.groups")}</span>
            <span>
              {groups.map((g) => (
                <Tag key={g.id}>{g.name}</Tag>
              ))}
            </span>
          </>
        )}
      </Rows>
    </Section>
  );
};

const PathProps: FC<{ doc: SimDoc; path: SimPath }> = ({ doc, path }) => {
  const { t } = useTranslation();
  const nodes = nodeMap(doc);
  return (
    <Section title={t("sim_v2.props.path_title")} testId="simv2-path-props">
      <Rows>
        <span>{t("sim_v2.props.from")}</span>
        <Value>{nodes.get(path.from)?.name}</Value>
        <span>{t("sim_v2.props.to")}</span>
        <Value>{nodes.get(path.to)?.name}</Value>
        <span>{t("sim_v2.props.length")}</span>
        <Value data-testid="simv2-path-length">{formatLength(pathLength(doc, path, nodes))}</Value>
        <PathFields paths={[path]} />
      </Rows>
    </Section>
  );
};

const NewGroup: FC<{ stationIds: string[] }> = ({ stationIds }) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const doc = useAtomValue(docAtom);
  const commit = useSetAtom(commitAtom);
  const [name, setName] = useState("");
  const create = () => {
    const v = name.trim() || t("sim_v2.group.default_name", { n: doc.groups.length + 1 });
    if (doc.groups.some((g) => g.name === v)) {
      message.error(t("sim_v2.msg.group_name_taken", { name: v }));
      return;
    }
    commit((d) => createGroup(d, v, stationIds).doc);
    setName("");
    message.success(t("sim_v2.msg.group_created", { name: v, count: stationIds.length }));
  };
  return (
    <Input.Search
      className="full"
      size="small"
      value={name}
      placeholder={t("sim_v2.group.default_name", { n: doc.groups.length + 1 })}
      enterButton={t("sim_v2.group.create")}
      data-testid="simv2-new-group"
      onChange={(e) => setName(e.target.value)}
      onSearch={create}
    />
  );
};

const MultiProps: FC<{ nodes: SimNode[]; paths: SimPath[] }> = ({ nodes, paths }) => {
  const { t } = useTranslation();
  const commit = useSetAtom(commitAtom);
  const setSelection = useSetAtom(selectionAtom);
  const kindOptions = useKindOptions();
  const stations = nodes.filter((n) => n.kind === "station");
  const sameKind = nodes.length > 0 && nodes.every((n) => n.kind === nodes[0].kind);
  return (
    <Section title={t("sim_v2.props.multi_title")} testId="simv2-multi-props">
      <Rows>
        <div className="full">{t("sim_v2.props.selected_count", { nodes: nodes.length, paths: paths.length })}</div>
        {nodes.length > 0 && (
          <>
            <span>{t("sim_v2.props.kind")}</span>
            <Segmented<NodeKind>
              size="small"
              value={sameKind ? nodes[0].kind : undefined}
              options={kindOptions}
              onChange={(k) => commit((d) => setKind(d, nodes.map((n) => n.id), k))}
            />
          </>
        )}
        {stations.length > 0 && <StationFields nodes={stations} />}
        {paths.length > 0 && <PathFields paths={paths} />}
        {stations.length > 0 && (
          <>
            <div className="full" style={{ marginTop: 4 }}>
              {t("sim_v2.group.from_selection", { count: stations.length })}
            </div>
            <NewGroup stationIds={stations.map((n) => n.id)} />
          </>
        )}
        <Button
          className="full"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => {
            commit((d) => deleteItems(d, nodes.map((n) => n.id), paths.map((p) => p.id)));
            setSelection(EMPTY_SELECTION);
          }}
        >
          {t("sim_v2.props.delete_selected")}
        </Button>
      </Rows>
    </Section>
  );
};

const Overview: FC<{ doc: SimDoc }> = ({ doc }) => {
  const { t } = useTranslation();
  const colors = useCanvasColors();
  const count = (k: NodeKind) => doc.nodes.filter((n) => n.kind === k).length;
  const oneWay = doc.paths.filter((p) => p.direction === "one-way").length;
  return (
    <Section title={t("sim_v2.props.overview_title")} testId="simv2-overview">
      <Rows>
        <span>{t("sim_v2.props.nodes")}</span>
        <Value data-testid="simv2-overview-nodes">
          {t("sim_v2.props.nodes_detail", { total: doc.nodes.length, stations: count("station"), standby: count("standby") })}
        </Value>
        <span>{t("sim_v2.props.paths")}</span>
        <Value data-testid="simv2-overview-paths">{t("sim_v2.props.paths_detail", { total: doc.paths.length, oneWay })}</Value>
        <span>{t("sim_v2.props.total_length")}</span>
        <Value>{formatLength(totalPathLength(doc))}</Value>
        <span>{t("sim_v2.props.legend")}</span>
        <span style={{ lineHeight: 1.9 }}>
          {(["pick", "drop", "both"] as StationType[]).map((v) => (
            <span key={v} style={{ display: "block" }}>
              <Swatch $color={STATION_COLORS[v]} />
              {t(`sim_v2.station_type.${v}`)}
            </span>
          ))}
          <span style={{ display: "block" }}>
            <Swatch $color={colors.standby} $ring />
            {t("sim_v2.kind.standby")}
          </span>
          <span style={{ display: "block" }}>
            <Swatch $color={colors.point} $round />
            {t("sim_v2.kind.point")}
          </span>
        </span>
        <div className="full" style={{ color: "var(--c-text-muted)", fontSize: 12 }}>
          {t("sim_v2.props.navigation_tip")}
        </div>
      </Rows>
    </Section>
  );
};

const GroupsPanel: FC<{ doc: SimDoc }> = ({ doc }) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const commit = useSetAtom(commitAtom);
  const selection = useAtomValue(selectionAtom);
  const setSelection = useSetAtom(selectionAtom);
  const stationIds = useMemo(
    () => new Set(doc.nodes.filter((n) => n.kind === "station").map((n) => n.id)),
    [doc.nodes],
  );
  const selectedStations = selection.nodeIds.filter((id) => stationIds.has(id));
  return (
    <Section title={t("sim_v2.group.title")} extra={<span style={{ fontWeight: 400 }}>{doc.groups.length}</span>} testId="simv2-groups">
      {doc.groups.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("sim_v2.group.empty")} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {doc.groups.map((g) => (
            <div key={g.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 4, alignItems: "center" }}>
              <BlurText
                value={g.name}
                onCommit={(v) => {
                  if (doc.groups.some((x) => x.id !== g.id && x.name === v)) {
                    message.error(t("sim_v2.msg.group_name_taken", { name: v }));
                    return false;
                  }
                  commit((d) => updateGroup(d, g.id, { name: v }));
                }}
              />
              <span style={{ display: "flex", gap: 2 }}>
                <Tooltip title={t("sim_v2.group.select_members")}>
                  <Button size="small" type="text" icon={<AimOutlined />} onClick={() => setSelection({ nodeIds: g.nodeIds, pathIds: [] })} />
                </Tooltip>
                <Tooltip title={t("sim_v2.group.add_selected")}>
                  <Button
                    size="small"
                    type="text"
                    icon={<PlusOutlined />}
                    disabled={selectedStations.length === 0}
                    onClick={() => commit((d) => updateGroup(d, g.id, { nodeIds: [...new Set([...g.nodeIds, ...selectedStations])] }))}
                  />
                </Tooltip>
                <Tooltip title={t("sim_v2.group.remove_selected")}>
                  <Button
                    size="small"
                    type="text"
                    icon={<MinusOutlined />}
                    disabled={!selectedStations.some((id) => g.nodeIds.includes(id))}
                    onClick={() => commit((d) => updateGroup(d, g.id, { nodeIds: g.nodeIds.filter((id) => !selectedStations.includes(id)) }))}
                  />
                </Tooltip>
                <Tooltip title={t("sim_v2.group.delete")}>
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => commit((d) => deleteGroup(d, g.id))} />
                </Tooltip>
              </span>
              <span style={{ gridColumn: "1 / -1", color: "var(--c-text-muted)", fontSize: 12 }}>
                {t("sim_v2.group.member_count", { count: g.nodeIds.length })}
              </span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
};

const PropertiesPanel: FC = () => {
  const doc = useAtomValue(docAtom);
  const selection = useAtomValue(selectionAtom);
  const nodes = useMemo(() => {
    const m = nodeMap(doc);
    return selection.nodeIds.map((id) => m.get(id)).filter((n): n is SimNode => !!n);
  }, [doc, selection.nodeIds]);
  const paths = useMemo(() => {
    const m = new Map(doc.paths.map((p) => [p.id, p]));
    return selection.pathIds.map((id) => m.get(id)).filter((p): p is SimPath => !!p);
  }, [doc, selection.pathIds]);

  let body: ReactNode;
  if (nodes.length === 1 && paths.length === 0) body = <NodeProps doc={doc} node={nodes[0]} />;
  else if (paths.length === 1 && nodes.length === 0) body = <PathProps doc={doc} path={paths[0]} />;
  else if (nodes.length + paths.length > 1) body = <MultiProps nodes={nodes} paths={paths} />;
  else body = <Overview doc={doc} />;

  return (
    <Panel>
      {body}
      <GroupsPanel doc={doc} />
    </Panel>
  );
};

export default PropertiesPanel;
