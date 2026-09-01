import { RefObject, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Input, InputNumber, message } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import styled from "styled-components";
import client from "@/api/axiosClient";
import useMap from "@/api/useMap";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { rosCoord2DisplayCoord, rvizCoord } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

type MirAreaType =
  | "MIR_ROBOT_POSITION"
  | "MIR_SHELF_POSITION"
  | "MIR_CHARGING_STATION"
  | "MIR_VL_MARKER";

const TYPE_OPTIONS: {
  value: MirAreaType;
  label: string;
}[] = [
  { value: "MIR_ROBOT_POSITION", label: "Robot position" },
  { value: "MIR_SHELF_POSITION", label: "Shelf position" },
  { value: "MIR_CHARGING_STATION", label: "Charging station" },
  { value: "MIR_VL_MARKER", label: "VL marker" },
];

type Pending = {
  areaType: MirAreaType;
  x: number;
  y: number;
  orientation: number;
  name: string;
};

const Toolbar = styled.div`
  position: fixed;
  top: 16px;
  left: 220px;
  z-index: 30;
  display: flex;
  gap: 8px;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const Panel = styled.div`
  position: fixed;
  top: 16px;
  left: 220px;
  z-index: 30;
  width: 260px;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PanelTitle = styled.div`
  font-weight: 600;
  font-size: 13px;
`;

const FieldLabel = styled.div`
  font-size: 12px;
  color: #595959;
  margin-bottom: 4px;
`;

const MarkerIcon = styled.img<{
  $left: number;
  $top: number;
  $angleDeg: number;
}>`
  position: absolute;
  left: ${(p) => p.$left}px;
  top: ${(p) => p.$top}px;
  width: 26px;
  height: 26px;
  object-fit: contain;
  z-index: 40;
  cursor: move;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.4));
  transform-origin: center;
  transform: translate(-50%, -50%) rotate(${(p) => -p.$angleDeg}deg);
`;

const ButtonIcon = styled.img`
  width: 16px;
  height: 16px;
  object-fit: contain;
  margin-right: 6px;
  vertical-align: -3px;
`;

const RotateHandle = styled.div<{ $left: number; $top: number }>`
  position: absolute;
  left: ${(p) => p.$left}px;
  top: ${(p) => p.$top}px;
  width: 10px;
  height: 10px;
  margin-left: -5px;
  margin-top: -5px;
  background: #fa8c16;
  border: 1px solid #ffffff;
  border-radius: 50%;
  z-index: 40;
  cursor: grab;
`;

const RotateLine = styled.div<{
  $left: number;
  $top: number;
  $length: number;
  $angleDeg: number;
}>`
  position: absolute;
  left: ${(p) => p.$left}px;
  top: ${(p) => p.$top}px;
  width: ${(p) => p.$length}px;
  height: 1px;
  background: #fa8c16;
  transform-origin: 0 0;
  transform: rotate(${(p) => -p.$angleDeg}deg);
  z-index: 39;
  pointer-events: none;
`;

const ROTATE_HANDLE_RADIUS = 36;

