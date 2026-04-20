import { css } from "styled-components";
import styled from "styled-components";
import { Button } from "antd";
import { font } from "./variables";

// ======= 基礎按鈕 mixin =======
export const buttonBase = css`
  font-family: ${font.fontFamily.en};
  text-transform: uppercase;
  font-size: ${font.size.xs};
  letter-spacing: 1px;
  height: 36px;
  font-weight: ${font.weight.semibold};
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  border-radius: 0;
  cursor: pointer;
`;

// ======= 按鈕變體 css =======
export const buttonVariants = {
  default: css`
    ${buttonBase}
    background: ${font.color.bg_white_1};
    border: 1px solid ${font.color.white};
    color: ${font.color.gray};

    &:hover {
      background: ${font.color.bg_white_2};
      border-color: ${font.color.border_gray_1};
      color: ${font.color.black};
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  `,

  primary: css`
    ${buttonBase}
    background: ${font.color.blue};
    border: 1px solid ${font.color.blue};
    color: ${font.color.bg_white_1};

    &:hover {
      background: ${font.color.bg_blue};
      border-color: ${font.color.bg_blue};
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  `,

  danger: css`
    ${buttonBase}
    background: #fff1f0;
    border: 1px solid ${font.color.red};
    color: ${font.color.red};

    &:hover {
      border-color: #ff7875;
      color: #ff7875;
      box-shadow: 0 2px 8px rgba(255, 77, 79, 0.2);
    }
  `,

  ghost: css`
    ${buttonBase}
    background: transparent;
    border: 1px solid ${font.color.white};
    color: ${font.color.gray};

    &:hover {
      border-color: ${font.color.blue};
      color: ${font.color.blue};
    }
  `,
};

// ======= 按鈕元件 =======
export const DefaultButton = styled(Button)`${buttonVariants.default}`;
export const PrimaryButton = styled(Button)`${buttonVariants.primary}`;
export const DangerButton  = styled(Button)`${buttonVariants.danger}`;
export const GhostButton   = styled(Button)`${buttonVariants.ghost}`;