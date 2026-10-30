import { FC, memo, useEffect, useState } from "react";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { Popover } from "antd";
import { EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import useMap from "@/api/useMap";
import useToggleZoneEnabled from "@/api/useToggleZoneEnabled";
import { hoverRoad } from "@/utils/gloable";
import {
  isShowLocationTooltip,
  isShowRoad,
  isShowRoadTooltip,
  showAllZonesSwitch,
} from "@/utils/siderGloble";
import ToolTip from "@/pages/Setting/components/ToolTip";
import { LocationHoverCluster } from "@/pages/Setting/mapComponents/components";
import RoadHoverCluster from "@/pages/Setting/mapComponents/components/AllRoads/RoadHoverCluster";
import { HoverLabel, TOOLTIP_Z_INDEX } from "@/pages/Setting/mapComponents/components/HoverLabel";
import ZoneHoverCard, { toOpaque } from "@/pages/Setting/mapComponents/components/AllZones/components/ZoneHoverCard";
import { c, font } from "@/pages/SettingV2/ui/tokens";
import { useLinkedZones } from "@/pages/SettingV2/ui/zoneLinks";
import type { MapScene, SceneZone } from "./scene";

/**
 * 疊在畫布最上面的 DOM (座標是底圖像素, 跟著畫布平移縮放):
 * 數量少、要點得到或要用 antd 元件的東西放這裡 ——
 * 區域名稱 (眼睛圖示、資訊卡)、點位 / 路線的提示標籤、暫停提示。
 * 提示標籤沿用舊地圖的元件, 由畫布 hit-test 寫進同一組 atom 驅動。
 */

/** 按了眼睛圖示藏起來的區域 (舊地圖是每個區域自己的 state, 換頁就重置; 這裡也只在記憶體裡) */
export const hiddenZoneIdsAtom = atom<Set<string>>(new Set<string>());

/** 打開資訊卡的區域 (實線框) 跟同地圖上跟它綁在一起的電梯 / 拼接區 (虛線框) */
export const linkedZoneHighlightAtom = atom<{ sourceId: string; linkedIds: Set<string> } | null>(null);

/** 游標停在暫停中的車的停止標誌上: 顯示「暫停」 */
export const pauseHintAtom = atom<{ x: number; y: number } | null>(null);

const At = styled.div.attrs<{ $x: number; $y: number }>(({ $x, $y }) => ({
  style: { left: $x, top: $y },
}))<{ $x: number; $y: number }>`
  position: absolute;
  pointer-events: auto;
  /* 深色主題配原圖 (白底) 時, 主題的淺色字在白底上看不到 */
  [data-theme-mode="dark"][data-map-canvas="light"] & {
    color: #1c1c1c;
  }
`;

const NameText = styled.p<{ $disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  cursor: pointer;
  white-space: nowrap;
  ${({ $disabled }) => ($disabled ? "opacity: 0.7;" : "")}
`;

const DisabledBadge = styled.span`
  padding: 0 5px;
  font-family: ${font.mono};
  font-size: 10px;
  font-weight: 700;
  line-height: 15px;
  letter-spacing: 0.5px;
  color: #ffffff;
  background: rgba(110, 110, 110, 0.95);
`;

const Outline = styled.div.attrs<{ $x: number; $y: number; $w: number; $h: number }>(
  ({ $x, $y, $w, $h }) => ({ style: { left: $x, top: $y, width: $w, height: $h } }),
)<{ $x: number; $y: number; $w: number; $h: number; $color: string; $dashed: boolean }>`
  position: absolute;
  box-sizing: border-box;
  pointer-events: none;
  border: 3px ${({ $dashed }) => ($dashed ? "dashed" : "solid")} ${({ $color }) => $color};
  background: color-mix(in srgb, ${({ $color }) => $color} 15%, transparent);
`;

const Centered = styled.div.attrs<{ $x: number; $y: number }>(({ $x, $y }) => ({
  style: { left: $x, top: $y },
}))<{ $x: number; $y: number }>`
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: ${TOOLTIP_Z_INDEX};
  pointer-events: none;
`;

/** 區域名稱: 位置、樣式同舊地圖的 Zone.tsx (眼睛在框的左上角上方, 名字在它右邊) */
const InlineRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
`;

/**
 * 區域名稱 + 眼睛圖示 (藏起來) + 資訊卡 (停用 / 啟用)。inline: 3D 檢視用, 不自己定位 (外面包 drei Html)
 */
export const ZoneLabel: FC<{
  zone: SceneZone;
  info: Parameters<typeof ZoneHoverCard>[0]["info"];
  inline?: boolean;
  onEdit?: (zoneId: string) => void;
}> = ({
  zone,
  info,
  inline = false,
  onEdit,
}) => {
  const { t } = useTranslation();
  const [hidden, setHidden] = useAtom(hiddenZoneIdsAtom);
  const [cardOpen, setCardOpen] = useState(false);
  // 放在這層而不是卡片裡: 對話框打開時游標離開卡片, 卡片關掉也不影響對話框
  const { setEnabled, pendingId, contextHolder } = useToggleZoneEnabled();
  const linked = useLinkedZones(info);
  const setHighlight = useSetAtom(linkedZoneHighlightAtom);
  const linkedHere = [...linked.elevator, ...linked.splice]
    .filter(({ map }) => map.mapId === linked.ownMapId)
    .map(({ zone }) => zone.id)
    .join(",");
  useEffect(() => {
    if (!cardOpen || !linkedHere) return;
    setHighlight({ sourceId: zone.id, linkedIds: new Set(linkedHere.split(",")) });
    // 只清自己設的, 游標直接移到別的區域時不要把人家的框清掉
    return () => setHighlight((prev) => (prev?.sourceId === zone.id ? null : prev));
  }, [cardOpen, linkedHere, zone.id, setHighlight]);
  const isHidden = hidden.has(zone.id);
  const toggleHidden = () =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(zone.id)) next.delete(zone.id);
      else next.add(zone.id);
      return next;
    });

  const eye = isHidden ? (
    <EyeInvisibleOutlined style={{ cursor: "pointer" }} onClick={toggleHidden} />
  ) : (
    <EyeOutlined style={{ cursor: "pointer" }} onClick={toggleHidden} />
  );
  const name = (
    <NameText $disabled={zone.disabled}>
      {zone.disabled && <DisabledBadge>{t("zone_enable.disabled")}</DisabledBadge>}
      {zone.name}
    </NameText>
  );
  const card = (
    <ZoneHoverCard
      info={info}
      open={cardOpen}
      toggling={pendingId === info.id}
      onToggleEnabled={(enabled) => {
        setCardOpen(false);
        setEnabled(info, enabled);
      }}
      onEdit={
        onEdit
          ? () => {
              setCardOpen(false);
              onEdit(info.id);
            }
          : undefined
      }
    />
  );
  const cardStyles = {
    container: { padding: 0, borderRadius: 2, border: `1px solid ${c.border}`, background: c.bg },
  };

  if (inline) {
    return (
      <InlineRow>
        {contextHolder}
        {eye}
        <Popover open={cardOpen} onOpenChange={setCardOpen} placement="rightTop" arrow={false} content={card} styles={cardStyles}>
          <span>{name}</span>
        </Popover>
      </InlineRow>
    );
  }

  return (
    <>
      {contextHolder}
      <At $x={zone.x} $y={zone.y - 18}>
        {eye}
      </At>
      <Popover
        open={cardOpen}
        onOpenChange={setCardOpen}
        placement="rightTop"
        arrow={false}
        content={card}
        styles={cardStyles}
      >
        <At $x={zone.x + 22} $y={zone.y - 20}>
          {name}
        </At>
      </Popover>
    </>
  );
};

