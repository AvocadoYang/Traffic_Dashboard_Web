import { Layout, Flex } from "antd";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import MissionBtn from "@/pages/Main/components/WebView/components/MissionBtn";
import StartSimModal from "@/pages/SimulateResult/StartSimModal";
import { useHeader } from "./UseHeader";
import { Nav, Hamburger } from "@/components/Common/Header/Nav";
import SimControl from "./SimControl";
import LanguageSelect from "./LanguageSelect";
import UserMenu from "./UserMenu";
import ChangePasswordModal from "./ChangePasswordModal";
import CreateUserModel from "./CreateUserModel";
import logo from "@/assets/kenmec_without_background.png";

const { Header: AntdHeader } = Layout;

const StyledHeader = styled(AntdHeader)`
  background: #ffffff !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px !important;
  height: 64px;
  position: relative;
`;

const Logo = styled.img`
  cursor: pointer;
  height: 80px;
  width: auto;
  object-fit: contain;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);

  //PC版
  @media (min-width: 768px) {
    position: static;
    transform: none;
    left: auto;
  }
`;

const Header: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const { t } = useTranslation();
  const {
    contextHolder, navigate, location, script, username,
    canSim,
    isSimulateOpen, setIsSimulateOpen,
    drawerOpen, setDrawerOpen,
    openChangePassword, setOpenChangePassword,
    openCreateUser, setOpenCreateUser,
    handleSim, handleAbortSim,
    handleMenuClick, handleLanguageChange, handleUserMenuClick,
  } = useHeader();

  type NavItem = {
    key: number;
    label: string;
    children?: { key: number; label: string }[];
  };

  const NavItems: NavItem[] = [
    t("page_view"), t("page_amr"), t("page_cargo_history"),
    t("page_setting"), t("page_simulate"),
    t("page_simulate_result"), t("page_record"),
  ].map((label, i) => ({ key: i + 1, label })).concat({
    key: 8,
    label: t("page_personal_info"),
    children: [
      { key: 81, label: t("page_create_user") },
      { key: 82, label: t("page_change_password") },
    ],
  });

  return ( 
    <>
      {contextHolder}
      <StyledHeader>
        <Logo src={logo} onClick={() => navigate("/")} />
        {isMobile ? (
          <Hamburger
            items={NavItems}
            onMenuClick={handleMenuClick}
            drawerOpen={drawerOpen}
            setDrawerOpen={setDrawerOpen}
          />
        ) : (
          <Nav
            items={NavItems}
            onClick={handleMenuClick}
          />
        )}
        <Flex gap="middle" align="center">
          {/* {location.pathname === "/" && <MissionBtn />}
          <SimControl
            isSimulating={!!script?.isSimulate}
            onStart={() => setIsSimulateOpen(true)}
            onStop={handleAbortSim}
          />  */}
          {/* <LanguageSelect onChange={handleLanguageChange} /> */}
          <UserMenu username={username} onMenuClick={handleUserMenuClick} />
        </Flex>
      </StyledHeader>

      <StartSimModal
        isSimulateOpen={isSimulateOpen}
        canSim={canSim}
        handleSim={handleSim}
        setIsSimulateOpen={setIsSimulateOpen}
      />
      <ChangePasswordModal
        open={openChangePassword}
        setOpen={setOpenChangePassword}
      />
      <CreateUserModel open={openCreateUser} setOpen={setOpenCreateUser} />
    </>
  );
}; 

export default memo(Header);