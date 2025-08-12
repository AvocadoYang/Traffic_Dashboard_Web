import { Dispatch, FC, memo, SetStateAction } from "react";
import CustomTooltip from "./CustomTooltip";
import styled from "styled-components";

const Block = styled.div`
  min-width: 10px;
  max-width: 10px;
  display: flex;
  align-items: center;
`;

const HourMarker = styled.div<{ zoom: number }>`
  /* flex: 0 0 ${(props) => 40 * props.zoom}px; */
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MinuteMarker = styled.div<{ zoom: number }>`
  flex: 0 0 ${(props) => (40 * props.zoom) / 60}px;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const HourMarkerBar = styled.div`
  width: 2px;
  height: 40px;
  background-color: #666;
  border-radius: 1px;
  /* cursor: pointer; */
`;

const MinuteMarkerBar = styled.div`
  width: 1px;
  height: 20px;
  background-color: #999;
  border-radius: 0.5px;
  /* cursor: pointer; */
`;

const HourLabel = styled.span<{ zoom: number }>`
  position: absolute;
  top: 15px;
  font-size: ${(props) => Math.max(12, 12 / props.zoom)}px;
  color: #333;
  z-index: 5;
`;

const MinuteLabel = styled.span<{ zoom: number }>`
  position: absolute;
  top: 15px;
  font-size: ${(props) => Math.max(8, 10 / props.zoom)}px;
  color: #666;
  z-index: 5;
`;

const EachBlock: FC<{
  time: string;
  isHour: boolean;
  minute: number;
  index: number;
  setSelectTime: Dispatch<SetStateAction<string | null>>;
}> = ({ time, isHour, minute, setSelectTime }) => {
  const zoom = 3;

  const handleSelect = () => {
    setSelectTime(time);
  };

  return (
    <CustomTooltip title={time}>
      <Block onClick={handleSelect}>
        {/* {index} */}
        {isHour ? (
          <HourMarker zoom={zoom}>
            <HourLabel zoom={zoom}>{time}</HourLabel>
            <HourMarkerBar />
          </HourMarker>
        ) : (
          <MinuteMarker zoom={zoom}>
            {zoom > 1.5 && minute % 5 === 0 && (
              <MinuteLabel zoom={zoom}>{time}</MinuteLabel>
            )}
            {zoom > 1.5 && <MinuteMarkerBar />}
          </MinuteMarker>
        )}
      </Block>
    </CustomTooltip>
  );
};

export default memo(EachBlock, (prev, next) => prev.index === next.index);
