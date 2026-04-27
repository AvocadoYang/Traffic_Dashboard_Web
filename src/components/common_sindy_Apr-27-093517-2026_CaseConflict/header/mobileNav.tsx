import { Drawer, Menu, Avatar, Flex, Button } from "antd";
import { MenuOutlined, UserOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { font } from "@/styles/variables";
import LanguageSelect from "./languageSelect";

const StyledDrawer = styled(Drawer)`
  .ant-drawer-header {
    background: #ffffff;
    border-bottom: 2px solid ${font.color.white};
    border-left: 4px solid ${font.color.blue};
  }
  .ant-drawer-title {
    color: ${font.color.blue};
    font-family: ${font.fontFamily.en};
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-weight: ${font.weight.bold};
  }
  .ant-drawer-body { padding: 0; }
`;

const StyledMenu = styled(Menu)`
  background: #fafafa !important;
  border: none !important;
  font-family: ${font.fontFamily.en};

  .ant-menu-item {
    color: ${font.color.gray} !important;
    font-size: ${font.size.sm} !important;
    text-transform: uppercase;
    letter-spacing: 1px;
    background: #ffffff !important;
    border: 1px solid ${font.color.white} !important;
    border-left: 3px solid transparent !important;
    transition: all 0.2s;

    &:hover {
      color: ${font.color.blue} !important;
      background: #f0f5ff !important;
      border-left-color: ${font.color.blue} !important;
    }

    &.ant-menu-item-selected {
      color: ${font.color.blue} !important;
      background: #e6f7ff !important;
      border-left-color: ${font.color.blue} !important;
    }
  }
`;

const MenuButton = styled(Button)`
  background: #ffffff;
  border: 1px solid ${font.color.white};
  color: ${font.color.gray};
  height: 36px;
`;

type MobileNavProps = {
  items: { key: number; label: string }[];
  onMenuClick: (e: { key: string }) => void;
  onLanguageChange: (value: string) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
};

const MobileNav: React.FC<MobileNavProps> = ({
  items, onMenuClick, onLanguageChange, drawerOpen, setDrawerOpen,
}) => (
  <>
    <Flex gap="middle" align="center">
      <LanguageSelect onChange={onLanguageChange} />
      <MenuButton icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} />
    </Flex>

    <StyledDrawer
      title="Navigation"
      placement="left"
      onClose={() => setDrawerOpen(false)}
      open={drawerOpen}
      width={280}
    >
      <StyledMenu mode="vertical" items={items} onClick={onMenuClick} />
      <Avatar size={32} icon={<UserOutlined />} />
    </StyledDrawer>
  </>
);

export default MobileNav;