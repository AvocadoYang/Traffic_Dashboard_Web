import { FC, useState } from "react";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import { getToken, tokenPasswordReminder } from "@/utils/session";

/**
 * 還在用預設密碼 (admin / admin 這類) 登入的: 建議改密碼, 可以按「7 天後再提醒」略過。
 * 不擋任何功能; 右上角關掉的話, 下次開頁面或登入會再出現。
 */
const PasswordReminder: FC = () => {
  const [open, setOpen] = useState(() => tokenPasswordReminder(getToken()));
  return <ChangePasswordModal open={open} setOpen={setOpen} reminder />;
};

export default PasswordReminder;
