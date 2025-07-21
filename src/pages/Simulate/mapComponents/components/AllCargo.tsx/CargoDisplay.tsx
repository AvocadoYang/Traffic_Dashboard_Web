import { Button } from 'antd';
import { FC } from 'react';
import styled from 'styled-components';

// Styled components for enhanced UI
const Block = styled(Button)<{
  $hasCargo: boolean;
  $isDisable: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ $hasCargo }) => ($hasCargo ? '#ffe73c80' : '#f5f5f580')};
  border: '1px dashed #727272';
  border-radius: 3px;
  min-width: 15px;
  max-height: 15px;
  max-width: 100%;
  padding: 0 2px;
  transition: all 0.2s ease;
  position: relative;
  flex-grow: 1;
  z-index: 1;
  cursor: 'pointer';
  opacity: ${({ $isDisable }) => ($isDisable ? 0.6 : 1)};
  box-shadow: '0 0 8px rgba(24, 144, 255, 0.3)';

  &:hover:not(:disabled) {
    background-color: ${({ $hasCargo }) => ($hasCargo ? '#ffe73cb3' : '#e8e8e8b3')};
    transform: scale(1.05);
  }

  &:disabled::after {
    content: 'X';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #fff;
    font-size: 16px;
    font-weight: bold;
    background-color: rgba(113, 113, 113, 0.7);
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const BlockSpan = styled.span<{ rotate: number; $hasCargo: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${({ $hasCargo }) => ($hasCargo ? '#000' : '#333')};
  transform: ${({ rotate }) => `rotate(${-rotate}deg)`};
  white-space: nowrap;
  user-select: none;
  text-align: center;
`;

const CargoDisplay: FC<{
  level: number;
  levelName: string;
  cargoValue: boolean;
  isDisable: boolean;
  locId: string;
  rotate: number;
  handleMouseDown: (e: React.MouseEvent<HTMLElement>, locId: string, level: number) => void;
}> = ({ level, levelName, cargoValue, isDisable, locId, rotate, handleMouseDown }) => {
  return (
    <Block
      key={level}
      $hasCargo={cargoValue}
      $isDisable={isDisable}
      onMouseDown={(e) => handleMouseDown(e, locId, level)}
    >
      <BlockSpan $hasCargo={cargoValue} rotate={rotate} id={locId}>
        {levelName}
      </BlockSpan>
    </Block>
  );
};

export default CargoDisplay;
