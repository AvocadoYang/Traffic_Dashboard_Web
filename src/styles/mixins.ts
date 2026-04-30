import { css } from "styled-components";
import styled from "styled-components";
import { Button } from "antd";
import { font } from "./variables";

// ======= 按鈕 =======
export const buttonBase = css`
  display: flex;
  justify-content: center;
  align-items: center;
  letter-spacing: 2px;
  border: 1px solid #d9d9d9;
  cursor: pointer;
`;

// 尺寸
export const buttonSizes = {
  small: css`
    padding: 4px 10px;
    font-size: 12px;
    height: 28px;
    border-radius: 4px;
  `,

  medium: css`
    padding: 6px 16px;
    font-size: 14px;
    height: 36px;
    border-radius: 6px;
  `,

  large: css`
    padding: 8px 20px;
    font-size: 16px;
    height: 44px;
    border-radius: 8px;
  `,
};

// Button component
export const StyledButton = styled(Button) <{
  size: "small" | "medium" | "large";
}>`
  ${buttonBase}
  ${({ size }) => buttonSizes[size]}
`;

// ======= 文字 =======

// 標題 base
const baseTitle = css`
  font-family: ${font.fontFamily.en};
  text-transform: uppercase;
  font-weight: ${font.weight.bold};
`;

// 標題尺寸
export const titleSizes = {
  xxs: css`
    ${baseTitle};
    font-size: ${font.size.sm};
    letter-spacing: 0.5px;
  `,

  xs: css`
    ${baseTitle};
    font-size: ${font.size.md};
    letter-spacing: 1px;
  `,

  small: css`
    ${baseTitle};
    font-size: ${font.size.lg};
    letter-spacing: 1px;
  `,

  medium: css`
    ${baseTitle};
    font-size: ${font.size["2xl"]};
    letter-spacing: 2px;
  `,

  large: css`
    ${baseTitle};
    font-size: ${font.size["3xl"]};
    letter-spacing: 3px;
  `,
};

// 內文 base
const baseBody = css`
  font-family: ${font.fontFamily.en};
  font-weight: ${font.weight.medium};
  letter-spacing: 1px;
`;

// 內文尺寸
export const bodySizes = {
  xs: css`
    ${baseBody};
    font-size: ${font.size.xs};
  `,

  small: css`
    ${baseBody};
    font-size: ${font.size.sm};
  `,

  medium: css`
    ${baseBody};
    font-size: ${font.size.md};
  `,

  large: css`
    ${baseBody};
    font-size: ${font.size.lg};
  `,
};