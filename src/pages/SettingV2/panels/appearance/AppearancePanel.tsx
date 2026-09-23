import { FC } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { CheckOutlined } from "@ant-design/icons";
import {
  PanelShell,
  Section,
  SectionTitle,
  Hint,
} from "../../ui/primitives";
import { c, font, space, mqNarrow } from "../../ui/tokens";
import {
  themes,
  currentThemeIdAtom,
  setThemeAtom,
  type Theme,
} from "@/theme";

const ThemeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: ${space.md};

  ${mqNarrow} {
    grid-template-columns: 1fr;
  }
`;

const ThemeCard = styled.button<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${space.sm};
  padding: ${space.md};
  cursor: pointer;
  text-align: left;
  font-family: ${font.mono};
  background: ${c.bg};
  /* 選中的用兩層框(外框 + inset)取代填色,才不會蓋掉卡片本身的配色預覽 */
  border: 1px solid ${({ $selected }) => ($selected ? c.accent : c.border)};
  box-shadow: ${({ $selected }) =>
    $selected ? `inset 0 0 0 1px ${c.accent}` : "none"};
  transition: border-color 0.15s ease;

  &:hover {
    border-color: ${c.accent};
  }
`;

const CardHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.sm};
  font-size: ${font.sm};
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: ${c.text};

  .anticon {
    color: ${c.accent};
  }
`;

const ModeTag = styled.span`
  font-size: ${font.xs};
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: ${c.textMuted};
`;

/**
 * 主題預覽。刻意不吃 CSS 變數、直接用該主題的真實色碼,
 * 否則每張卡片都會長得跟「目前」的主題一樣,等於沒有預覽。
 */
const Preview = styled.div<{ $theme: Theme }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: ${space.sm};
  border: 1px solid ${({ $theme }) => $theme.colors.border};
  background: ${({ $theme }) => $theme.colors.bgSubtle};
`;

const PreviewBar = styled.div<{ $theme: Theme }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  background: ${({ $theme }) => $theme.colors.bg};
  border: 1px solid ${({ $theme }) => $theme.colors.border};
`;

const PreviewText = styled.span<{ $color: string; $size?: string }>`
  font-size: ${({ $size }) => $size ?? font.xs};
  color: ${({ $color }) => $color};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PreviewButton = styled.span<{ $theme: Theme }>`
  margin-left: auto;
  flex-shrink: 0;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  background: ${({ $theme }) => $theme.colors.accent};
  color: ${({ $theme }) => $theme.colors.onAccent};
`;

const Swatches = styled.div`
  display: flex;
  gap: 4px;
`;

const Swatch = styled.span<{ $color: string; $border: string }>`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  background: ${({ $color }) => $color};
  border: 1px solid ${({ $border }) => $border};
`;

/**
 * 外觀設定:讓使用者自己挑一套配色。
 *
 * 選到的 id 存在 localStorage,套用方式是換掉 <html> 上的 CSS 變數,
 * 所以整個設定頁(以及共用的 Header)會即時跟著變,不需要重新整理。
 */
const AppearancePanel: FC = () => {
  const { t } = useTranslation();
  const currentId = useAtomValue(currentThemeIdAtom);
  const setTheme = useSetAtom(setThemeAtom);

  return (
    <PanelShell>
      <Section>
        <SectionTitle>
          <CheckOutlined />
          {t("appearance.theme")}
        </SectionTitle>

        <Hint>{t("appearance.hint")}</Hint>

        <ThemeGrid>
          {themes.map((theme) => {
            const selected = theme.id === currentId;
            return (
              <ThemeCard
                key={theme.id}
                type="button"
                $selected={selected}
                aria-pressed={selected}
                onClick={() => setTheme(theme.id)}
              >
                <CardHead>
                  <span>{t(theme.labelKey as never)}</span>
                  {selected ? (
                    <CheckOutlined />
                  ) : (
                    <ModeTag>{t(`appearance.mode.${theme.mode}`)}</ModeTag>
                  )}
                </CardHead>

                <Preview $theme={theme}>
                  <PreviewBar $theme={theme}>
                    <PreviewText
                      $color={theme.colors.text}
                      $size={font.sm}
                    >
                      Aa
                    </PreviewText>
                    <PreviewText $color={theme.colors.textSecondary}>
                      {t("appearance.preview_label")}
                    </PreviewText>
                    <PreviewButton $theme={theme}>
                      {t("appearance.preview_action")}
                    </PreviewButton>
                  </PreviewBar>

                  <Swatches>
                    {[
                      theme.colors.accent,
                      theme.colors.bgMuted,
                      theme.colors.borderStrong,
                      theme.colors.textSecondary,
                      theme.colors.danger,
                    ].map((color, i) => (
                      <Swatch
                        key={i}
                        $color={color}
                        $border={theme.colors.border}
                      />
                    ))}
                  </Swatches>
                </Preview>
              </ThemeCard>
            );
          })}
        </ThemeGrid>

        <Hint>{t("appearance.scope_note")}</Hint>
      </Section>
    </PanelShell>
  );
};

export default AppearancePanel;
