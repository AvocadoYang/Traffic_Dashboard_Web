import { FC, useState } from "react";
import { Button, message } from "antd";
import { CheckOutlined, DesktopOutlined, LockOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { AvatarChoice, useMyProfile, useSaveProfile } from "@/api/useProfile";
import { AVATAR_COLORS, AVATAR_ICONS, UserAvatar } from "@/components/UserAvatar/UserAvatar";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import ClientNameModal from "@/components/ClientNameModal";
import { getClientName } from "@/utils/clientIdentity";
import { Section, SettingRow } from "./parts";

const IconGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: var(--space-sm);
`;

const IconChoice = styled.button<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-sm) 4px;
  border: 2px solid ${({ $selected }) => ($selected ? "var(--c-header-accent)" : "var(--c-border)")};
  border-radius: 6px;
  background: ${({ $selected }) => ($selected ? "var(--c-bg-subtle)" : "var(--c-bg)")};
  color: var(--c-text);
  font-size: var(--font-sm);
  cursor: pointer;

  &:hover {
    border-color: var(--c-header-accent);
  }
  &:focus-visible {
    outline: 2px solid var(--c-header-accent);
    outline-offset: 2px;
  }
`;

const Swatches = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
`;

const Swatch = styled.button<{ $color: string; $selected: boolean }>`
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2px solid ${({ $selected }) => ($selected ? "var(--c-text)" : "transparent")};
  box-shadow: inset 0 0 0 2px var(--c-bg);
  background: ${({ $color }) => $color};
  color: #fff;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--c-header-accent);
    outline-offset: 2px;
  }
`;

const Preview = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
`;

/** 個人資料: 頭像 (只能從內建的選)、密碼、這台電腦的名稱 */
const AccountTab: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: profile } = useMyProfile();
  const save = useSaveProfile();
  const [openPassword, setOpenPassword] = useState(false);
  const [openClientName, setOpenClientName] = useState(false);
  const [clientName, setClientName] = useState(getClientName);

  const current: AvatarChoice = profile?.avatar ?? { icon: "", color: AVATAR_COLORS[0].id };

  const pick = (next: AvatarChoice) => {
    if (!next.icon) next = { ...next, icon: AVATAR_ICONS[0].id };
    save.mutate(
      { avatar: next },
      {
        onSuccess: () => void messageApi.success(t("profile.saved")),
        onError: () => void messageApi.error(t("profile.save_failed")),
      },
    );
  };

  return (
    <>
      {contextHolder}
      <Section title={t("profile.avatar.title")} hint={t("profile.avatar.hint")}>
        <Preview>
          <UserAvatar avatar={profile?.avatar} account={profile?.account} size={64} />
          {profile?.avatar && (
            <Button size="small" onClick={() => save.mutate({ avatar: null })}>
              {t("profile.avatar.clear")}
            </Button>
          )}
        </Preview>

        <SettingRow label={t("profile.avatar.color")}>
          <Swatches role="radiogroup" aria-label={t("profile.avatar.color")}>
            {AVATAR_COLORS.map((c) => {
              const selected = current.color === c.id;
              return (
                <Swatch
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={t(`profile.avatar_color.${c.id}` as never)}
                  title={t(`profile.avatar_color.${c.id}` as never)}
                  $color={c.value}
                  $selected={selected}
                  onClick={() => pick({ ...current, color: c.id })}
                >
                  {selected && <CheckOutlined />}
                </Swatch>
              );
            })}
          </Swatches>
        </SettingRow>

        <SettingRow label={t("profile.avatar.icon")}>
          <IconGrid role="radiogroup" aria-label={t("profile.avatar.icon")}>
            {AVATAR_ICONS.map((icon) => {
              const selected = current.icon === icon.id;
              return (
                <IconChoice
                  key={icon.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  $selected={selected}
                  onClick={() => pick({ ...current, icon: icon.id })}
                >
                  <UserAvatar avatar={{ icon: icon.id, color: current.color }} size={40} />
                  {t(`profile.avatar_icon.${icon.id}` as never)}
                </IconChoice>
              );
            })}
          </IconGrid>
        </SettingRow>
      </Section>

      <Section title={t("profile.security.title")}>
        <SettingRow label={t("profile.security.password")} help={t("profile.security.password_help")}>
          <Button icon={<LockOutlined />} onClick={() => setOpenPassword(true)}>
            {t("profile.security.change_password")}
          </Button>
        </SettingRow>
        <SettingRow label={t("client_name.title")} help={t("client_name.hint")}>
          <Button icon={<DesktopOutlined />} onClick={() => setOpenClientName(true)}>
            {clientName || t("client_name.unset")}
          </Button>
        </SettingRow>
      </Section>

      <ChangePasswordModal open={openPassword} setOpen={setOpenPassword} />
      <ClientNameModal open={openClientName} setOpen={setOpenClientName} onSaved={setClientName} />
    </>
  );
};

export default AccountTab;
