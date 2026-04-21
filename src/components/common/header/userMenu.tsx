import { Avatar, Dropdown } from "antd";
import { UserOutlined } from "@ant-design/icons";

type UserMenuProps = {
  username: string;
  onMenuClick: (e: { key: string }) => void;
};

const UserMenu: React.FC<UserMenuProps> = ({ username, onMenuClick }) => {
  const items = [
    `HI 👋 ${username}`,
    "logout",
    "change password",
    "create user",
  ].map((label, i) => ({ key: String(i + 1), label }));

  return (
    <Dropdown
      menu={{ items, onClick: onMenuClick }}
      placement="bottomRight"
      trigger={["click"]}
    >
      <Avatar
        size={32}
        icon={<UserOutlined />}
        style={{ cursor: "pointer" }}
        shape="square"
      />
    </Dropdown>
  );
};

export default UserMenu;