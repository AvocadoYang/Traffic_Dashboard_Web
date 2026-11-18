import {
  useBattery,
  useIsCarry,
  useIsCharging,
  useIsManual,
  useIsPause,
  useIsWorking,
  usePosIsAccurate,
  useStepCheck,
  useStepWaitMs,
} from "@/sockets/useAMRInfo";
import { STEP_WAIT_WARN_MS, formatWait } from "../stepWait";
import { errorHandler } from "@/utils/utils";
import { useMutation } from "@tanstack/react-query";
import { message } from "antd";
import client from "@/api/axiosClient";
import { memo } from "react";
import { ErrorResponse } from "@/utils/globalType";
import { useTranslation } from "react-i18next";
import { useMockInfo } from "@/sockets/useMockInfo";
import useMiRHasError from "@/sockets/useMiRHasError";
import { useMiRStatus } from "@/sockets/useMirStatus";
import styled from "styled-components";
import {
  AimOutlined,
  EnvironmentFilled,
  EnvironmentOutlined,
  SendOutlined,
} from "@ant-design/icons";

// 狀態標籤: 所有狀態都列出來, 成立的上色 (圖示 + 字), 沒成立的是外框 + 淡色字 (off)。
// 現場人員 / FAE 掃一眼卡片就知道「有哪些狀態、哪幾個亮著」; 要是沒成立的就不畫,
// 看不到某個標籤時分不出是「沒事」還是「這台車根本沒回報」。
// 「手動模式」在模擬模式下同時是切換按鈕, 沒開的時候一樣畫成外框樣式。
type ChipTone = "off" | "info" | "success" | "warning" | "danger" | "brown" | "purple" | "engine";

// 亮著 = 實心色塊 + 反白字 + 實心圖示; 沒亮 = 虛線外框 + 淡色字 + 線框圖示。
// 字色用 --c-bg (頁面底色): 色塊用的 -text 變數保證對 --c-bg 有 4.5:1, 所以字放在色塊上的對比度一樣,
// 淺色主題是白字、深色主題是深字, 不用每套主題各寫一份。
const CHIP_TONE: Record<ChipTone, { bg: string; text: string; border: string }> = {
  off: { bg: "transparent", text: "var(--c-text-muted)", border: "var(--c-border-strong)" },
  info: { bg: "var(--c-header-accent-text)", text: "var(--c-bg)", border: "var(--c-header-accent-text)" },
  success: { bg: "var(--c-success-text)", text: "var(--c-bg)", border: "var(--c-success-text)" },
  warning: { bg: "var(--c-warning-text)", text: "var(--c-bg)", border: "var(--c-warning-text)" },
  danger: { bg: "var(--c-danger)", text: "var(--c-bg)", border: "var(--c-danger)" },
  // 攜貨亮起: 棕色 (紙箱的顏色), 固定色, 不跟主題 (白字放在 #8a5a2b 上對比 5.9:1)
  brown: { bg: "#8a5a2b", text: "#ffffff", border: "#a8733f" },
  // 步驟等太久: 紫色 (排隊 / 等待的中性感, 跟紅綠琥珀藍棕都分得開), 固定色 (白字放在 #7a3fd1 上對比 6.1:1)
  purple: { bg: "#7a3fd1", text: "#ffffff", border: "#9566e0" },
  // 維修模式亮起: 儀表板的樣子 (深底 + 琥珀色引擎燈), 顏色是固定的, 不跟主題
  engine: { bg: "#1f1f1f", text: "#ffffff", border: "#f4ae48" },
};

const StatusChip = styled.span<{ $tone: ChipTone; $clickable?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px 2px 7px;
  border: 1px ${({ $tone }) => ($tone === "off" ? "dashed" : "solid")} ${({ $tone }) => CHIP_TONE[$tone].border};
  border-radius: 0;
  background: ${({ $tone }) => CHIP_TONE[$tone].bg};
  color: ${({ $tone }) => CHIP_TONE[$tone].text};
  font-family: var(--font-ui);
  font-size: var(--font-sm);
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "inherit")};

  /* 標籤前面的圖示 (跟字同色): 亮著用實心圖示, 沒亮用線框圖示, 不靠顏色也分得出亮不亮 */
  .anticon,
  .chip-icon {
    flex-shrink: 0;
    font-size: 13px;
    line-height: 0;
  }
  .chip-icon {
    width: 13px;
    height: 13px;
  }
