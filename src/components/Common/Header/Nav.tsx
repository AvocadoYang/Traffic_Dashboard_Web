import { Menu, ConfigProvider, Drawer, Button } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import styled, { createGlobalStyle } from "styled-components";
import { font } from "@/styles/variables";
import { bodySizes, titleSizes } from "@/styles/mixins";

const GlobalMenuStyle = createGlobalStyle`
  .ant-menu-submenu-popup .ant-menu-item {
    ${titleSizes.small} !important;
    color: ${font.color.gray} !important;
    border-bottom: 1px solid ${font.color.border_gray_1} !important;
    min-width: 150px !important;
  }

  .ant-menu-submenu-popup .ant-menu-item:last-child {
    border-bottom: none !important;
  }

  .ant-menu-submenu-popup .ant-menu-item:hover {
    color: ${font.color.blue} !important;
    background: rgba(24, 144, 255, 0.08) !important;
  }
`as unknown as React.FC;

// ─── Desktop ───────────────────────────────────────────
const StyledDesktopMenu = styled(Menu)`
  .ant-menu-item,
  .ant-menu-submenu-title {
    ${titleSizes.small};
  }
`;

// ─── Mobile ────────────────────────────────────────────
const StyledDrawer = styled(Drawer)`
  .ant-drawer-header {
    background: #ffffff;
    border-bottom: 2px solid ${font.color.border_gray_1};
  }
  .ant-drawer-title {
    ${titleSizes.medium};
    color: ${font.color.blue};
  }
  .ant-drawer-body {
    padding: 0;
  }
`;

const StyledMobileMenu = styled(Menu)`
  ${bodySizes.medium};

  .ant-menu-item ,
  .ant-menu-submenu-title{
    color: ${font.color.gray} !important;
    border-bottom: 1px solid ${font.color.border_gray_1};
    border-left: 4px solid transparent;
    border-right: 5px solid transparent;

    &.ant-menu-item-selected {
      border-left-color: ${font.color.blue} !important;
    }
  }
`;

const MenuButton = styled(Button)`
  border: 1px solid ${font.color.gray};
`;

// ─── Types ─────────────────────────────────────────────
export type NavItem = {
  key: number;
  label: string;
  children?: { key: number; label: string }[];
};
type NavMenuProps = {
  items: NavItem[];
  onClick: (e: { key: string }) => void;
};

type MobileNavProps = {
  items: NavItem[];
  onMenuClick: (e: { key: string }) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
};

// ─── Desktop Component ─────────────────────────────────
export const Nav: React.FC<NavMenuProps> = ({ items, onClick }) => (
  <>
    <GlobalMenuStyle />
    <ConfigProvider
      theme={{
        components: {
          Menu: {
            itemColor: font.color.gray,
            itemHoverColor: font.color.blue,
            itemHoverBg: "transparent",
            horizontalItemHoverColor: font.color.blue,
            horizontalItemSelectedColor: font.color.blue,
            horizontalItemSelectedBg: "rgba(24, 144, 255, 0.08)",
            activeBarBorderWidth: 1,
            subMenuItemBg: "#ffffff",
            itemSelectedColor: font.color.blue,
            itemSelectedBg: "rgba(24, 144, 255, 0.08)",
          },
        },
      }}
    >
      <StyledDesktopMenu
        mode="horizontal"
        items={items}
        onClick={onClick}
        style={{ flex: 1, minWidth: 0, border: "none" }}
      />
    </ConfigProvider>
  </>
);

// ─── Mobile Component ──────────────────────────────────
export const Hamburger: React.FC<MobileNavProps> = ({
  items,
  onMenuClick,
  drawerOpen,
  setDrawerOpen,
}) => (
  <>
    <GlobalMenuStyle />
    <MenuButton icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} />
    <StyledDrawer
      title="目錄"
      placement="left"
      onClose={() => setDrawerOpen(false)}
      open={drawerOpen}
      size={180}
    >
      <StyledMobileMenu mode="vertical" items={items} onClick={onMenuClick} />
    </StyledDrawer>
  </>
);
