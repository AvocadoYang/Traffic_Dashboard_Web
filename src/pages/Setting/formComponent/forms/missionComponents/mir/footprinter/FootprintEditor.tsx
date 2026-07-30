/**
 * FootprintEditor.tsx
 *
 * A canvas-based editor for a robot "footprint" polygon.
 * - Renders the footprint (N points, closed polygon) on a metric grid.
 * - Each vertex is a draggable handle; dragging updates that vertex's [x, y] only.
 * - The selected vertex's X / Y are shown in a floating stepper panel and are
 *   also editable by typing / using the +/- buttons.
 * - Save reconstructs the original record shape, replacing footprint_points.
 *
 * Dependencies: react, styled-components, antd, @ant-design/icons
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import { Button, InputNumber, Tooltip, Dropdown, message } from "antd";
import type { MenuProps } from "antd";
import {
  QuestionCircleOutlined,
  MoreOutlined,
  DragOutlined,
  ColumnHeightOutlined,
  ApartmentOutlined,
  UndoOutlined,
  PlusOutlined,
  MinusOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type Point = [number, number];

export interface FootprintRecord {
  id?: string;
  name?: string;
  config_id: string;
  /** JSON-encoded array of [x, y] points, e.g. "[[0.5,-0.3],...]" */
  footprint_points: string;
  height: number;
}

interface FootprintEditorProps {
  /** Optional — falls back to DEFAULT_FOOTPRINT below when omitted. */
  data?: FootprintRecord;
  title?: string;
  onSave?: (next: FootprintRecord) => void;
  onBack?: () => void;
}

/** Default record used when no `data` prop is supplied. */
export const DEFAULT_FOOTPRINT: FootprintRecord = {
  name: "jimmy",
  config_id: "MIR250",
  footprint_points: "[[0.54,-0.38],[0.54,0.38],[-0.54,0.38],[-0.54,-0.38]]",
  height: 1.4,
};

/**
 * The *physical* outline of each vehicle model, keyed by config_id.
 * This is what gets drawn as the faded reference shape behind whatever
 * footprint polygon the user is currently editing — it does NOT change
 * as the user drags points, so it always shows "this is the real robot".
 *
 * Add one entry per model as new sizes come online, e.g.:
 *   MIR100_200: [[0.506,-0.32],[0.506,0.32],[-0.454,0.32],[-0.774,0.15],[-0.774,-0.15],[-0.454,-0.32]],
 *   MIR500_1000: [[0.65,-0.45],[0.65,0.45],[-0.65,0.45],[-0.65,-0.45]],
 */
export const VEHICLE_BODY_POINTS: Record<string, Point[]> = {
  MIR250: [
    [0.54, -0.38],
    [0.54, 0.38],
    [-0.54, 0.38],
    [-0.54, -0.38],
  ],
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const INITIAL_VIEW_W = 680;
const INITIAL_VIEW_H = 520;
const SCALE = 220; // px per meter (world scale stays constant so shapes never distort)
const GRID_STEP_M = 0.1; // minor grid spacing in meters
const DECIMALS = 3;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const round = (n: number, dp = DECIMALS) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

const parsePoints = (raw: string): Point[] => {
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr as Point[];
  } catch {
    /* fall through */
  }
  return [];
};

const stringifyPoints = (points: Point[]) =>
  JSON.stringify(points.map(([x, y]) => [round(x), round(y)]));

const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/* ------------------------------------------------------------------ */
/*  Styled components                                                  */
/* ------------------------------------------------------------------ */

const Shell = styled.div`
  background: #eef0f4;
  border-radius: 12px;
  padding: 16px 16px 20px;
  font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
`;

const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e2a4a;
`;

const TitleInput = styled.input`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e2a4a;
  font-family: inherit;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  padding: 2px 6px;
  min-width: 80px;
  width: auto;

  &:hover {
    background: #f2f4f7;
  }
  &:focus {
    outline: none;
    background: #fff;
    border-color: #99a9d8;
  }
  &::placeholder {
    color: #98a2b3;
    font-weight: 400;
  }
`;

const HelpIcon = styled(QuestionCircleOutlined)`
  color: #98a2b3;
  font-size: 14px;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Toolbar = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: #fff;
  border-radius: 10px;
  padding: 6px;
  margin-bottom: 12px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.06);
`;

const ToolButton = styled.button<{ $active?: boolean }>`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: ${(p) => (p.$active ? "#eef2ff" : "transparent")};
  color: ${(p) => (p.$active ? "#3958d8" : "#475467")};
  cursor: pointer;
  font-size: 15px;

  &:hover {
    background: #f2f4f7;
  }
