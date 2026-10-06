import { FC, MouseEvent } from "react";
import styled, { css } from "styled-components";
import { LoginOutlined, LogoutOutlined } from "@ant-design/icons";
import {
  Cargo,
  PackageEntrySensor,
  PackageExitSensor,
} from "@/types/peripheral";

/** 入口 / 出口在畫面上的狀態 */
export type PackagePortView = {
  /** 派車選點位時: selectable = 現在可以選這一端, blocked = 不能選; 平常是 idle */
  state: "idle" | "selectable" | "blocked";
  disabled: boolean;
  /** 已經有任務要來這一端取 / 放 */
  booked: boolean;
  title: string;
  onClick?: (e: MouseEvent) => void;
};

/** 燈數超過這個數字時格子太窄,不顯示編號 */
const MAX_NUMBERED_LAMPS = 24;
/** 登記的貨最多畫幾個方塊,超過的用 +n 表示 */
const MAX_VISIBLE_CARGO = 16;

// 外框。外觀跟面板一致:平面底色、細框線、直角,顏色一律取主題的 CSS 變數,
// 換主題(含深色)會跟著變。尺寸維持 540x30,地圖上已經用位移 / 旋轉 / 縮放擺好的位置才不會跑掉。
const Frame = styled.div`
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 3px;
  width: 540px;
  height: 30px;
  padding: 3px;
  background: var(--c-bg);
  border: 1px solid var(--c-border-strong);
  border-radius: 2px;
`;

const Lamps = styled.div`
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: stretch;
  gap: 2px;
`;

// 一顆燈 = 線上一個位置的感測訊號。只代表「那個位置現在有沒有東西」,跟系統登記的貨無關。
// 亮燈用狀態色(綠),這顆不跟主題的色相走。
const Lamp = styled.div<{ $state: "on" | "off" | "unknown" }>`
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid;
  border-radius: 1px;
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  user-select: none;

  ${({ $state }) =>
    $state === "on"
      ? css`
          background: var(--c-success);
          border-color: var(--c-success);
          /* 淺色主題是白字,深色主題的綠比較亮,要反過來用深字 */
          color: var(--c-bg);
        `
      : $state === "off"
        ? css`
            background: var(--c-bg-muted);
            border-color: var(--c-border);
            color: var(--c-text-muted);
          `
        : css`
            /* 沒接訊號或訊號斷線:虛線空框,跟「確定沒東西」分開 */
            background: transparent;
            border-style: dashed;
            border-color: var(--c-border-strong);
            color: var(--c-text-muted);
          `}
`;

// 入口(放貨)和出口(取貨)。派車和看登記的貨都是點這兩端。
const Port = styled.button<{
  $state: PackagePortView["state"];
  $disabled: boolean;
  $booked: boolean;
  $missing?: boolean;
}>`
  position: relative;
  flex: 0 0 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 14px;
  line-height: 1;
  border-radius: 1px;
  background: var(--c-bg-subtle);
  border: 1px solid var(--c-border-strong);
  color: var(--c-text-secondary);
  cursor: pointer;
  opacity: ${({ $disabled }) => ($disabled ? 0.45 : 1)};

  &:hover {
    background: var(--c-bg-muted);
    color: var(--c-text);
  }

  ${({ $booked }) =>
    $booked &&
    css`
      background: var(--c-warning-soft);
      border-color: var(--c-warning);
      color: var(--c-warning);
    `}

  ${({ $state }) =>
    $state === "selectable" &&
    css`
      background: var(--c-header-accent-soft);
      border: 2px solid var(--c-header-accent);
      color: var(--c-header-accent);
    `}

  ${({ $state, $disabled }) =>
    ($state === "blocked" || $disabled) &&
    css`
      cursor: not-allowed;
    `}

  ${({ $state }) =>
    $state === "blocked" &&
    css`
      opacity: 0.35;
    `}

  ${({ $missing }) =>
    $missing &&
    css`
      background: transparent;
      border-style: dashed;
      color: var(--c-text-muted);
      cursor: default;
    `}
`;

// 系統登記在這條線上的貨,畫在外框上面那一排,跟下面的燈分開:
// 燈是感測器看到的,這一排是車放上來、還沒被取走的貨。
// 順序是先進先出,最靠近出口(右邊)的那一個會先被取走。
const CargoTrack = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 3px);
  height: 12px;
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  gap: 2px;
  /* 這一排蓋在地圖上,只有方塊和數字本身接滑鼠(看提示),空白的地方不擋後面的東西 */
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
`;

const CargoChip = styled.span<{ $next: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 1px;
  background: var(--c-accent);
  border: 1px solid var(--c-accent-hover);
  /* 下一個會被取走的那一筆外面多一圈 */
  outline: ${({ $next }) => ($next ? "1px solid var(--c-accent)" : "none")};
  outline-offset: 1px;
`;

const CargoCount = styled.span`
  margin-right: 3px;
  padding: 0 4px;
  background: var(--c-bg);
  border: 1px solid var(--c-border-strong);
  border-radius: 1px;
  color: var(--c-text);
  font-family: "Roboto Mono", monospace;
  font-size: 9px;
  font-weight: 700;
  line-height: 10px;
  white-space: nowrap;
`;

