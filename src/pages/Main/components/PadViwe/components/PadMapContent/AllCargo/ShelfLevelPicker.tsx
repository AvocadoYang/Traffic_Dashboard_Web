import { FC } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { prefixLevelName } from "@/utils/globalFunction";

export type PickMode = "load" | "offload";

export type PickLevel = {
  level: number;
  levelName: string;
  hasCargo: boolean;
  disable: boolean;
  booker: string | null;
};

const MODE_COLOR: Record<PickMode, { main: string; bg: string }> = {
  // bg 是滑到那一層時的淡底,用半透明才能同時疊在淺色跟深色的面板上
  load: { main: "#1890ff", bg: "#1890ff1f" },
  offload: { main: "#52c41a", bg: "#52c41a1f" },
};

export const getModeColor = (mode: PickMode) => MODE_COLOR[mode];

// 取貨(load)要有貨、放貨(offload)要是空的，停用的儲位一律不能選
export const isLevelSelectable = (
  mode: PickMode | null,
  hasCargo: boolean,
  disable: boolean,
) => {
  if (disable || mode === null) return false;
  return mode === "load" ? hasCargo : !hasCargo;
};

const Panel = styled.div`
  width: 220px;
  font-family: "Roboto Mono", monospace;
`;

const Header = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 2px solid ${({ $color }) => $color};
  font-size: 13px;
  font-weight: 700;
  color: var(--c-text);
`;

const ModeTag = styled.span<{ $color: string }>`
  padding: 1px 8px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
  color: #fff;
  font-size: 11px;
  letter-spacing: 1px;
`;

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Row = styled.button<{
  $selectable: boolean;
  $color: string;
  $bg: string;
}>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 6px 10px;
  text-align: left;
  font-family: inherit;
  background: ${({ $selectable }) =>
    $selectable ? "var(--c-bg)" : "var(--c-bg-subtle)"};
  border: 2px solid
    ${({ $selectable, $color }) => ($selectable ? $color : "var(--c-border)")};
  border-radius: 4px;
  cursor: ${({ $selectable }) => ($selectable ? "pointer" : "not-allowed")};
  opacity: ${({ $selectable }) => ($selectable ? 1 : 0.55)};
  transition:
    background 0.15s,
    box-shadow 0.15s;

  &:hover {
    background: ${({ $selectable, $bg }) =>
      $selectable ? $bg : "var(--c-bg-subtle)"};
    box-shadow: ${({ $selectable, $color }) =>
      $selectable ? `0 0 0 3px ${$color}33` : "none"};
  }

  &:focus-visible {
    outline: 2px solid ${({ $color }) => $color};
    outline-offset: 2px;
  }
`;

const LevelBadge = styled.span<{ $color: string; $active: boolean }>`
  flex-shrink: 0;
  min-width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: ${({ $active, $color }) => ($active ? $color : "var(--c-border-strong)")};
  color: #fff;
  font-size: 13px;
  font-weight: 700;
`;

const Body = styled.span`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
`;

const Name = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Sub = styled.span<{ $warn?: boolean }>`
  font-size: 11px;
  color: ${({ $warn }) => ($warn ? "var(--c-danger)" : "var(--c-text-muted)")};
`;

const CargoTag = styled.span<{ $hasCargo: boolean }>`
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ $hasCargo }) =>
    $hasCargo ? "#ad6800" : "var(--c-text-secondary)"};
  background: ${({ $hasCargo }) =>
    $hasCargo ? "#ffe73c80" : "var(--c-bg-muted)"};
  border: 1px solid
    ${({ $hasCargo }) => ($hasCargo ? "#faad14" : "var(--c-border-strong)")};

  /* 深色面板上半透明的黃會變成暗橄欖色,原本的棕字看不到,有貨時改用亮黃。
     「祖先 &」這種選擇器 styled-components 會套在元件共用的 class 上,
     裡面直接寫跟 props 有關的值,每個標籤都會拿到同一個,所以先存成變數再取。 */
  --tag-color-on-dark: ${({ $hasCargo }) =>
    $hasCargo ? "#ffe73c" : "var(--c-text-secondary)"};

  [data-theme-mode="dark"] & {
    color: var(--tag-color-on-dark);
  }
`;

const Hint = styled.div`
  margin-top: 8px;
  font-size: 11px;
  color: var(--c-text-muted);
`;

const ShelfLevelPicker: FC<{
  locId: string;
  mode: PickMode;
  levels: PickLevel[];
  onSelect: (level: number) => void;
  onHover: (level: number | null) => void;
}> = ({ locId, mode, levels, onSelect, onHover }) => {
  const { t } = useTranslation();
  const color = MODE_COLOR[mode];

  // 最高層放最上面，跟實體貨架的上下方向一致
  const sorted = [...levels].sort((a, b) => b.level - a.level);

  const getReason = (l: PickLevel) => {
    if (l.disable) return t("main.quick_mission.picker_reason_disabled");
    if (mode === "load" && !l.hasCargo)
      return t("main.quick_mission.picker_reason_no_cargo");
    if (mode === "offload" && l.hasCargo)
      return t("main.quick_mission.picker_reason_occupied");
    return null;
  };

  return (
    <Panel onMouseLeave={() => onHover(null)}>
      <Header $color={color.main}>
        <span>
          {t("main.quick_mission.picker_shelf")} {locId}
        </span>
        <ModeTag $color={color.main}>{t(`main.quick_mission.${mode}`)}</ModeTag>
      </Header>

      <Rows>
        {sorted.map((l) => {
          const selectable = isLevelSelectable(mode, l.hasCargo, l.disable);
          const reason = getReason(l);
          const booked = l.booker && l.booker !== "none" ? l.booker : null;

          return (
            <Row
              key={l.level}
              type="button"
              $selectable={selectable}
              $color={color.main}
              $bg={color.bg}
              aria-disabled={!selectable}
              onClick={() => selectable && onSelect(l.level)}
              onMouseEnter={() => onHover(l.level)}
            >
              <LevelBadge $color={color.main} $active={selectable}>
                {l.level + 1}
              </LevelBadge>
              <Body>
                <Name>
                  {prefixLevelName(l.levelName) ||
                    t("main.quick_mission.picker_level", { n: l.level + 1 })}
                </Name>
                {reason ? (
                  <Sub $warn>{reason}</Sub>
                ) : booked ? (
                  <Sub>
                    {t("main.quick_mission.picker_booked_by", { name: booked })}
                  </Sub>
                ) : null}
              </Body>
              <CargoTag $hasCargo={l.hasCargo}>
                {l.hasCargo
                  ? t("main.quick_mission.picker_has_cargo")
                  : t("main.quick_mission.picker_empty")}
              </CargoTag>
            </Row>
          );
        })}
      </Rows>

      <Hint>
        {mode === "load"
          ? t("main.quick_mission.picker_hint_load")
          : t("main.quick_mission.picker_hint_offload")}
      </Hint>
    </Panel>
  );
};

export default ShelfLevelPicker;