`;

const CanvasCard = styled.div`
  position: relative;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.06);
  overflow: hidden;
  flex: 1 1 auto;
  width: 70vw;
  min-height: 50px;
`;

const StyledSvg = styled.svg`
  display: block;
  width: 100%;
  height: 100%;
  cursor: default;
  user-select: none;
`;

const VertexCircle = styled.rect<{ $selected: boolean }>`
  cursor: grab;
  fill: #fff;
  stroke: ${(p) => (p.$selected ? "#e8720c" : "#2f5fa8")};
  stroke-width: 2;

  &:active {
    cursor: grabbing;
  }
`;

const EdgeLabel = styled.text`
  font-size: 11px;
  fill: #667085;
  font-family: inherit;
  user-select: none;
  pointer-events: none;
`;

/* Floating X / Y panel */
const XYPanel = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 220px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(16, 24, 40, 0.12);
  padding: 16px;
  box-sizing: border-box;
`;

const FieldBlock = styled.div`
  & + & {
    margin-top: 14px;
  }
`;

const FieldLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #1e2a4a;
  margin-bottom: 6px;
`;

const StepperRow = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  overflow: hidden;
`;

const StepButton = styled.button`
  width: 34px;
  height: 34px;
  flex: none;
  border: none;
  background: #f2f4f7;
  color: #475467;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #e4e7ec;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const NumberField = styled(InputNumber)`
  flex: 1;
  border: none !important;
  box-shadow: none !important;
  text-align: center;

  .ant-input-number-input {
    text-align: center;
    font-size: 14px;
  }
`;

const EmptyHint = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 220px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(16, 24, 40, 0.1);
  padding: 14px 16px;
  font-size: 12.5px;
  color: #667085;
  line-height: 1.5;
`;

const LegendBadge = styled.div`
  position: absolute;
  left: 16px;
  bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  box-shadow: 0 4px 12px rgba(16, 24, 40, 0.1);
  font-size: 12px;
  color: #475467;

  svg {
    flex: none;
  }
`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const STEP = 0.001;

