import useMap from "@/api/useMap";
import usePeripheralStyle from "@/api/usePeripheralStyle";
import { IsEditPeripheralStyle, PeripheralEditData } from "@/utils/gloable";
import { rosCoord2DisplayCoord } from "@/utils/utils";
import { useAtomValue } from "jotai";
import {
  PeripheralIcon,
  ChargingStationContainer,
  ChargingStation,
  ConveyorStationContainer,
  ConveyorWrapper,
  ConveyorBelt,
  StorageStationContainer,
  StorageWrapper,
  StorageBlock,
  StorageBlockLabel,
} from "./sudo";
import styled from "styled-components";

const ConveyorContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const SvgStyle = styled.svg`
  width: 24px;
  height: 24px;
  padding: 2px;
  border-radius: 4px;
  transition: all 0.2s ease;

  fill: #ff0505;
  box-shadow: none;
  border: 1px dashed #ff0000;
`;

const SudoPeripheral = () => {
  const selectStation = useAtomValue(PeripheralEditData);
  const { data: defaultData } = usePeripheralStyle(
    selectStation?.peripheralType || null,
  );
  const isEditNow = useAtomValue(IsEditPeripheralStyle);
  const mapData = useMap();

  if (!mapData.data || !isEditNow || !selectStation) {
    return null;
  }

  const defaultStyle = defaultData?.find(
    (v) => v?.locationId === Number(selectStation?.loc),
  );

  if (!defaultStyle) {
    return <div>Something went wrong: Station data not found</div>;
  }

  const [left, top] = rosCoord2DisplayCoord({
    x: defaultStyle.x as number,
    y: defaultStyle.y as number,
    mapHeight: mapData.data.mapHeight,
    mapOriginX: mapData.data.mapOriginX,
    mapOriginY: mapData.data.mapOriginY,
    mapResolution: mapData.data.mapResolution,
  });

  if (selectStation.peripheralType === "CHARGING") {
    return (
      <ChargingStationContainer left={left} top={top} key={selectStation.loc}>
        <ChargingStation
          scale={selectStation.scale}
          rotate={selectStation.rotate}
          translate_x={selectStation.translateX}
          translate_y={selectStation.translateY}
        >
          <PeripheralIcon
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path d="M19.77,7.23L19.78,7.22L16.06,3.5L15,4.56L17.11,6.67C16.17,7.03 15.5,7.93 15.5,9A2.5,2.5 0 0,0 18,11.5C18.36,11.5 18.69,11.42 19,11.29V18.5A1,1 0 0,1 18,19.5A1,1 0 0,1 17,18.5V14A2,2 0 0,0 15,12H14V5A2,2 0 0,0 12,3H6A2,2 0 0,0 4,5V21H14V13.5H15.5V18.5A2.5,2.5 0 0,0 18,21A2.5,2.5 0 0,0 20.5,18.5V9C20.5,8.31 20.22,7.68 19.77,7.23M18,10A1,1 0 0,1 17,9A1,1 0 0,1 18,8A1,1 0 0,1 19,9A1,1 0 0,1 18,10M8,18V13.5H6L10,6V11H12L8,18Z" />
          </PeripheralIcon>
        </ChargingStation>
      </ChargingStationContainer>
    );
  }

  if (selectStation.peripheralType === "CONVEYOR") {
    return (
      <ConveyorStationContainer left={left} top={top}>
        <ConveyorContainer
          style={{
            transform: `translate(${selectStation.translateX}px, ${selectStation.translateY}px) scale(${selectStation.scale}) rotate(${selectStation.rotate}deg)`,
          }}
        >
          <SvgStyle xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M2 3C2.55 3 3 3.45 3 4V13H5V5C5 4.45 5.45 4 6 4C6.55 4 7 4.45 7 5V13H9V6C9 5.45 9.45 5 10 5C10.55 5 11 5.45 11 6V13H12.5C12.67 13 12.84 13 13 13.05V7C13 6.45 13.45 6 14 6C14.55 6 15 6.45 15 7V15.5C15 16.88 13.88 18 12.5 18H11.5C11.22 18 11 18.22 11 18.5C11 18.78 11.22 19 11.5 19H17V8C17 7.45 17.45 7 18 7C18.55 7 19 7.45 19 8V19H21V9C21 8.45 21.45 8 22 8C22.55 8 23 8.45 23 9V20C23 20.55 22.55 21 22 21H11.5C10.12 21 9 19.88 9 18.5C9 17.12 10.12 16 11.5 16H12.5C12.78 16 13 15.78 13 15.5C13 15.22 12.78 15 12.5 15H2C1.45 15 1 14.55 1 14V4C1 3.45 1.45 3 2 3Z" />
          </SvgStyle>
        </ConveyorContainer>
      </ConveyorStationContainer>
    );
  }

  if (selectStation.peripheralType === "STORAGE") {
    return (
      <StorageStationContainer left={left} top={top}>
        <StorageWrapper
          translatex={selectStation.translateX}
          translatey={selectStation.translateY}
          scale={selectStation.scale}
          rotate={selectStation.rotate}
          flex_direction={selectStation.flex_direction}
        >
          <StorageBlock>
            <StorageBlockLabel />
          </StorageBlock>
        </StorageWrapper>
      </StorageStationContainer>
    );
  }

  return <div>Unsupported peripheral type</div>;
};

export default SudoPeripheral;
