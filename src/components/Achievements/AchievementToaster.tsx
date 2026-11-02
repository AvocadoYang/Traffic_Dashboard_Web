import { FC, useEffect } from "react";
import { notification } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ACHIEVEMENTS_KEY } from "@/api/useAchievements";
import { io } from "@/sockets/socketConnect";
import { getToken, tokenAccount } from "@/utils/session";

/**
 * 成就解鎖時右下角彈通知 (後端 socket achievement-unlocked)。
 * account 是空字串的是車隊成就, 每個人都通知; 個人成就只通知本人。
 */
const AchievementToaster: FC = () => {
  const { t } = useTranslation();
  const [api, holder] = notification.useNotification({ placement: "topRight" });
  const queryClient = useQueryClient();

  useEffect(() => {
    const onUnlocked = ({ code, account }: { code: string; account: string }) => {
      void queryClient.invalidateQueries({ queryKey: ACHIEVEMENTS_KEY });
      const me = tokenAccount(getToken());
      if (account && account !== me) return;
      const tk = (key: string) => t(key as Parameters<typeof t>[0]) as string;
      api.success({
        title: `🏆 ${tk(account ? "achievements.toast.user" : "achievements.toast.fleet")}`,
        description: `${tk(`achievements.items.${code}.name`)} — ${tk(`achievements.items.${code}.desc`)}`,
        duration: 8,
      });
    };
    io.on("achievement-unlocked", onUnlocked);
    return () => {
      io.off("achievement-unlocked", onUnlocked);
    };
  }, [api, queryClient, t]);

  return holder;
};

export default AchievementToaster;
