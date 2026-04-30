import { Menu, Drawer, Button, ConfigProvider } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import styled, { createGlobalStyle } from "styled-components";
import { font } from "@/styles/variables";
import { bodySizes, titleSizes } from "@/styles/mixins";
import { NavItem } from "@/types/Common/Nav";
import { Grid } from "antd";



// ─── RWD ─────────────────────────────
const { useBreakpoint } = Grid;

// ─── Global Style ─────────────────────────────
const GlobalMenuStyle = createGlobalStyle`
  .ant-menu-item {
    ${titleSizes.small};
    color: ${font.color.gray} !important;
    border-bottom: 1px solid ${font.color.border_gray_1} !important;
  }

  .ant-menu-item:last-child {
    border-bottom: none !important;
  }

  .ant-menu-item:hover {
    color: ${font.color.blue} !important;
    background: rgba(24, 144, 255, 0.08) !important;
  }
`;

// ─── Styled Components ─────────────────────────
const StyledDrawer = styled(Drawer)`
  .ant-drawer-header {
    background: #fff;
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

const StyledMenu = styled(Menu)`
.ant-menu-item,
.ant-menu-submenu-title {
    ${bodySizes.large};
    color: ${font.color.gray} !important;
    border-bottom: 1px solid ${font.color.border_gray_1};
    border-left: 4px solid transparent;    
    border-right: 4px solid transparent;

    &.ant-menu-item-selected {
      color: ${font.color.blue} !important;
      border-left-color: ${font.color.blue} !important;
      background: rgba(24, 144, 255, 0.08) !important;
    }
  }
`;

const MenuButton = styled(Button)`
  border: 1px solid ${font.color.gray};
`;

// ─── Types ─────────────────────────────────────
type NavMenuProps = {
  items: NavItem[];
  onClick: (e: { key: string }) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
};

// ─── Main Component ────────────────────────────
export const Nav: React.FC<NavMenuProps> = ({
  items,
  onClick,
  drawerOpen,
  setDrawerOpen,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <>
      <GlobalMenuStyle />

      <MenuButton
        icon={<MenuOutlined />}
        onClick={() => setDrawerOpen(true)}
      />

      <ConfigProvider
        theme={{
          components: {
            Menu: {
              itemColor: font.color.gray,
              itemHoverColor: font.color.blue,
              itemSelectedColor: font.color.blue,
              itemSelectedBg: "rgba(24, 144, 255, 0.08)",
              itemHoverBg: "transparent",
            },
          },
        }}
      >
        <StyledDrawer
          title="目錄"
          placement="left"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
          size={isMobile ? 210 : 260}
        >
          <StyledMenu
            mode="vertical"
            items={items}
            onClick={onClick}
          />
        </StyledDrawer>
      </ConfigProvider>
    </>
  );
};