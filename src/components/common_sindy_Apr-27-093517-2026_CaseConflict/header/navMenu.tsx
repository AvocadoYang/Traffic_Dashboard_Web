import { Menu } from "antd";
import styled from "styled-components";
import { font } from "@/styles/variables";

const StyledMenu = styled(Menu)`
  background: transparent !important;
  border: none !important;
  font-family: ${font.fontFamily.en};
  flex: 1;

  .ant-menu-item {
    color: ${font.color.gray} !important;
    font-size: 11px !important;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: ${font.weight.semibold};
    height: 64px;
    line-height: 64px;
    transition: all 0.2s;

    &:hover {
      color: ${font.color.blue} !important;
      background: rgba(24, 144, 255, 0.05) !important;
      border-bottom-color: ${font.color.blue};
    }

    &.ant-menu-item-selected {
      color: ${font.color.blue} !important;
      background: rgba(24, 144, 255, 0.08) !important;
      box-shadow: inset 0 -3px 0 ${font.color.blue};
    }
  }
`;

type NavMenuProps = {
  items: { key: number; label: string }[];
  onClick: (e: { key: string }) => void;
};

const NavMenu: React.FC<NavMenuProps> = ({ items, onClick }) => (
  <StyledMenu
    mode="horizontal"
    items={items}
    onClick={onClick}
    style={{ flex: 1, minWidth: 0, border: "none" }}
  />
);

export default NavMenu;