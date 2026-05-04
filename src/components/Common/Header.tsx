import { Layout, Flex } from "antd";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import {
  FaMap,
  FaTruck,
  FaBox,
  FaCog,
  FaPlayCircle,
  FaChartBar,
  FaExclamationTriangle,
  FaUser,
  FaUserPlus,
  FaKey,
} from "react-icons/fa";
import { NavItem } from "@/types/Common/Nav";
import styled from "styled-components";
import MissionBtn from "@/components/Main/Mission/MissionBtn";
import StartSimModal from "@/pages/SimulateResult/StartSimModal";
import { useHeader } from "./UseHeader";
import { Nav } from "@/components/Common/Nav";
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

  const NavItems: NavItem[] = [
    {
      key: "1",
      label: t("page_view"),
      icon: <FaMap size={16} />,
    },
    {
      key: "2",
      label: t("page_amr"),
      icon: <FaTruck size={16} />,
    },
    {
      key: "3",
      label: t("page_cargo_history"),
      icon: <FaBox size={16} />,
    },
    {
      key: "4",
      label: t("page_setting"),
      icon: <FaCog size={16} />,
    },
    {
      key: "5",
      label: t("page_simulate"),
      icon: <FaPlayCircle size={16} />,
    },
    {
      key: "6",
      label: t("page_simulate_result"),
      icon: <FaChartBar size={16} />,
    },
    {
      key: "7",
      label: t("page_record"),
      icon: <FaExclamationTriangle size={16} />,
    },
    {
      key: "8",
      label: t("page_personal_info"),
      icon: <FaUser size={16} />,
      children: [
        {
          key: "81",
          label: t("page_create_user"),
          icon: <FaUserPlus size={14} />,
        },
        {
          key: "82",
          label: t("page_change_password"),
          icon: <FaKey size={14} />,
        },
      ],
    },
  ];

  return (
    <>
      {contextHolder}
      <StyledHeader>
        <Flex gap="small" align="center">
          <Nav
            items={NavItems}
            onClick={handleMenuClick}
            drawerOpen={drawerOpen}
            setDrawerOpen={setDrawerOpen}
          />

          <Logo src={logo} onClick={() => navigate("/")} />
        </Flex>

        <Flex gap="middle" align="center" style={{ flex: 1, justifyContent: "center" }}>
          {location.pathname === "/" && (
            <MissionBtn
              isSimulating={!!script?.isSimulate}
              onStart={() => setIsSimulateOpen(true)}
              onStop={handleAbortSim}
            />
          )}
        </Flex>


        <Flex gap="middle" align="center">
          <LanguageSelect onChange={handleLanguageChange} isMobile={isMobile} />
          <UserMenu
            username={username}
            onMenuClick={handleUserMenuClick}
          />
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