`;

/** 貨箱 (等角立方體): 沒載貨是線框, 載貨時三個面用深淺不同的實心填滿 (antd 沒有像箱子的圖示, 自己畫) */
const BoxIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg className="chip-icon" viewBox="0 0 16 16" aria-hidden>
    {filled ? (
      <>
        <polygon points="8,1.2 14,4.6 8,8 2,4.6" fill="currentColor" />
        <polygon points="2,4.6 8,8 8,14.8 2,11.4" fill="currentColor" fillOpacity="0.62" />
        <polygon points="14,4.6 8,8 8,14.8 14,11.4" fill="currentColor" fillOpacity="0.82" />
      </>
    ) : (
      <>
        <polygon
          points="8,1.2 14,4.6 14,11.4 8,14.8 2,11.4 2,4.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <polyline points="2,4.6 8,8 14,4.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <line x1="8" y1="8" x2="8" y2="14.8" stroke="currentColor" strokeWidth="1.3" />
      </>
    )}
  </svg>
);

/**
 * 引擎燈 (儀表板上的 check engine, 維修模式): 外形是照真車的引擎燈圖描出來的輪廓 (viewBox 364×252),
 * 沒亮是淡灰色 (跟其他沒亮的標籤一樣), 亮著是真車引擎燈的琥珀色 (#F4AE48)。
 * 外加一圈同色細描邊, 把描出來的折角稍微磨圓。
 */
const ENGINE_PATH =
  "M94 0 L245 1 L249 6 L249 14 L245 19 L199 20 L198 35 L249 36 L254 43 L255 70 L288 70 L292 72 L295 78 L295 130 L309 130 L309 101 L314 96 L357 95 L363 100 L364 222 L359 226 L314 227 L307 220 L307 195 L295 195 L295 244 L289 252 L136 252 L91 209 L40 209 L35 205 L33 142 L20 143 L19 189 L12 194 L3 192 L0 188 L0 83 L2 80 L14 78 L19 82 L20 122 L34 122 L34 64 L39 58 L85 57 L85 42 L92 34 L139 34 L139 20 L94 20 L91 18 L88 8ZM107 55 L105 73 L99 78 L54 78 L54 188 L100 189 L145 232 L274 232 L274 182 L280 175 L321 175 L328 183 L328 206 L344 206 L343 116 L329 116 L329 145 L326 149 L321 151 L283 151 L278 149 L274 143 L274 90 L238 89 L234 84 L233 56Z";
export const ENGINE_LAMP_COLOR = "#F4AE48";
const EngineIcon: React.FC<{ lit: boolean }> = ({ lit }) => (
  <svg
    className="chip-icon"
    viewBox="0 0 364 252"
    aria-hidden
    style={{ width: 18, height: 13, color: lit ? ENGINE_LAMP_COLOR : undefined }}
  >
    <path
      d={ENGINE_PATH}
      fill="currentColor"
      fillRule="evenodd"
      stroke="currentColor"
      strokeWidth={7}
      strokeLinejoin="round"
    />
  </svg>
);

// ---- 儀表燈號風格的圖示 (照通用的車用儀表警示燈符號自己畫的向量, viewBox 16×16, 跟字同色) ----
// 亮著的筆畫比較粗 / 實心, 沒亮是細線框。

/** 手煞車燈 (P): 工作暫停 */
const ParkBrakeIcon: React.FC<{ lit: boolean }> = ({ lit }) => (
  <svg className="chip-icon" viewBox="0 0 16 16" aria-hidden>
    {lit ? (
      <>
      <path d="M3.4 3.2A6.4 6.4 0 0 0 3.4 12.8M12.6 3.2A6.4 6.4 0 0 1 12.6 12.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="8" cy="8" r="3.9" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6.9 10.5V5.5h1.6a1.5 1.5 0 0 1 0 3H6.9" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      </>
    ) : (
      <>
      <path d="M3.4 3.2A6.4 6.4 0 0 0 3.4 12.8M12.6 3.2A6.4 6.4 0 0 1 12.6 12.8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="8" cy="8" r="3.9" fill="none" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M6.9 10.5V5.5h1.6a1.5 1.5 0 0 1 0 3H6.9" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
      </>
    )}
  </svg>
);

/** 汽車電瓶燈 (方框加正負極): 低電量 */
const CarBatteryIcon: React.FC<{ lit: boolean }> = ({ lit }) => (
  <svg className="chip-icon" viewBox="0 0 16 16" aria-hidden>
    {lit ? (
      <>
      <rect x="1.8" y="5" width="12.4" height="8.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
      <rect x="3.6" y="3" width="2.4" height="2" fill="currentColor"/><rect x="10" y="3" width="2.4" height="2" fill="currentColor"/>
      <path d="M4.2 9.1h2.6M5.5 7.8v2.6M9.4 9.1h2.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </>
    ) : (
      <>
      <rect x="1.8" y="5" width="12.4" height="8.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <rect x="3.6" y="3" width="2.4" height="2" fill="currentColor"/><rect x="10" y="3" width="2.4" height="2" fill="currentColor"/>
      <path d="M4.2 9.1h2.6M5.5 7.8v2.6M9.4 9.1h2.6" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      </>
    )}
  </svg>
);

/** 電動車插頭: 充電中 */
const PlugIcon: React.FC<{ lit: boolean }> = ({ lit }) => (
  <svg className="chip-icon" viewBox="0 0 16 16" aria-hidden>
    {lit ? (
      <>
      <path d="M5.8 1.8v3.2M10.2 1.8v3.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M3.8 5h8.4v2.6a4.2 4.2 0 0 1-8.4 0z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M8 11.8v3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </>
    ) : (
      <>
      <path d="M5.8 1.8v3.2M10.2 1.8v3.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M3.8 5h8.4v2.6a4.2 4.2 0 0 1-8.4 0z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M8 11.8v3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </>
    )}
  </svg>
);

/** 主警告燈 (三角形驚嘆號): MiR 錯誤 */
const WarnTriangleIcon: React.FC<{ lit: boolean }> = ({ lit }) => (
  <svg className="chip-icon" viewBox="0 0 16 16" aria-hidden>
    {lit ? (
      <>
      <path fillRule="evenodd" fill="currentColor" d="M8 1.7 14.9 13.6H1.1zM7.25 5.9h1.5l-.25 4.1h-1zM8 10.9a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z"/>
      </>
    ) : (
      <>
      <path d="M8 2.2 14.2 13H1.8z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M8 6.2v3.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="8" cy="11.3" r=".8" fill="currentColor"/>
      </>
    )}
  </svg>
);

/** 煞車系統警告燈 (圓形驚嘆號): 要人確認 */
const BrakeWarnIcon: React.FC<{ lit: boolean }> = ({ lit }) => (
  <svg className="chip-icon" viewBox="0 0 16 16" aria-hidden>
    {lit ? (
      <>
      <path d="M3.4 3.2A6.4 6.4 0 0 0 3.4 12.8M12.6 3.2A6.4 6.4 0 0 1 12.6 12.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="8" cy="8" r="3.9" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 6v2.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="8" cy="10.1" r=".7" fill="currentColor"/>
      </>
    ) : (
      <>
      <path d="M3.4 3.2A6.4 6.4 0 0 0 3.4 12.8M12.6 3.2A6.4 6.4 0 0 1 12.6 12.8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="8" cy="8" r="3.9" fill="none" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 6v2.4" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/><circle cx="8" cy="10.1" r=".7" fill="currentColor"/>
      </>
    )}
  </svg>
);

/** 水溫過高 (溫度計泡在水波上): 步驟等太久 (等到過熱了) */
const CoolantIcon: React.FC<{ lit: boolean }> = ({ lit }) => (
  <svg className="chip-icon" viewBox="0 0 16 16" aria-hidden>
    {lit ? (
      <>
      <path d="M6.3 2.2a1.5 1.5 0 0 1 3 0v5.3a2.7 2.7 0 1 1-3 0z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" transform="translate(-0.8 0)"/>
      <circle cx="6.8" cy="9.4" r="1.3" fill="currentColor" transform="translate(0 0)"/>
      <path d="M10.6 3.6h1.6M10.6 5.6h1.6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M1.4 14.4c.9-.9 1.7-.9 2.6 0s1.7.9 2.6 0 1.7-.9 2.6 0 1.7.9 2.6 0 1.7-.9 2.6 0" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </>
    ) : (
      <>
      <path d="M6.3 2.2a1.5 1.5 0 0 1 3 0v5.3a2.7 2.7 0 1 1-3 0z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" transform="translate(-0.8 0)"/>
      <circle cx="6.8" cy="9.4" r="1.3" fill="currentColor" transform="translate(0 0)"/>
      <path d="M10.6 3.6h1.6M10.6 5.6h1.6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M1.4 14.4c.9-.9 1.7-.9 2.6 0s1.7.9 2.6 0 1.7-.9 2.6 0 1.7.9 2.6 0 1.7-.9 2.6 0" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </>
    )}
  </svg>
);

export const ManualTag: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { isManual } = useIsManual(amrId);
  const MiR_Status_IO = useMiRStatus(amrId);

  const { t } = useTranslation();
  const mockRobot = useMockInfo();
  const [messageApi, contextHolders] = message.useMessage();
  const changeManualMode = useMutation({
    mutationFn: (payload: { manual_mode: boolean; amrId: string }) => {
      return client.post("api/amr/set-simulate-isManual", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const isOn = amrId.includes("mi")
    ? MiR_Status_IO.status == "EmergencyStop" && !MiR_Status_IO.protectiveStop
    : Boolean(isManual);
  return (
    <>
      {contextHolders}
      <StatusChip
        $tone={isOn ? "engine" : "off"}
        $clickable={Boolean(mockRobot?.isSimulate)}
        onClick={(e) => {
          e.stopPropagation();
          if (!mockRobot?.isSimulate) return;
          changeManualMode.mutate({ manual_mode: isManual as boolean, amrId });
        }}
      >
        <EngineIcon lit={isOn} />
        {`${t("mode.manual_mode")}`}
      </StatusChip>
    </>
  );
});

export const MissionTag: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { isWorking } = useIsWorking(amrId);
  const { t } = useTranslation();
  return (
    <StatusChip $tone={isWorking ? "success" : "off"}>
      <SendOutlined />
      {`${t("mode.is_mission")}`}
    </StatusChip>
  );
});

/** 這一動等太久了: 提示可以考慮用「直接下一動」 */
export const StepWaitTag: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const stepWaitMs = useStepWaitMs(amrId);
  const { t } = useTranslation();
  if (stepWaitMs === null || stepWaitMs < STEP_WAIT_WARN_MS) return null;
  return (
    <StatusChip $tone="purple" title={t("amr_card.step_wait_hint")}>
      <CoolantIcon lit />
      {t("amr_card.step_wait", { time: formatWait(stepWaitMs) })}
    </StatusChip>
  );
});

/** 斷線重連後判斷不出這一動有沒有做完: 要人到現場確認, 再用卡片上的按鈕處理 */
export const StepCheckTag: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const stepCheck = useStepCheck(amrId);
  const { t } = useTranslation();
  if (!stepCheck) return null;
  return (
    <StatusChip
      $tone="danger"
      title={t("amr_card.step_check_hint", { reason: stepCheck.reason })}
    >
      <BrakeWarnIcon lit />
      {t("amr_card.step_check")}
    </StatusChip>
  );
});

export const CarryTag: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { isCarry } = useIsCarry(amrId);
  const { t } = useTranslation();
  return (
    <StatusChip $tone={isCarry ? "brown" : "off"}>
      <BoxIcon filled={Boolean(isCarry)} />
      {`${t("mode.is_carry")}`}
    </StatusChip>
  );
});

export const ChargingTag: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { isCharge } = useIsCharging(amrId);
  const { t } = useTranslation();
  return (
    <StatusChip $tone={isCharge ? "success" : "off"}>
      <PlugIcon lit={Boolean(isCharge)} />
      {`${t("mode.is_charge")}`}
    </StatusChip>
  );
});

export const PowerTag: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { battery } = useBattery(amrId);
  const { t } = useTranslation();
  return (
    <StatusChip $tone={(battery as number) < 25 ? "danger" : "off"}>
      <CarBatteryIcon lit={(battery as number) < 25} />
      {`${t("mode.low_power")}`}
    </StatusChip>
  );
});

export const IsPosAccurate: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { isPosAccurate } = usePosIsAccurate(amrId);
  const { t } = useTranslation();
  // 還沒收到回報 (離線) 是 undefined: 畫成沒亮起來的「定位正常」, 不要誤報成「定位不準」
  if (isPosAccurate === undefined) {
    return (
      <StatusChip $tone="off">
        <EnvironmentOutlined />
        {t("mode.positioning_normal")}
      </StatusChip>
    );
  }
  return (
    <StatusChip $tone={isPosAccurate ? "success" : "danger"}>
      {isPosAccurate ? <EnvironmentFilled /> : <AimOutlined />}
      {isPosAccurate ? t("mode.positioning_normal") : t("mode.positioning_inaccurate")}
    </StatusChip>
  );
});



export const IsPause: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { isPause } = useIsPause(amrId);
  const MiR_Status_IO= useMiRStatus(amrId);

  const { t } = useTranslation();
  const paused = amrId.includes("mi")
    ? MiR_Status_IO.status == "Pause" && !MiR_Status_IO.protectiveStop
    : Boolean(isPause);
  return (
    <StatusChip $tone={paused ? "danger" : "off"}>
      <ParkBrakeIcon lit={paused} />
      {t("mode.isPause")}
    </StatusChip>
  );
});

export const MiR_Error: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const MiR_Status_IO = useMiRStatus(amrId);
  const { t } = useTranslation();

  const hasError = MiR_Status_IO.status == "Error" && !MiR_Status_IO.protectiveStop;
  return (
    <StatusChip $tone={hasError ? "danger" : "off"}>
      <WarnTriangleIcon lit={hasError} />
      {t("mode.error")}
    </StatusChip>
  );
});
