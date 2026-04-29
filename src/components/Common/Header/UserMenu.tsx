import styled from "styled-components";
import { LoginOutlined } from "@ant-design/icons";
import { Grid } from "antd";
import { titleSizes } from "@/styles/mixins";

const { useBreakpoint } = Grid;

type UserMenuProps = {
  username: string;
  onMenuClick: (e: { key: string }) => void;
};

const Wrapper = styled.div`
  ${titleSizes.small};  
  gap: 15px;
  cursor: pointer;
`;

const Text = styled.span<{ $isDesktop: boolean }>`
  margin-right: 8px;
`;

const Icon = styled(LoginOutlined) <{ $isDesktop: boolean }>`
  font-size: ${(props) => (props.$isDesktop ? titleSizes.small : titleSizes.medium)};
`;

const UserMenu: React.FC<UserMenuProps> = ({ username, onMenuClick }) => {
  const screens = useBreakpoint();
    const isDesktop = !!screens.md;
  

  return (
    <Wrapper onClick={() => onMenuClick({ key: "2" })}>
      <Text $isDesktop={isDesktop}>
        {isDesktop ? `HI 👋 ${username}` : ""}
      </Text>
      <Icon $isDesktop={isDesktop} />
    </Wrapper>
  );
};

export default UserMenu;