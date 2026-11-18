import { FC, useState } from "react";
import { Popover, Tooltip } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { AMR_COLORS, textOnColor } from "@/utils/utils";

/*
 * 車輛識別色選擇: 從固定色盤 (AMR_COLORS) 挑一個, 或改回「自動」。
 * 只讓人挑色盤裡的顏色, 不開放任意色: 色盤保證白字放在色塊上對比夠、色相避開狀態色 (紅 / 綠 / 琥珀)。
 * 這顆顏色存在後端 (register_robot.display_color), 所有電腦看到的都一樣。
 */
const Swatch = styled.button<{ $color: string; $manual: boolean }>`
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  padding: 0 10px 0 4px;
  cursor: pointer;
  color: var(--c-text);
  background: var(--c-bg);
  border: 1px solid var(--c-border-strong);

  &::before {
    content: "";
    width: 18px;
    height: 18px;
    background: ${({ $color }) => $color};
    /* 自動分配的色塊畫成斜紋邊框, 跟手動指定的實心區分 */
    ${({ $manual, $color }) => ($manual ? "" : `outline: 1px dashed ${$color}; outline-offset: 2px;`)}
  }

  &:hover {
    border-color: var(--c-header-accent);
  }
  &:focus-visible {
    outline: 2px solid var(--c-header-accent);
    outline-offset: 2px;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 28px);
  gap: 6px;
  margin-bottom: 10px;
`;

const Cell = styled.button<{ $color: string; $on: boolean }>`
  all: unset;
  box-sizing: border-box;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: ${({ $color }) => $color};
  color: ${({ $color }) => textOnColor($color)};
  box-shadow: ${({ $on }) => ($on ? "0 0 0 2px var(--c-bg), 0 0 0 4px var(--c-text)" : "none")};

  &:hover {
    box-shadow: 0 0 0 2px var(--c-bg), 0 0 0 4px var(--c-header-accent);
  }
  &:focus-visible {
    outline: 2px solid var(--c-header-accent);
    outline-offset: 2px;
  }
`;

const AutoBtn = styled.button`
  all: unset;
  box-sizing: border-box;
  display: block;
  width: 100%;
  padding: 5px 10px;
  text-align: center;
  cursor: pointer;
  color: var(--c-text-secondary);
  border: 1px dashed var(--c-border-strong);

  &:hover {
    color: var(--c-header-accent);
    border-color: var(--c-header-accent);
  }
`;

const AmrColorPicker: FC<{
  /** 手動指定的顏色 (沒指定是 null) */
  manual: string | null | undefined;
  /** 現在實際用的顏色 (手動指定的, 或自動分配的) */
  effective: string;
  /** 色盤裡的某個顏色目前還有哪些車在用 (不含這台), 提示用 */
  usedBy: (color: string) => string[];
  onPick: (color: string | null) => void;
  disabled?: boolean;
}> = ({ manual, effective, usedBy, onPick, disabled }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = (manual ?? "").toLowerCase();

  const content = (
    <div>
      <Grid>
        {AMR_COLORS.map((c) => {
          const others = usedBy(c);
          return (
            <Tooltip
              key={c}
              title={others.length ? t("setting_amr.register_amr.color_used_by", { names: others.join(", ") }) : undefined}
            >
              <Cell
                type="button"
                $color={c}
                $on={current === c.toLowerCase()}
                aria-label={c}
                onClick={() => {
                  setOpen(false);
                  onPick(c);
                }}
              >
                {current === c.toLowerCase() ? <CheckOutlined /> : null}
              </Cell>
            </Tooltip>
          );
        })}
      </Grid>
      <AutoBtn
        type="button"
        onClick={() => {
          setOpen(false);
          onPick(null);
        }}
      >
        {t("setting_amr.register_amr.color_auto")}
      </AutoBtn>
    </div>
  );

  return (
    <Popover trigger="click" open={disabled ? false : open} onOpenChange={setOpen} content={content} placement="bottomLeft">
      <Swatch type="button" $color={effective} $manual={Boolean(manual)} disabled={disabled}>
        {manual ? effective.toUpperCase() : t("setting_amr.register_amr.color_auto")}
      </Swatch>
    </Popover>
  );
};

export default AmrColorPicker;
