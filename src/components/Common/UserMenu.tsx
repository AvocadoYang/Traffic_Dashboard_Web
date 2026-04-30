import styled from "styled-components";
import { Grid } from "antd";
import { LuLogOut } from "react-icons/lu";
import { titleSizes } from "@/styles/mixins";

const { useBreakpoint } = Grid;

type UserMenuProps = {
  username: string;
  onMenuClick: (e: { key: string }) => void;
};

const Wrapper = styled.div`
  ${titleSizes.small};
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
`;

const Text = styled.span`
  margin-right: 4px;
`;

const UserMenu: React.FC<UserMenuProps> = ({ username, onMenuClick }) => {
  const screens = useBreakpoint();
  const isDesktop = !!screens.md;

  return (
    <Wrapper onClick={() => onMenuClick({ key: "2" })}>
      {isDesktop && <Text>HI 👋 {username}</Text>}
      <LuLogOut size={25} />
    </Wrapper>
  );
};

export default UserMenu;