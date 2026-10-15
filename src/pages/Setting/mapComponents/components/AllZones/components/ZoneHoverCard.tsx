import { FC, ReactNode } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { useSetAtom } from "jotai";
import { showZoneForbidden } from "@/utils/gloable";
import { amrId2ColorRainbow } from "@/utils/utils";
import useZoneOccupants from "@/api/useZoneOccupants";
import { c, font, space } from "@/pages/SettingV2/ui/tokens";
import { PoweroffOutlined, StopOutlined } from "@ant-design/icons";

export type ZoneHoverInfo = {
  id: string;
  name: string;
  category: string[];
  backgroundColor: string;
  disabled?: boolean;
  tagSetting?: {
    speed_limit?: number | null;
    hight_limit?: number | null;
    forbidden_car?: (string | undefined)[];
    limitNum?: number | null;
    view_available?: number | string | null;
    elevator_id?: string | null;
  };
};

type Tone = "neutral" | "warning" | "danger";

/** 區域分類 → 顯示文字的 i18n key 與標籤色調 */
const ZONE_TYPES = {
  減速區: { labelKey: "edit_zone_panel.deceleration_zone", tone: "warning" },
  限高區: { labelKey: "edit_zone_panel.height_limit_zone", tone: "warning" },
  禁止區: { labelKey: "edit_zone_panel.restricted_zone", tone: "danger" },
  限制區: { labelKey: "edit_zone_panel.controlled_zone", tone: "neutral" },
  查看區: { labelKey: "edit_zone_panel.view_available_zone", tone: "neutral" },
  電梯區: { labelKey: "edit_zone_panel.elevator_zone", tone: "neutral" },
} as const satisfies Record<string, { labelKey: string; tone: Tone }>;

const toneColors: Record<Tone, { fg: string; bg: string; border: string }> = {
  neutral: { fg: c.text, bg: c.bgSubtle, border: c.borderStrong },
  warning: { fg: c.warning, bg: c.warningSoft, border: c.warning },
  danger: { fg: c.danger, bg: c.dangerSoft, border: c.danger },
};

const toOpaque = (color: string) => {
  const rgb = color.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (!rgb) return color;
  const [, r, g, b] = rgb;
  return `rgb(${r}, ${g}, ${b})`;
};

const Card = styled.div`
  width: 260px;
  font-family: ${font.mono};
  color: ${c.text};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.sm};
  padding: ${space.md} ${space.lg};
  border-bottom: 1px solid ${c.border};
  font-size: ${font.md};
  font-weight: 700;
  word-break: break-all;
`;

const HeaderName = styled.span`
  flex: 1;
  min-width: 0;
`;

const ToggleButton = styled.button<{ $enable: boolean }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  font-family: ${font.mono};
  font-size: ${font.xs};
  font-weight: 600;
  letter-spacing: 0.5px;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: ${({ $enable }) => ($enable ? c.onAccent : c.danger)};
  background: ${({ $enable }) => ($enable ? c.accent : c.bg)};
  border: 1px solid ${({ $enable }) => ($enable ? c.accent : c.danger)};

  &:hover:not(:disabled) {
    background: ${({ $enable }) => ($enable ? c.accentHover : c.dangerSoft)};
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

const DisabledBanner = styled.div`
  display: flex;
  gap: ${space.sm};
  padding: ${space.sm} ${space.lg};
  font-size: ${font.xs};
  line-height: 1.5;
  color: ${c.textSecondary};
  background: repeating-linear-gradient(
    135deg,
    ${c.bgMuted} 0 6px,
    ${c.bgSubtle} 6px 12px
  );
  border-bottom: 1px solid ${c.border};

  .anticon {
    margin-top: 2px;
    color: ${c.textMuted};
  }
`;

const Swatch = styled.span<{ $color: string }>`
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  background: ${({ $color }) => $color};
`;

const Block = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.sm};
  padding: ${space.md} ${space.lg};

  & + & {
    border-top: 1px solid ${c.border};
  }
`;

const BlockTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: ${font.xs};
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: ${c.textMuted};
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${space.xs};
`;

const Chip = styled.span<{ $tone: Tone }>`
  padding: 1px 8px;
  font-size: ${font.xs};
  font-weight: 600;
  white-space: nowrap;
  color: ${({ $tone }) => toneColors[$tone].fg};
  background: ${({ $tone }) => toneColors[$tone].bg};
  border: 1px solid ${({ $tone }) => toneColors[$tone].border};
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${space.md};
  font-size: ${font.sm};

  > span:first-child {
    color: ${c.textSecondary};
  }
  > span:last-child {
    font-weight: 600;
    text-align: right;
    word-break: break-all;
  }
`;

const LinkButton = styled.button`
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-weight: 600;
  color: ${c.text};
  text-decoration: underline;
  cursor: pointer;
`;

const AmrList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${space.xs};
  max-height: 160px;
  overflow-y: auto;
`;

const AmrItem = styled.li`
  display: flex;
  align-items: center;
  gap: ${space.sm};
  padding: ${space.xs} ${space.sm};
  font-size: ${font.sm};
  font-weight: 600;
  background: ${c.bgSubtle};
  border: 1px solid ${c.border};
