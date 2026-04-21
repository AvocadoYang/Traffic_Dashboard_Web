import { useTimelineSocket } from "@/sockets/useTimelineSocket";
import React, { FC } from "react";
import styled from "styled-components";

const TimeDisplay = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: #ff4d4f;
  font-family: "Roboto Mono", monospace;
  min-width: 80px;
  text-align: center;

  background: #ffffff;
`;

const SimTime: FC<{}> = () => {
  const timeline = useTimelineSocket();
  return <TimeDisplay>{timeline}</TimeDisplay>;
};

export default SimTime;