/** 資訊卡打開時, 在地圖上框出它跟同地圖的關聯區域 */
const LinkedZoneOutlines: FC<{ scene: MapScene }> = ({ scene }) => {
  const highlight = useAtomValue(linkedZoneHighlightAtom);
  if (!highlight) return null;
  return (
    <>
      {scene.zones
        .filter((z) => z.id === highlight.sourceId || highlight.linkedIds.has(z.id))
        .map((z) => (
          <Outline
            key={z.id}
            $x={z.x}
            $y={z.y}
            $w={z.w}
            $h={z.h}
            $color={toOpaque(z.color)}
            $dashed={z.id !== highlight.sourceId}
          />
        ))}
    </>
  );
};

const ZoneLabels: FC<{ scene: MapScene; onZoneEdit?: (zoneId: string) => void }> = ({ scene, onZoneEdit }) => {
  const { data } = useMap();
  if (!data) return null;
  const infoById = new Map(data.zones.map((z) => [z.id, z]));
  return (
    <>
      <LinkedZoneOutlines scene={scene} />
      {scene.zones.map((zone) => {
        const info = infoById.get(zone.id);
        return info ? <ZoneLabel key={zone.id} zone={zone} info={info} onEdit={onZoneEdit} /> : null;
      })}
    </>
  );
};

/** 游標指著某條路線時, 在路線中間標出編號 (同舊地圖 Road.tsx) */
const RoadLabel: FC<{ scene: MapScene }> = ({ scene }) => {
  const roadId = useAtomValue(hoverRoad);
  const road = roadId ? scene.roads.find((r) => r.id === roadId) : null;
  if (!road) return null;
  return (
    <Centered $x={(road.x1 + road.x2) / 2} $y={(road.y1 + road.y2) / 2}>
      <HoverLabel $accent="red">{road.id}</HoverLabel>
    </Centered>
  );
};

const PauseHint: FC = () => {
  const { t } = useTranslation();
  const at = useAtomValue(pauseHintAtom);
  if (!at) return null;
  return (
    <Centered $x={at.x} $y={at.y - 28}>
      <HoverLabel $accent="red">{t("mode.isPause")}</HoverLabel>
    </Centered>
  );
};

const MapOverlay: FC<{
  scene: MapScene;
  /** 有給的話, 區域資訊卡會多一個編輯鈕 */
  onZoneEdit?: (zoneId: string) => void;
}> = ({ scene, onZoneEdit }) => {
  const showZones = useAtomValue(showAllZonesSwitch);
  const showLocationTooltip = useAtomValue(isShowLocationTooltip);
  const showRoad = useAtomValue(isShowRoad);
  const showRoadTooltip = useAtomValue(isShowRoadTooltip);
  return (
    <>
      {showZones ? <ZoneLabels scene={scene} onZoneEdit={onZoneEdit} /> : null}
      {showLocationTooltip ? (
        <>
          <ToolTip />
          <LocationHoverCluster />
        </>
      ) : null}
      {showRoad && showRoadTooltip ? (
        <>
          <RoadHoverCluster />
          <RoadLabel scene={scene} />
        </>
      ) : null}
      <PauseHint />
    </>
  );
};

export default memo(MapOverlay);
