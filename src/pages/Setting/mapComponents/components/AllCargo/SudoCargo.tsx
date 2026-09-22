import {
  batchCargoStyle,
  cargoStyle,
  shelfSelectedStyleLocationId,
} from "@/utils/gloable";
import useLoc, { LocWithoutArr } from "@/api/useLoc";
import { useAtomValue } from "jotai";
import { FC } from "react";
import styled from "styled-components";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import useMap from "@/api/useMap";
import useShelf from "@/api/useShelf";
import { Button } from "antd";
import { prefixLevelName } from "@/utils/globalFunction";

const WrapperForCargo = styled.div.attrs<{
  left: number;
  top: number;
}>(({ left, top }) => ({
  style: { left, top },
}))<{
  left: number;
  top: number;
}>`
  position: absolute;
  width: 5px;
  height: 5px;
`;

const Wrapper = styled.div<{
  translatex: number;
  translatey: number;
  rotate: number;
  scale: number;
  flex_direction: string;
}>`
  position: relative;
  z-index: 20;
  display: flex;
  flex-direction: ${({ flex_direction }) => flex_direction};
  gap: 0.35px;
  width: max-content;
  border-radius: 1px;
  transform: ${(props) =>
    `translate(${props.translatex}em, ${props.translatey}em) scale(${props.scale}) rotate(${props.rotate}deg)`};
`;

const Block = styled(Button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ff0000;
  background-color: unset;
  border-radius: 3px;
  min-width: 15px;
  max-height: 15px;
  max-width: 100%;
  padding: 0 2px;
  transition: all 0.2s ease;
  position: relative;
  flex-grow: 1;
  z-index: 1;
  cursor: "pointer";
  opacity: 1;
`;

const BlockSpan = styled.span`
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  user-select: none;
  text-align: center;
`;

type PreviewStyle = {
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
  flex_direction: string;
};

// 預覽用的紅框貨架，單一與批次編輯共用
const ShelfPreview: FC<{ locationId: string; style: PreviewStyle }> = ({
  locationId,
  style,
}) => {
  const { data } = useMap();
  const { data: shelf } = useShelf();
  if (!data || !shelf) return null;

  const eachShelf = shelf.find(
    (v) => v.peripheral_station.source.locationId === locationId,
  );
  const currentShelf = eachShelf?.ShelfConfig.length || 1;
  const loc = data.locations.find((v) => v.locationId === locationId);

  const [displayX, displayY] = rosCoord2DisplayCoord({
    x: loc?.x || 0,
    y: loc?.y || 0,
    mapHeight: data.mapHeight,
    mapOriginX: data.mapOriginX,
    mapOriginY: data.mapOriginY,
    mapResolution: data.mapResolution,
  });

  return (
    <WrapperForCargo left={displayX} top={displayY}>
      <Wrapper
        translatex={style.translateX}
        translatey={style.translateY}
        scale={style.scale}
        rotate={style.rotate}
        flex_direction={style.flex_direction}
      >
        {Array.from({ length: currentShelf }, (_, i) => (
          <Block key={i}>
            <BlockSpan>
              {prefixLevelName(eachShelf?.ShelfConfig[i]?.peripheral_name.name)}
            </BlockSpan>
          </Block>
        ))}
      </Wrapper>
    </WrapperForCargo>
  );
};

const SudoCargo: FC = () => {
  const cStyle = useAtomValue(cargoStyle);
  const shelfSelectedStyleId = useAtomValue(shelfSelectedStyleLocationId);
  if (!cStyle) return null;
  return <ShelfPreview locationId={shelfSelectedStyleId} style={cStyle} />;
};

// 批次微調：每個被選到的貨架各畫一個預覽
export const SudoBatchCargo: FC = () => {
  const batch = useAtomValue(batchCargoStyle);
  const { data: locs } = useLoc(undefined);
  if (!batch || !locs) return null;

  return (
    <>
      {(locs as LocWithoutArr[])
        .filter((l) => batch.locIds.includes(l.id))
        .map((l) => (
          <ShelfPreview
            key={l.id}
            locationId={l.locationId}
            style={{
              translateX: l.translateX + batch.dx,
              translateY: l.translateY + batch.dy,
              rotate: l.rotate + batch.dRotate,
              scale: Math.max(0.1, l.scale + batch.dScale),
              flex_direction: batch.flex_direction ?? l.flex_direction,
            }}
          />
        ))}
    </>
  );
};

export default SudoCargo;