export const FootprintEditor: React.FC<FootprintEditorProps> = ({
  data = DEFAULT_FOOTPRINT,
  title,
  onSave,
  onBack,
}) => {
  const initialPoints = useMemo(
    () => parsePoints(data.footprint_points),
    [data.footprint_points],
  );
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [points, setPoints] = useState<Point[]>(initialPoints);
  const [name, setName] = useState(data.name ?? "");
  const [selected, setSelected] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasCardRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<number | null>(null);
  const [canvasSize, setCanvasSize] = useState({
    width: INITIAL_VIEW_W,
    height: INITIAL_VIEW_H,
  });

  /* Keep the SVG viewBox in lockstep with the actual pixel size of its
     container, so the drawing always fills 100% of the available width
     AND height (no letterboxing), while world-scale stays undistorted. */
  useEffect(() => {
    const el = canvasCardRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasSize({ width, height });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const center = useMemo(
    () => ({ x: canvasSize.width / 2, y: canvasSize.height / 2 }),
    [canvasSize],
  );

  /** meters -> svg pixel coords (y flipped: +y is up, like the source data) */
  const toSvgPoint = useCallback(
    (p: Point) => ({
      x: center.x + p[0] * SCALE,
      y: center.y - p[1] * SCALE,
    }),
    [center],
  );

  /** svg pixel coords -> meters */
  const toMetersPoint = useCallback(
    (x: number, y: number): Point => [
      round((x - center.x) / SCALE),
      round((center.y - y) / SCALE),
    ],
    [center],
  );

  useEffect(() => {
    setPoints(initialPoints);
  }, [initialPoints]);

  useEffect(() => {
    setName(data.name ?? "");
  }, [data.name]);

  /* ---- coordinate conversion using the SVG's own CTM (robust to any
     responsive scaling between the viewBox and rendered size) ---- */
  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  }, []);

  const updatePoint = useCallback((index: number, next: Point) => {
    setPoints((prev) => {
      const copy = prev.slice();
      copy[index] = next;
      return copy;
    });
  }, []);

  /* ---- dragging ---- */
  const handlePointerDown = useCallback(
    (index: number) => (e: React.PointerEvent) => {
      e.stopPropagation();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      draggingRef.current = index;
      setSelected(index);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const idx = draggingRef.current;
      if (idx === null) return;
      const { x, y } = clientToSvg(e.clientX, e.clientY);
      updatePoint(idx, toMetersPoint(x, y));
    },
    [clientToSvg, updatePoint, toMetersPoint],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    draggingRef.current = null;
  }, []);

  /* ---- reset / undo ---- */
  const handleReset = useCallback(() => {
    setPoints(initialPoints);
    setSelected(null);
  }, [initialPoints]);

  /* ---- save ---- */
  const handleSave = useCallback(() => {
    const next: FootprintRecord = {
      ...data,
      name: name.trim() || data.name,
      footprint_points: stringifyPoints(points),
    };
    onSave?.(next);
    message.success("已儲存 footprint");
  }, [data, points, name, onSave]);

  /* ---- grid lines (always covers the full visible box) ---- */
  const gridLines = useMemo(() => {
    const lines: {
      key: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      axis: boolean;
    }[] = [];
    const halfWM = center.x / SCALE + GRID_STEP_M;
    const halfHM = center.y / SCALE + GRID_STEP_M;
    const steps = Math.ceil(Math.max(halfWM, halfHM) / GRID_STEP_M);
    for (let i = -steps; i <= steps; i++) {
      const m = round(i * GRID_STEP_M, 2);
      const isAxis = m === 0;
      // vertical line at x = m
      const vx = center.x + m * SCALE;
      lines.push({
        key: `v${i}`,
        x1: vx,
        y1: 0,
        x2: vx,
        y2: canvasSize.height,
        axis: isAxis,
      });
      // horizontal line at y = m
      const hy = center.y - m * SCALE;
      lines.push({
        key: `h${i}`,
        x1: 0,
        y1: hy,
        x2: canvasSize.width,
        y2: hy,
        axis: isAxis,
      });
    }
    return lines;
  }, [center, canvasSize]);

  /* ---- polygon geometry ---- */
  const svgPoints = points.map(toSvgPoint);
  const polygonAttr = svgPoints.map((p) => `${p.x},${p.y}`).join(" ");

  /* ---- reference vehicle body (fixed physical size for this config_id,
     drawn behind the editable footprint; independent of dragged points) ---- */
  const vehicleBodyPoints = VEHICLE_BODY_POINTS[data.config_id];
  const vehicleBodyAttr = vehicleBodyPoints
    ? vehicleBodyPoints
        .map(toSvgPoint)
        .map((p) => `${p.x},${p.y}`)
        .join(" ")
    : null;

  const edgeLabels = points.map((p, i) => {
    const next = points[(i + 1) % points.length];
    const dist = distance(p, next);
    const a = toSvgPoint(p);
    const b = toSvgPoint(next);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    let angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    return {
      key: `edge-${i}`,
      x: mx,
      y: my,
      angle,
      text: dist.toFixed(2),
    };
  });

  const selectedPoint = selected !== null ? points[selected] : null;

  const deleteMutation = useMutation({
    mutationFn: () => {
      return client.post("api/setting/delete-footprint", { id: data.id });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["footprint"] });
      onBack?.();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => {
      return client.post("api/setting/copy-footprint", { id: data.id });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["footprint"] });
      messageApi.success("success");
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleDuplicate = () => {
    duplicateMutation.mutate();
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "duplicate",
      label: "複製",
      onClick: handleDuplicate,
    },
    {
      key: "export",
      label: "匯出 JSON",
      onClick: () => {
        console.log("Export JSON");
      },
    },
    {
      key: "delete",
      label: "刪除",
      danger: true,
      onClick: handleDelete,
    },
  ];

  return (
    <Shell>
      {contextHolder}
      <HeaderRow>
        <TitleGroup>
          {title ? (
            <Title>{title}</Title>
          ) : (
            <TitleInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={data.config_id}
              aria-label="Footprint name"
              size={Math.max(name.length, data.config_id.length, 6)}
            />
          )}
          <Tooltip title="拖曳頂點可調整外框形狀">
            <HelpIcon />
          </Tooltip>
        </TitleGroup>
        <HeaderActions>
          <Button onClick={onBack}>Go back</Button>
          <Button type="primary" onClick={handleSave}>
            Save
          </Button>
          <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        </HeaderActions>
      </HeaderRow>

      <Toolbar>
        <Tooltip title="移動畫布">
          <ToolButton>
            <DragOutlined />
          </ToolButton>
        </Tooltip>
        <Tooltip title="對齊">
          <ToolButton>
            <ColumnHeightOutlined />
          </ToolButton>
        </Tooltip>
        <Tooltip title="頂點編輯">
          <ToolButton $active>
            <ApartmentOutlined />
          </ToolButton>
        </Tooltip>
        <Tooltip title="重設外框">
          <ToolButton onClick={handleReset}>
            <UndoOutlined />
          </ToolButton>
        </Tooltip>
      </Toolbar>

      <CanvasCard ref={canvasCardRef}>
        <StyledSvg
          ref={svgRef}
          viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onClick={() => setSelected(null)}
        >
          {/* grid */}
          {gridLines.map((l) => (
            <line
              key={l.key}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke={l.axis ? "#c7ccd6" : "#eef0f4"}
              strokeWidth={l.axis ? 1.2 : 1}
            />
          ))}

          {/* reference: the vehicle's real physical outline for this
              config_id, faded and dashed, drawn behind the editable
              footprint so the user can see how far the custom shape
              deviates from the actual robot body */}
          {vehicleBodyAttr && (
            <polygon
              points={vehicleBodyAttr}
              fill="#94a3b8"
              fillOpacity={0.15}
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="6 4"
              pointerEvents="none"
            />
          )}

          {/* footprint fill */}
          <polygon
            points={polygonAttr}
            fill="rgba(69, 118, 191, 0.28)"
            stroke="#2f5fa8"
            strokeWidth={3}
            strokeLinejoin="round"
          />

          {/* edge distance labels */}
          {edgeLabels.map((l) => (
            <g
              key={l.key}
              transform={`translate(${l.x}, ${l.y}) rotate(${l.angle})`}
            >
              <EdgeLabel textAnchor="middle" dy={-4}>
                {l.text}
              </EdgeLabel>
            </g>
          ))}

          {/* vertex handles */}
          {svgPoints.map((p, i) => (
            <VertexCircle
              key={i}
              x={p.x - 6}
              y={p.y - 6}
              width={12}
              height={12}
              rx={2}
              $selected={selected === i}
              onPointerDown={handlePointerDown(i)}
            />
          ))}
        </StyledSvg>

        {selectedPoint ? (
          <XYPanel onClick={(e) => e.stopPropagation()}>
            <FieldBlock>
              <FieldLabel>X</FieldLabel>
              <StepperRow>
                <StepButton
                  onClick={() =>
                    updatePoint(selected as number, [
                      round(selectedPoint[0] - STEP),
                      selectedPoint[1],
                    ])
                  }
                >
                  <MinusOutlined />
                </StepButton>
                <NumberField
                  value={selectedPoint[0]}
                  step={STEP}
                  controls={false}
                  onChange={(v) =>
                    updatePoint(selected as number, [
                      typeof v === "number" ? v : selectedPoint[0],
                      selectedPoint[1],
                    ])
                  }
                />
                <StepButton
                  onClick={() =>
                    updatePoint(selected as number, [
                      round(selectedPoint[0] + STEP),
                      selectedPoint[1],
                    ])
                  }
                >
                  <PlusOutlined />
                </StepButton>
              </StepperRow>
            </FieldBlock>

            <FieldBlock>
              <FieldLabel>Y</FieldLabel>
              <StepperRow>
                <StepButton
                  onClick={() =>
                    updatePoint(selected as number, [
                      selectedPoint[0],
                      round(selectedPoint[1] - STEP),
                    ])
                  }
                >
                  <MinusOutlined />
                </StepButton>
                <NumberField
                  value={selectedPoint[1]}
                  step={STEP}
                  controls={false}
                  onChange={(v) =>
                    updatePoint(selected as number, [
                      selectedPoint[0],
                      typeof v === "number" ? v : selectedPoint[1],
                    ])
                  }
                />
                <StepButton
                  onClick={() =>
                    updatePoint(selected as number, [
                      selectedPoint[0],
                      round(selectedPoint[1] + STEP),
                    ])
                  }
                >
                  <PlusOutlined />
                </StepButton>
              </StepperRow>
            </FieldBlock>
          </XYPanel>
        ) : (
          <EmptyHint>點選或拖曳任一頂點以編輯座標</EmptyHint>
        )}

        {vehicleBodyAttr && (
          <LegendBadge>
            <svg width="20" height="14" viewBox="0 0 20 14">
              <rect
                x="1"
                y="1"
                width="18"
                height="12"
                rx="2"
                fill="#94a3b8"
                fillOpacity={0.15}
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
            </svg>
            {data.config_id} 車身尺寸（參考，不可編輯）
          </LegendBadge>
        )}
      </CanvasCard>
    </Shell>
  );
};

export default FootprintEditor;