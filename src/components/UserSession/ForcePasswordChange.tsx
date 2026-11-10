import { FC, useState } from "react";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import { getToken, tokenMustChangePassword } from "@/utils/session";

/** 還在用預設密碼 (admin / admin 這類) 登入的: 先改密碼, 改完之前後端其他 API 都回 403 */
const ForcePasswordChange: FC = () => {
  const [open, setOpen] = useState(() => tokenMustChangePassword(getToken()));
  return <ChangePasswordModal open={open} setOpen={setOpen} forced />;
};

export default ForcePasswordChange;
