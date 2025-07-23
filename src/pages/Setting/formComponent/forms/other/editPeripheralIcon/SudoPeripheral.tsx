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

  if (selectStation.peripheralType === "Charging") {
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

  if (selectStation.peripheralType === "Conveyor") {
    return (
      <ConveyorStationContainer left={left} top={top}>
        <ConveyorWrapper
          style={{
            transform: `translate(${selectStation.translateX}px, ${selectStation.translateY}px) scale(${selectStation.scale}) rotate(${selectStation.rotate}deg)`,
          }}
        >
          <ConveyorBelt></ConveyorBelt>
        </ConveyorWrapper>
      </ConveyorStationContainer>
    );
  }

  if (selectStation.peripheralType === "Storage") {
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
