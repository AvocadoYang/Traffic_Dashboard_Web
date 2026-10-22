import { FC } from "react";
import { Button, Segmented, Select, Space, Switch, Tag, message } from "antd";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { HOME_PAGES, MapLayerPrefs, useMyProfile, useSaveProfile } from "@/api/useProfile";
import {
  currentThemeIdAtom,
  fontScaleAtom,
  FONT_SCALE_STEPS,
  setThemeAtom,
  themes,
  type ThemeId,
} from "@/theme";
import { Section, SettingRow } from "./parts";

/** 地圖圖層的預設值 (沒存過偏好時首頁的樣子) */
export const DEFAULT_LAYERS: Required<MapLayerPrefs> = {
  location: true,
  road: true,
  pointCloud: true,
  annotation: true,
  zones: true,
};

const LAYER_KEYS: (keyof MapLayerPrefs)[] = ["location", "road", "pointCloud", "annotation", "zones"];

export const IDLE_LOGOUT_OPTIONS = [0, 5, 10, 15, 30, 60, 120, 240];

/**
 * 個人偏好: 存在帳號上, 換電腦登入也一樣。
 * 主題、語言、字體在別的地方改 (header、外觀設定) 也會存回來 (UserSession)。
 */
const PreferencesTab: FC = () => {
  const { t, i18n } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: profile } = useMyProfile();
  const save = useSaveProfile();
  const themeId = useAtomValue(currentThemeIdAtom);
  const setTheme = useSetAtom(setThemeAtom);
  const [fontScale, setFontScale] = useAtom(fontScaleAtom);
  const prefs = profile?.preferences ?? {};
  const layers = { ...DEFAULT_LAYERS, ...prefs.map?.layers };
  const view = prefs.map?.view ?? null;

  const savePrefs = (patch: Parameters<typeof save.mutate>[0]) =>
    save.mutate(patch, {
      onSuccess: () => void messageApi.success(t("profile.saved")),
      onError: () => void messageApi.error(t("profile.save_failed")),
    });

  return (
    <>
      {contextHolder}
      <Section title={t("profile.prefs.general")}>
        <SettingRow label={t("profile.prefs.home_page")} help={t("profile.prefs.home_page_help")}>
          <Select
            style={{ width: "100%", maxWidth: 320 }}
            value={prefs.homePage ?? "/"}
            onChange={(homePage) => savePrefs({ preferences: { homePage } })}
            options={HOME_PAGES.map((p) => ({ value: p, label: t(`profile.pages.${pageKey(p)}` as never) }))}
          />
        </SettingRow>
        <SettingRow label={t("profile.prefs.language")}>
          <Segmented
            value={i18n.language === "en" ? "en" : "tw"}
            onChange={(v) => void i18n.changeLanguage(String(v))}
            options={[
              { value: "tw", label: "中文" },
              { value: "en", label: "English" },
            ]}
          />
        </SettingRow>
        <SettingRow label={t("profile.prefs.theme")} help={t("profile.prefs.theme_help")}>
          <Select
            style={{ width: "100%", maxWidth: 320 }}
            value={themeId}
            onChange={(id: ThemeId) => setTheme(id)}
            options={themes.map((th) => ({
              value: th.id,
              label: (
                <Space size={6}>
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      background: th.colors.headerAccent,
                      border: `1px solid ${th.colors.border}`,
                    }}
                  />
                  {t(th.labelKey as never)}
                  <Tag style={{ marginInlineEnd: 0 }}>{t(`appearance.mode.${th.mode}` as never)}</Tag>
                </Space>
              ),
            }))}
          />
        </SettingRow>
        <SettingRow label={t("profile.prefs.font_size")} help={t("profile.prefs.font_size_help")}>
          <Segmented
            value={closestStep(fontScale)}
            onChange={(v) => setFontScale(Number(v))}
            options={FONT_SCALE_STEPS.map((s) => ({
              value: s,
              label: t(`profile.prefs.font_${String(s).replace(".", "_")}` as never),
            }))}
          />
        </SettingRow>
      </Section>

      <Section title={t("profile.prefs.map")} hint={t("profile.prefs.map_hint")}>
        {LAYER_KEYS.map((key) => (
          <SettingRow key={key} label={t(`profile.prefs.layer.${key}` as never)}>
            <Switch
              checked={layers[key]}
              onChange={(checked) =>
                savePrefs({ preferences: { map: { layers: { ...layers, [key]: checked } } } })
              }
            />
          </SettingRow>
        ))}
        <SettingRow label={t("profile.prefs.default_view")} help={t("profile.prefs.default_view_help")}>
          {view ? (
            <Space wrap>
              <Tag color="blue">{t("profile.prefs.view_saved", { scale: Math.round(view.scale * 100) })}</Tag>
              <Button size="small" onClick={() => savePrefs({ preferences: { map: { view: null } } })}>
                {t("profile.prefs.view_clear")}
              </Button>
            </Space>
          ) : (
            <Tag>{t("profile.prefs.view_none")}</Tag>
          )}
        </SettingRow>
      </Section>

      <Section title={t("profile.prefs.session")}>
        <SettingRow label={t("profile.prefs.idle_logout")} help={t("profile.prefs.idle_logout_help")}>
          <Select
            style={{ width: "100%", maxWidth: 220 }}
            value={prefs.idleLogoutMinutes ?? 0}
            onChange={(idleLogoutMinutes) => savePrefs({ preferences: { idleLogoutMinutes } })}
            options={IDLE_LOGOUT_OPTIONS.map((m) => ({
              value: m,
              label: m === 0 ? t("profile.prefs.idle_never") : t("profile.prefs.idle_minutes", { count: m }),
            }))}
          />
        </SettingRow>
      </Section>
    </>
  );
};

/** 翻譯 key 用: "/" -> home, "/setting-v3" -> setting_v3 */
export const pageKey = (path: string) => (path === "/" ? "home" : path.slice(1).replace(/-/g, "_"));

const closestStep = (scale: number) =>
  FONT_SCALE_STEPS.reduce((best, s) => (Math.abs(s - scale) < Math.abs(best - scale) ? s : best), 1 as number);

export default PreferencesTab;
