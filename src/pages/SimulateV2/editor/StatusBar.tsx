import { FC } from "react";
import { Button, Checkbox, Dropdown, Select, Switch, Tooltip } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useCadGeometry } from "../io/dxf/cadLoader";
import { Layers, commitAtom, cursorAtom, docAtom, layersAtom, projectAtom, viewAtom } from "../state/editorAtoms";
import CadLayerList from "./CadLayerList";

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 16px;
  min-height: 36px;
  padding: 4px 12px;
  background: var(--c-bg);
  border-top: 1px solid var(--c-border);
  color: var(--c-text-secondary);
  font-size: 12px;
`;

const Coord = styled.span`
  min-width: 170px;
  font-variant-numeric: tabular-nums;
`;

const ScaleBar = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;

  i {
    display: inline-block;
    height: 6px;
    border: 1.5px solid var(--c-text-secondary);
    border-top: none;
  }
`;

const Field = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const GRID_SIZES = [0.1, 0.25, 0.5, 1, 2, 5];

/** 比例尺: 挑 1 / 2 / 5 x 10^n 公尺裡, 畫出來 60~150 像素的那一個 */
function scaleBarLength(pxPerM: number) {
  const target = 100 / pxPerM;
  const pow = 10 ** Math.floor(Math.log10(target));
  const options = [1, 2, 5, 10].map((k) => k * pow);
  return options.reduce((best, v) => (Math.abs(v * pxPerM - 100) < Math.abs(best * pxPerM - 100) ? v : best));
}

const LAYER_KEYS: (keyof Layers)[] = ["background", "cad", "grid", "paths", "nodes", "labels"];

const StatusBar: FC = () => {
  const { t } = useTranslation();
  const cursor = useAtomValue(cursorAtom);
  const view = useAtomValue(viewAtom);
  const doc = useAtomValue(docAtom);
  const commit = useSetAtom(commitAtom);
  const [layers, setLayers] = useAtom(layersAtom);
  const project = useAtomValue(projectAtom);
  const cadGeom = useCadGeometry(project?.id, doc.cad).geometry;
  const bar = scaleBarLength(view.scale);

  return (
    <Bar>
      <Coord data-testid="simv2-cursor">
        {cursor ? `X ${cursor.x.toFixed(2)} m   Y ${cursor.y.toFixed(2)} m` : t("sim_v2.status.no_cursor")}
      </Coord>
      <ScaleBar>
        <i style={{ width: Math.round(bar * view.scale) }} />
        {bar >= 1 ? `${bar} m` : `${Math.round(bar * 100)} cm`}
      </ScaleBar>
      <Field>
        {t("sim_v2.status.grid")}
        <Select
          size="small"
          value={doc.editor.gridSize}
          style={{ width: 90 }}
          options={GRID_SIZES.map((v) => ({ value: v, label: v >= 1 ? `${v} m` : `${v * 100} cm` }))}
          onChange={(v) => commit((d) => ({ ...d, editor: { ...d.editor, gridSize: v } }))}
        />
      </Field>
      <Field>
        <Switch
          size="small"
          checked={doc.editor.snap}
          onChange={(v) => commit((d) => ({ ...d, editor: { ...d.editor, snap: v } }))}
        />
        {t("sim_v2.status.snap")}
      </Field>
      {doc.cad && (
        <Field>
          <Switch
            size="small"
            checked={doc.editor.snapCad}
            onChange={(v) => commit((d) => ({ ...d, editor: { ...d.editor, snapCad: v } }))}
            data-testid="simv2-snap-cad"
          />
          {t("sim_v2.status.snap_cad")}
        </Field>
      )}
      <Dropdown
        trigger={["click"]}
        popupRender={() => (
          <div style={{ padding: 8, background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 4, width: doc.cad ? 300 : undefined }}>
            {LAYER_KEYS.filter((k) => k !== "cad" || doc.cad).map((k) => (
              <Checkbox key={k} checked={layers[k]} onChange={(e) => setLayers({ ...layers, [k]: e.target.checked })}>
                {t(`sim_v2.layer.${k}`)}
              </Checkbox>
            ))}
            {doc.cad && cadGeom && layers.cad && (
              <div style={{ marginTop: 6 }}>
                <CadLayerList
                  layers={cadGeom.layers}
                  hidden={doc.cad.hiddenLayers}
                  onChange={(hiddenLayers) => commit((d) => (d.cad ? { ...d, cad: { ...d.cad, hiddenLayers } } : d))}
                  testId="simv2-status-cad-layers"
                />
              </div>
            )}
          </div>
        )}
      >
        <Tooltip title={t("sim_v2.status.layers")}>
          <Button size="small" icon={<EyeOutlined />}>
            {t("sim_v2.status.layers")}
          </Button>
        </Tooltip>
      </Dropdown>
      <span style={{ marginLeft: "auto" }}>
        {t("sim_v2.status.counts", { nodes: doc.nodes.length, paths: doc.paths.length })}
      </span>
    </Bar>
  );
};

export default StatusBar;