const MirStyleLocationPlacer: React.FC<{
  mapRef: RefObject<HTMLDivElement>;
  mapImageRef: RefObject<HTMLImageElement>;
  scale: number;
}> = ({ mapRef, mapImageRef, scale }) => {
  const { data: mapData } = useMap();
  const currentMapId = useAtomValue(currentMapIdAtom);
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [pending, setPending] = useState<Pending | null>(null);
  const draggingRef = useRef<"move" | "rotate" | null>(null);

  const saveMutation = useMutation({
    mutationFn: (payload: {
      locationId: string;
      x: number;
      y: number;
      areaType: MirAreaType;
      canRotate: boolean;
      rotation: number;
      map_id: string;
    }) => client.post("api/setting/save-edit-loc", payload),
    onSuccess: () => {
      void messageApi.success("建立成功");
      queryClient.refetchQueries({ queryKey: ["map"] });
      queryClient.refetchQueries({ queryKey: ["loc-only"] });
      setPending(null);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  // 「已選類型、等待點地圖放置」的狀態不需要觸發 re-render,用 ref 存就好。
  const pendingTypeRef = useRef<MirAreaType | null>(null);
  const [awaitingPlacement, setAwaitingPlacement] =
    useState<MirAreaType | null>(null);

  const pickType = (type: MirAreaType) => {
    pendingTypeRef.current = type;
    setAwaitingPlacement(type);
  };

  useEffect(() => {
    if (pending) setAwaitingPlacement(null);
  }, [pending]);

  // 選好類型後,監聽地圖點擊,點下去的位置就是新地點的初始位置。
  useEffect(() => {
    const mapEl = mapRef.current;
    if (!mapEl || !mapData) return;

    const handleClick = (e: MouseEvent) => {
      if (!pendingTypeRef.current) return;
      if (!mapImageRef.current) return;
      const rect = mapImageRef.current.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        return;
      }
      const [rx, ry] = rvizCoord({
        displayX: e.clientX - rect.left,
        displayY: e.clientY - rect.top,
        mapResolution: mapData.mapResolution,
        mapOriginX: mapData.mapOriginX,
        mapOriginY: mapData.mapOriginY,
        mapHeight: mapData.mapHeight,
        scaleSize: scale,
      });
      const type = pendingTypeRef.current;
      setPending({
        areaType: type,
        x: rx,
        y: ry,
        orientation: 0,
        name: TYPE_OPTIONS.find((t) => t.value === type)?.label ?? "",
      });
      pendingTypeRef.current = null;
    };

    mapEl.addEventListener("click", handleClick);
    return () => mapEl.removeEventListener("click", handleClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapData, scale]);

  const displayPos = pending
    ? rosCoord2DisplayCoord({
        x: pending.x,
        y: pending.y,
        mapHeight: mapData?.mapHeight ?? 0,
        mapOriginX: mapData?.mapOriginX ?? 0,
        mapOriginY: mapData?.mapOriginY ?? 0,
        mapResolution: mapData?.mapResolution ?? 1,
      })
    : null;

  const handleMarkerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = "move";
  };

  const handleRotateMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = "rotate";
  };

  useEffect(() => {
    if (!pending || !mapData) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !mapImageRef.current) return;
      const rect = mapImageRef.current.getBoundingClientRect();

      if (draggingRef.current === "move") {
        const [rx, ry] = rvizCoord({
          displayX: e.clientX - rect.left,
          displayY: e.clientY - rect.top,
          mapResolution: mapData.mapResolution,
          mapOriginX: mapData.mapOriginX,
          mapOriginY: mapData.mapOriginY,
          mapHeight: mapData.mapHeight,
          scaleSize: scale,
        });
        setPending((prev) => (prev ? { ...prev, x: rx, y: ry } : prev));
      } else if (draggingRef.current === "rotate") {
        const [markerLeft, markerTop] = rosCoord2DisplayCoord({
          x: pending.x,
          y: pending.y,
          mapHeight: mapData.mapHeight,
          mapOriginX: mapData.mapOriginX,
          mapOriginY: mapData.mapOriginY,
          mapResolution: mapData.mapResolution,
        });
        const markerScreenX = rect.left + markerLeft * scale;
        const markerScreenY = rect.top + markerTop * scale;
        const dx = e.clientX - markerScreenX;
        const dy = e.clientY - markerScreenY;
        // 螢幕座標 Y 軸往下增加,跟世界座標相反,取負號還原成標準數學角度
        const angleDeg = (Math.atan2(-dy, dx) * 180) / Math.PI;
        setPending((prev) =>
          prev ? { ...prev, orientation: Number(angleDeg.toFixed(1)) } : prev,
        );
      }
    };

    const handleMouseUp = () => {
      draggingRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, mapData, scale]);

  const cancel = () => {
    setPending(null);
    pendingTypeRef.current = null;
    setAwaitingPlacement(null);
  };

  const create = () => {
    if (!pending) return;
    if (!pending.name.trim()) {
      void messageApi.warning("請輸入名稱");
      return;
    }
    if (!currentMapId) {
      void messageApi.error("尚未選擇地圖");
      return;
    }
    saveMutation.mutate({
      locationId: pending.name.trim(),
      x: pending.x,
      y: pending.y,
      areaType: pending.areaType,
      canRotate: true,
      rotation: pending.orientation,
      map_id: currentMapId,
    });
  };

  const activeType = TYPE_OPTIONS.find((t) => t.value === pending?.areaType);

  // Toolbar/Panel 是懸浮 UI,要用 portal 掛到 document.body——這個元件本身
  // 是渲染在 `.map-view` 裡面(為了跟其他地點標記共用同一個座標系),但
  // `.map-view` 有 `transform: scale(...)`,CSS 規範規定有 transform 的祖先
  // 會變成 position:fixed 子孫的新 containing block,直接用 fixed 定位會被
  // `.map-view` 的框框限制住、不是真正相對整個視窗固定。Marker/旋轉控制點
  // 則相反——它們就是要跟著 `.map-view` 的座標系縮放,所以維持原地渲染、
  // 座標不用額外乘上 scale(CSS transform 本身已經在視覺上縮放過了)。
  const floatingUi = (
    <>
      {!pending ? (
        <Toolbar>
          {TYPE_OPTIONS.map((t) => (
            <Button
              key={t.value}
              type={awaitingPlacement === t.value ? "primary" : "default"}
              onClick={() => pickType(t.value)}
            >
              <ButtonIcon src={`/${t.value}.png`} />
              {t.label}
            </Button>
          ))}
        </Toolbar>
      ) : null}

      {pending && activeType ? (
        <Panel>
          <PanelTitle>{activeType.label}</PanelTitle>
          <div>
            <FieldLabel>Name</FieldLabel>
            <Input
              value={pending.name}
              onChange={(e) =>
                setPending((prev) =>
                  prev ? { ...prev, name: e.target.value } : prev,
                )
              }
            />
          </div>
          <div>
            <FieldLabel>X-coordinate in meters</FieldLabel>
            <InputNumber
              style={{ width: "100%" }}
              value={pending.x}
              onChange={(v) =>
                setPending((prev) =>
                  prev ? { ...prev, x: Number(v ?? 0) } : prev,
                )
              }
            />
          </div>
          <div>
            <FieldLabel>Y-coordinate in meters</FieldLabel>
            <InputNumber
              style={{ width: "100%" }}
              value={pending.y}
              onChange={(v) =>
                setPending((prev) =>
                  prev ? { ...prev, y: Number(v ?? 0) } : prev,
                )
              }
            />
          </div>
          <div>
            <FieldLabel>Orientation from X-axis (deg)</FieldLabel>
            <InputNumber
              style={{ width: "100%" }}
              value={pending.orientation}
              onChange={(v) =>
                setPending((prev) =>
                  prev ? { ...prev, orientation: Number(v ?? 0) } : prev,
                )
              }
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Button onClick={cancel}>Cancel</Button>
            <Button
              type="primary"
              loading={saveMutation.isPending}
              onClick={create}
            >
              Create
            </Button>
          </div>
        </Panel>
      ) : null}
    </>
  );

  return (
    <>
      {contextHolder}
      {createPortal(floatingUi, document.body)}

      {pending && displayPos && activeType ? (
        <>
          <MarkerIcon
            src={`/${activeType.value}.png`}
            $left={displayPos[0]}
            $top={displayPos[1]}
            $angleDeg={pending.orientation}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onMouseDown={handleMarkerMouseDown}
          />
          <RotateLine
            $left={displayPos[0]}
            $top={displayPos[1]}
            $length={ROTATE_HANDLE_RADIUS}
            $angleDeg={pending.orientation}
          />
          <RotateHandle
            $left={
              displayPos[0] +
              ROTATE_HANDLE_RADIUS *
                Math.cos((pending.orientation * Math.PI) / 180)
            }
            $top={
              displayPos[1] -
              ROTATE_HANDLE_RADIUS *
                Math.sin((pending.orientation * Math.PI) / 180)
            }
            onMouseDown={handleRotateMouseDown}
          />
        </>
      ) : null}
    </>
  );
};

export default MirStyleLocationPlacer;
