import { Button } from 'antd';
import styled from 'styled-components';

export const PeripheralIcon = styled.svg`
  width: 20px;
  color: white;
`;

type StationTransform = {
  scale: number;
  translate_x: number;
  translate_y: number;
  rotate: number;
};

type StationPosition = {
  left: number;
  top: number;
};

export const ChargingStationContainer = styled.div<StationPosition>`
  position: absolute;
  top: ${(props) => `${props.top}px`};
  left: ${(props) => `${props.left}px`};
  width: 3px;
  height: 3px;
  background: #3bbdc1;
  border-radius: 50%;
`;

export const ChargingStation = styled.div<StationTransform>`
  width: 21px;
  height: 26px;
  background: #ff2b2b;
  border: 1px solid black;
  z-index: 20;
  text-align: center;
  display: flex;
  border-radius: 5px;
  font-weight: bolder;
  justify-content: center;
  align-content: center;
  align-items: center;
  transform: ${(props) =>
    `translate(${props.translate_x}em, ${props.translate_y}em) scale(${props.scale}) rotate(${props.rotate}deg)`};
`;

export const ConveyorStationContainer = styled.div.attrs<StationPosition>(({ left, top }) => ({
  style: { left, top }
}))<StationPosition>`
  position: absolute;
  width: 5px;
  height: 5px;
`;

export const ConveyorWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 1px 2px;
  background-color: #000000;
  border: 2px solid #0d0d0d;
  border-radius: 12px;
  width: fit-content;
`;

export const ConveyorBelt = styled.div`
  width: 50px;
  height: 16px;
  background: repeating-linear-gradient(90deg, #fc6565, #fc6565 4px, #dca2a2 4px, #dca2a2 8px);
  border-radius: 8px;
  position: relative;
`;

export const ConveyorCargoBox = styled.div`
  width: 20px;
  height: 20px;
  background-color: #ffd9ad;
  border: 2px solid #92400e;
  border-radius: 4px;
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
`;

export const ConveyorArrow = styled.div<{ direction: 'load' | 'offload' }>`
  position: absolute;
  top: -6px;
  ${({ direction }) =>
    direction === 'load'
      ? `
        left: 18%;
        transform: translate(-50%, -100%) rotate(0deg);
      `
      : `
        left: 82%;
        transform: translate(-50%, -100%) rotate(180deg);
      `}
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid ${({ direction }) => (direction === 'load' ? '#10b981' : '#ef4444')};
`;

export const StorageStationContainer = styled.div.attrs<StationPosition>(({ left, top }) => ({
  style: { left, top }
}))<StationPosition>`
  position: absolute;
  width: 5px;
  height: 5px;
`;

export const StorageWrapper = styled.div<{
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

export const StorageBlock = styled(Button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ff0000;
  background-color: transparent;
  border-radius: 3px;
  min-width: 15px;
  max-height: 15px;
  max-width: 100%;
  padding: 0 2px;
  transition: all 0.2s ease;
  position: relative;
  flex-grow: 1;
  z-index: 1;
  cursor: pointer;
  opacity: 1;
`;

export const StorageBlockLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  user-select: none;
  text-align: center;
`;