`;

const Dot = styled.span<{ $color: string }>`
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

const Muted = styled.div`
  font-size: ${font.sm};
  color: ${c.textMuted};
`;

const Count = styled.span<{ $full: boolean }>`
  font-size: ${font.sm};
  color: ${({ $full }) => ($full ? c.danger : c.text)};
`;

/** 地圖上區域名稱 hover 時的資訊卡: 區域類型、各類型的設定、目前記錄在裡面的車 */
const ZoneHoverCard: FC<{
  info: ZoneHoverInfo;
  open: boolean;
  toggling?: boolean;
  onToggleEnabled?: (enabled: boolean) => void;
}> = ({ info, open, toggling, onToggleEnabled }) => {
  const { t } = useTranslation();
  const setZoneForbidden = useSetAtom(showZoneForbidden);
  const { data: occupants, isLoading } = useZoneOccupants(open);

  const { category, tagSetting } = info;
  const disabled = !!info.disabled;
  const has = (tag: string) => category.includes(tag);
  const amrIds = [...(occupants?.[info.id] ?? [])].sort();
  const limitNum = has("限制區") ? tagSetting?.limitNum : null;
  const forbidden = (tagSetting?.forbidden_car ?? []).filter(
    (v): v is string => !!v,
  );

  const settings: [string, ReactNode][] = [];
  if (has("減速區")) {
    settings.push([
      t("edit_zone_panel.highest_speed"),
      `${tagSetting?.speed_limit ?? "-"} m/s`,
    ]);
  }
  if (has("限高區")) {
    settings.push([
      t("edit_zone_panel.hight_limit"),
      `${tagSetting?.hight_limit ?? "-"} m`,
    ]);
  }
  if (has("限制區")) {
    settings.push([t("edit_zone_panel.limit_count"), limitNum ?? "-"]);
  }
  if (has("查看區")) {
    settings.push([
      t("edit_zone_panel.view_available"),
      tagSetting?.view_available ?? "-",
    ]);
  }
  if (has("電梯區")) {
    settings.push([
      t("edit_zone_panel.elevator_id"),
      tagSetting?.elevator_id ?? "-",
    ]);
  }
  if (has("禁止區")) {
    settings.push([
      t("edit_zone_panel.forbidden_vehicle"),
      forbidden.length === 0 ? (
        t("edit_zone_panel.free_zone")
      ) : forbidden.includes("*") ? (
        t("edit_zone_panel.all_vehicle_forbidden")
      ) : (
        <LinkButton
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setZoneForbidden(new Set(forbidden));
          }}
        >
          {t("zone_hover.highlight_forbidden", { count: forbidden.length })}
        </LinkButton>
      ),
    ]);
  }

  return (
    <Card>
      <Header>
        <Swatch
          $color={disabled ? c.textMuted : toOpaque(info.backgroundColor)}
        />
        <HeaderName>{info.name}</HeaderName>
        {onToggleEnabled && (
          <ToggleButton
            type="button"
            $enable={disabled}
            disabled={toggling}
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnabled(disabled);
            }}
          >
            {disabled ? <PoweroffOutlined /> : <StopOutlined />}
            {t(disabled ? "zone_enable.enable" : "zone_enable.disable")}
          </ToggleButton>
        )}
      </Header>

      {disabled && (
        <DisabledBanner>
          <StopOutlined />
          <span>{t("zone_enable.disabled_banner")}</span>
        </DisabledBanner>
      )}

      <Block>
        <BlockTitle>{t("zone_hover.zone_type")}</BlockTitle>
        <Chips>
          {category.length ? (
            category.map((tag) => {
              const type: (typeof ZONE_TYPES)[keyof typeof ZONE_TYPES] | undefined =
                ZONE_TYPES[tag as keyof typeof ZONE_TYPES];
              return (
                <Chip key={tag} $tone={type?.tone ?? "neutral"}>
                  {type ? t(type.labelKey) : tag}
                </Chip>
              );
            })
          ) : (
            <Chip $tone="neutral">{t("zone_hover.general_zone")}</Chip>
          )}
        </Chips>
        {settings.map(([label, value]) => (
          <Row key={label}>
            <span>{label}</span>
            <span>{value}</span>
          </Row>
        ))}
      </Block>

      <Block>
        <BlockTitle>
          <span>{t("zone_hover.amrs_in_zone")}</span>
          <Count $full={limitNum != null && amrIds.length >= limitNum}>
            {limitNum != null
              ? `${amrIds.length} / ${limitNum}`
              : amrIds.length}
          </Count>
        </BlockTitle>
        {isLoading && !occupants ? (
          <Muted>{t("zone_hover.loading")}</Muted>
        ) : amrIds.length ? (
          <AmrList>
            {amrIds.map((amrId) => (
              <AmrItem key={amrId}>
                <Dot $color={amrId2ColorRainbow(amrId)} />
                {amrId}
              </AmrItem>
            ))}
          </AmrList>
        ) : (
          <Muted>{t("zone_hover.no_amr")}</Muted>
        )}
      </Block>
    </Card>
  );
};

export default ZoneHoverCard;
