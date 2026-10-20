import { FC, ReactNode, useMemo } from "react";
import { Badge, Spin, Tabs } from "antd";
import {
  BellOutlined,
  HistoryOutlined,
  IdcardOutlined,
  MessageOutlined,
  SlidersOutlined,
  StarOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import Layout, { Content } from "antd/es/layout/layout";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import { useMyProfile, useShiftNotes } from "@/api/useProfile";
import { UserAvatar } from "@/components/UserAvatar/UserAvatar";
import { mq } from "@/styles/responsive";
import { getToken, tokenAccount } from "@/utils/session";
import AccountTab from "./AccountTab";
import PreferencesTab from "./PreferencesTab";
import NotifyTab from "./NotifyTab";
import FavoritesTab from "./FavoritesTab";
import ShiftTab from "./ShiftTab";
import LoginLogTab from "./LoginLogTab";
import AccountsTab from "./AccountsTab";

const StyledLayout = styled(Layout)`
  height: var(--app-height);
  overflow: hidden;
`;

const StyledContent = styled(Content)`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-sm);
  background: var(--c-bg-muted);

  ${mq.pad} {
    padding: var(--space-md);
  }
`;

const Inner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
`;

const IdentityCard = styled.section`
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--c-bg);
  border: 1px solid var(--c-header-border);
  border-left: 4px solid var(--c-header-accent);
  border-radius: 4px;

  h1 {
    margin: 0;
    font-size: var(--font-lg);
    color: var(--c-text);
  }
  p {
    margin: 2px 0 0;
    font-size: var(--font-sm);
    color: var(--c-text-secondary);
  }
`;

const TabsCard = styled.section`
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 4px;
  padding: 0 var(--space-md) var(--space-md);

  .ant-tabs-nav {
    margin-bottom: var(--space-md);
  }
`;

export type ProfileTabKey = "account" | "prefs" | "notify" | "favorites" | "shift" | "logins" | "accounts";

/** 個人設定頁 (/profile): 個人資料、偏好、通知、常用任務、交班留言、登入紀錄、帳號管理 (ADMIN) */
const Profile: FC = () => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const { data: profile, isLoading } = useMyProfile();
  const { data: notes } = useShiftNotes();
  const account = profile?.account ?? tokenAccount(getToken());
  const isAdmin = profile?.role === "ADMIN";

  const tabs = useMemo(() => {
    const list: { key: ProfileTabKey; icon: ReactNode; label: ReactNode; body: ReactNode }[] = [
      { key: "account", icon: <IdcardOutlined />, label: t("profile.tab.account"), body: <AccountTab /> },
      { key: "prefs", icon: <SlidersOutlined />, label: t("profile.tab.prefs"), body: <PreferencesTab /> },
      { key: "notify", icon: <BellOutlined />, label: t("profile.tab.notify"), body: <NotifyTab /> },
      { key: "favorites", icon: <StarOutlined />, label: t("profile.tab.favorites"), body: <FavoritesTab /> },
      {
        key: "shift",
        icon: <MessageOutlined />,
        label: (
          <Badge count={notes?.unread ?? 0} size="small" offset={[8, -2]}>
            {t("profile.tab.shift")}
          </Badge>
        ),
        body: <ShiftTab />,
      },
      { key: "logins", icon: <HistoryOutlined />, label: t("profile.tab.logins"), body: <LoginLogTab /> },
    ];
    if (isAdmin) {
      list.push({ key: "accounts", icon: <TeamOutlined />, label: t("profile.tab.accounts"), body: <AccountsTab /> });
    }
    return list;
  }, [t, notes?.unread, isAdmin]);

  const asked = params.get("tab") as ProfileTabKey | null;
  const active = tabs.some((x) => x.key === asked) ? (asked as ProfileTabKey) : "account";

  return (
    <StyledLayout>
      <Header />
      <StyledContent>
        <Inner>
          <IdentityCard>
            <UserAvatar avatar={profile?.avatar} account={account} size={56} />
            <div>
              <h1>{account}</h1>
              <p>{profile ? t(`profile.role.${profile.role}`) : " "}</p>
            </div>
          </IdentityCard>
          <TabsCard>
            {isLoading ? (
              <Spin style={{ display: "block", margin: "48px auto" }} />
            ) : (
              <Tabs
                activeKey={active}
                onChange={(key) => setParams({ tab: key }, { replace: true })}
                destroyOnHidden
                items={tabs.map((x) => ({
                  key: x.key,
                  label: (
                    <span>
                      {x.icon} {x.label}
                    </span>
                  ),
                  children: x.body,
                }))}
              />
            )}
          </TabsCard>
        </Inner>
      </StyledContent>
    </StyledLayout>
  );
};

export default Profile;
