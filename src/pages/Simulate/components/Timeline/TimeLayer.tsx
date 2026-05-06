import React, { Dispatch, FC, memo, SetStateAction } from "react";
import styled from "styled-components";
import EachBlock from "./EachBlock";

const TimeLayerWrapper = styled.div`
  position: absolute;
  bottom: 23px;
  left: 15px;
  height: 20px;
  z-index: 12;
  display: flex;
  align-items: center;
`;

const TimeLayer: FC<{
  hours: {
    time: string;
    isHour: boolean;
    minute: number;
    index: number;
  }[];
  setSelectTime: Dispatch<SetStateAction<string | null>>;
}> = ({ hours, setSelectTime }) => {
  return (
    <TimeLayerWrapper>
      {hours.map(({ time, isHour, minute, index }) => (
        <EachBlock
          key={index}
          time={time}
          isHour={isHour}
          minute={minute}
          index={index}
          setSelectTime={setSelectTime}
        />
      ))}
    </TimeLayerWrapper>
  );
};

export default memo(TimeLayer, () => true);
