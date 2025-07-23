import styled from "styled-components";
import { FC, ReactNode } from "react";

const TooltipWrapper = styled.div`
  position: relative;
  display: inline-block;

  &:hover > div {
    opacity: 1;
    visibility: visible;
    /* transform: translateX(-50%) translateY(-8px); */
  }
`;

const TooltipText = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(14px);
  background-color: rgba(0, 0, 0, 0.75);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  font-size: 12px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease-in-out;
  pointer-events: none;
  z-index: 999;
`;

interface CustomTooltipProps {
  title: string;
  children: ReactNode;
}

const CustomTooltip: FC<CustomTooltipProps> = ({ title, children }) => {
  return (
    <TooltipWrapper>
      <TooltipText>{title}</TooltipText>
      {children}
    </TooltipWrapper>
  );
};

export default CustomTooltip;