// 兩端的感測,疊在入口 / 出口按鈕角落的一顆小燈。沒有綁感測的線不畫。
// ok = 現在可以放 / 有貨可以取, hold = 入口有東西先不能放, idle = 出口還沒有貨, unknown = 訊號讀不到
type SensorTone = "ok" | "hold" | "idle" | "unknown";

const SensorDot = styled.span<{ $tone: SensorTone }>`
  position: absolute;
  top: -4px;
  right: -4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid var(--c-bg);

  ${({ $tone }) =>
    $tone === "ok"
      ? css`
          background: var(--c-success);
        `
      : $tone === "hold"
        ? css`
            background: var(--c-warning);
          `
        : $tone === "idle"
          ? css`
              background: var(--c-border-strong);
            `
          : css`
              background: var(--c-bg);
              border: 1px dashed var(--c-text-muted);
            `}
`;

const ENTRY_TONE: Record<PackageEntrySensor, SensorTone | null> = {
  NONE: null,
  CLEAR: "ok",
  OCCUPIED: "hold",
  UNKNOWN: "unknown",
};

const EXIT_TONE: Record<PackageExitSensor, SensorTone | null> = {
  NONE: null,
  READY: "ok",
  EMPTY: "idle",
  UNKNOWN: "unknown",
};

const lampState = (value: boolean | null) =>
  value === null ? "unknown" : value ? "on" : "off";

/** 按鈕的提示: 原本的說明下面多一行感測現在的狀態 */
const withSensor = (title: string, sensorTitle?: string) =>
  sensorTitle ? `${title}\n${sensorTitle}` : title;

/**
 * 包膜線在地圖上的樣子:左邊是入口(放貨),右邊是出口(取貨),中間一排燈是感測訊號,
 * 上面一排方塊是系統登記的貨。只負責畫,點了要做什麼由外面決定。
 */
const PackageStrip: FC<{
  lamps: (boolean | null)[];
  /** 依 placement_order 由小到大(先放的在前面) */
  cargo: Cargo[];
  /** 0 = 不限 */
  capacity: number;
  entry: PackagePortView;
  /** null = 這條線還沒指定出口 */
  exit: PackagePortView | null;
  missingExitTitle: string;
  cargoTitle: string;
  /** 兩端感測現在的狀態和說明; 沒有綁感測 (NONE) 或舊版後端沒送就不畫 */
  entrySensor?: PackageEntrySensor;
  exitSensor?: PackageExitSensor;
  entrySensorTitle?: string;
  exitSensorTitle?: string;
}> = ({
  lamps,
  cargo,
  capacity,
  entry,
  exit,
  missingExitTitle,
  cargoTitle,
  entrySensor,
  exitSensor,
  entrySensorTitle,
  exitSensorTitle,
}) => {
  const entryTone = entrySensor ? ENTRY_TONE[entrySensor] : null;
  const exitTone = exitSensor ? EXIT_TONE[exitSensor] : null;
  const showNumber = lamps.length <= MAX_NUMBERED_LAMPS;
  const visible = cargo.slice(0, MAX_VISIBLE_CARGO);
  const hidden = cargo.length - visible.length;

  return (
    <Frame>
      {cargo.length > 0 && (
        <CargoTrack>
          {visible.map((c, i) => (
            <CargoChip
              key={c.cargoInfoId ?? i}
              $next={i === 0}
              title={c.customId ?? undefined}
            />
          ))}
          <CargoCount title={cargoTitle}>
            {hidden > 0 ? `+${hidden} ` : ""}
            {capacity > 0 ? `${cargo.length}/${capacity}` : cargo.length}
          </CargoCount>
        </CargoTrack>
      )}

      <Port
        type="button"
        title={withSensor(
          entry.title,
          entryTone ? entrySensorTitle : undefined,
        )}
        $state={entry.state}
        $disabled={entry.disabled}
        $booked={entry.booked}
        onClick={entry.onClick}
      >
        <LoginOutlined />
        {entryTone && <SensorDot $tone={entryTone} />}
      </Port>

      <Lamps>
        {lamps.map((value, i) => (
          <Lamp key={i} $state={lampState(value)}>
            {showNumber ? i + 1 : null}
          </Lamp>
        ))}
      </Lamps>

      {exit ? (
        <Port
          type="button"
          title={withSensor(exit.title, exitTone ? exitSensorTitle : undefined)}
          $state={exit.state}
          $disabled={exit.disabled}
          $booked={exit.booked}
          onClick={exit.onClick}
        >
          <LogoutOutlined />
          {exitTone && <SensorDot $tone={exitTone} />}
        </Port>
      ) : (
        <Port
          type="button"
          title={missingExitTitle}
          $state="idle"
          $disabled={false}
          $booked={false}
          $missing
        >
          <LogoutOutlined />
        </Port>
      )}
    </Frame>
  );
};

export default PackageStrip;

// 出口那個點位自己在地圖上的圖示(一個小方塊),外觀跟燈條兩端的按鈕一樣
export const PackagePortIcon = styled(Port)`
  flex: none;
  width: 24px;
  height: 24px;
`;
