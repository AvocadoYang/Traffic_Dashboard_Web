import { cargoStyle, shelfSelectedStyleLocationId } from "@/utils/gloable";
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

const SudoCargo: FC = () => {
  const cStyle = useAtomValue(cargoStyle);
  const { data } = useMap();
  const shelfSelectedStyleId = useAtomValue(shelfSelectedStyleLocationId);
  const { data: shelf } = useShelf();
  if (!cStyle || !data || !shelf) return;

  const currentShelf =
    shelf?.find((v) => v.Loc.locationId === shelfSelectedStyleId)?.ShelfConfig
      .length || 1;

  const [displayX, displayY] = rosCoord2DisplayCoord({
    x:
      data?.locations.find((v) => v.locationId === shelfSelectedStyleId)?.x ||
      0,
    y:
      data?.locations.find((v) => v.locationId === shelfSelectedStyleId)?.y ||
      0,
    mapHeight: data?.mapHeight,
    mapOriginX: data?.mapOriginX,
    mapOriginY: data.mapOriginY,
    mapResolution: data.mapResolution,
  });

  const eachShelf = shelf?.find(
    (v) => v.Loc.locationId === shelfSelectedStyleId,
  );
  console.log(eachShelf);
  return (
    <>
      <WrapperForCargo left={displayX} top={displayY}>
        <Wrapper
          translatex={cStyle.translateX}
          translatey={cStyle.translateY}
          scale={cStyle.scale}
          rotate={cStyle.rotate}
          flex_direction={cStyle.flex_direction}
        >
          {Array.from({ length: currentShelf }, (_, i) => (
            <Block key={i}>
              <BlockSpan>
                {prefixLevelName(
                  eachShelf?.ShelfConfig[i]?.peripheral_name.name,
                )}
              </BlockSpan>
            </Block>
          ))}
        </Wrapper>
      </WrapperForCargo>
    </>
  );
};

export default SudoCargo;
