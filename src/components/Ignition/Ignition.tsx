import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAtom } from "jotai";
import styled, { css, keyframes } from "styled-components";
import { useTranslation } from "react-i18next";
import { ignitionAtom } from "./ignitionState";

/**
 * 登入成功後的「點火」轉場:
 *   1. 全黑畫面, KENMEC 字樣從模糊收攏成形, 一道光掃過字面, 下方是系統名稱和歡迎詞
 *   2. 中間一道紅白光條往兩側展開, 黑幕從中心像車燈一樣打開, 露出底下已經載好的頁面
 * 點一下或按任意鍵可以略過。掛在 App 最外層 (換頁不會被卸載), 由 ignitionAtom 觸發。
 */

// 時間軸 (ms)
const OUT_AT = 1900; // 字樣淡出, 光條展開 (等字面的掃光跑完)
const IRIS_DELAY = 150; // 淡出後多久開始揭幕
const IRIS_MS = 750;

const RED = "#e2231a";
const FONT = `"Inter", "Segoe UI", "Helvetica Neue", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;

// ---------------------------------------------------------------- 中間的字樣

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const wordIn = keyframes`
  from { opacity: 0; letter-spacing: 0.9em; margin-right: -0.9em; filter: blur(8px); }
  to { opacity: 1; letter-spacing: 0.42em; margin-right: -0.42em; filter: blur(0); }
`;
const shine = keyframes`from { background-position: 100% 0; } to { background-position: 0% 0; }`;
const grow = keyframes`from { transform: scaleX(0); } to { transform: scaleX(1); }`;
const fadeUp = keyframes`from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); }`;

const Brand = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  min-width: 0;

  .wordmark {
    font: 300 clamp(34px, 5.4vw, 84px) / 1 ${FONT};
    letter-spacing: 0.42em;
    margin-right: -0.42em; /* 字距加在每個字後面, 扣掉最後一個才會置中 */
    white-space: nowrap;
    color: transparent;
    background: linear-gradient(
      100deg,
      #b9bec5 0%,
      #e9ecef 38%,
      #ffffff 47%,
      #ff5340 50%,
      #ffffff 53%,
      #e9ecef 62%,
      #b9bec5 100%
    );
    background-size: 320% 100%;
    background-position: 100% 0;
    -webkit-background-clip: text;
    background-clip: text;
    animation:
      ${wordIn} 1s 80ms cubic-bezier(0.2, 0.7, 0.2, 1) both,
      ${shine} 1s 800ms cubic-bezier(0.4, 0, 0.2, 1) both;
  }
  .line {
    height: 2px;
    width: min(70%, 380px);
    background: linear-gradient(90deg, transparent, ${RED} 30%, #ff8a7a 50%, ${RED} 70%, transparent);
    box-shadow: 0 0 12px rgba(226, 35, 26, 0.6);
    transform: scaleX(0);
    animation: ${grow} 0.9s 450ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
  }
  .label {
    font: 400 12px ${FONT};
    letter-spacing: 0.5em;
    margin-right: -0.5em;
    color: rgba(255, 255, 255, 0.55);
    text-transform: uppercase;
    white-space: nowrap;
    animation: ${fadeUp} 0.6s 600ms both;
  }
  .welcome {
    font: 300 15px ${FONT};
    letter-spacing: 0.12em;
    color: rgba(255, 255, 255, 0.9);
    white-space: nowrap;
    animation: ${fadeUp} 0.7s 850ms both;
  }
`;

// ---------------------------------------------------------------- 外框、揭幕

const stageOut = keyframes`to { opacity: 0; transform: scale(1.04); filter: blur(4px); }`;
// 光條從中間往兩側展開: 用兩端漸淡的遮罩撐開 (不用 scaleX, 縮放會把光暈壓扁成硬邊的方塊;
// 也不用 clip-path, 展開時兩端會是切齊的直角)
const barIn = keyframes`
  0% { -webkit-mask-size: 0% 100%; mask-size: 0% 100%; opacity: 1; }
  45% { -webkit-mask-size: 100% 100%; mask-size: 100% 100%; opacity: 1; }
  100% { -webkit-mask-size: 100% 100%; mask-size: 100% 100%; opacity: 0; }
`;

const Root = styled.div`
  position: fixed;
  inset: 0;
  z-index: 3000;
  cursor: pointer;
  user-select: none;
`;

const Veil = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 45%, #0d1014 0%, #050608 70%);
`;

const Stage = styled.div<{ $out: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  ${(p) =>
    p.$out &&
    css`
      animation: ${stageOut} 0.35s cubic-bezier(0.4, 0, 1, 1) forwards;
    `}
`;

const LightBar = styled.div<{ $ms: number }>`
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 160px;
  margin-top: -80px;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 18%, #000 82%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 18%, #000 82%, transparent 100%);
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: 0% 100%;
  mask-size: 0% 100%;
  animation: ${barIn} ${(p) => p.$ms}ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards;

  /* 光暈 */
  &::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 48px;
    margin-top: -24px;
    background: radial-gradient(ellipse at center, rgba(255, 70, 50, 0.38), transparent 70%);
    filter: blur(6px);
  }
  /* 光條本體 */
  &::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 2px;
    margin-top: -1px;
    background: linear-gradient(90deg, transparent 0%, rgba(226, 35, 26, 0.9) 22%, #fff 50%, rgba(226, 35, 26, 0.9) 78%, transparent 100%);
    box-shadow: 0 0 12px 2px rgba(255, 70, 50, 0.6);
  }
`;

const Hint = styled.div<{ $out: boolean }>`
  position: absolute;
  bottom: 28px;
  left: 0;
  right: 0;
  text-align: center;
  font: 400 11px ${FONT};
  letter-spacing: 0.3em;
  color: rgba(255, 255, 255, 0.32);
  animation: ${fadeIn} 0.6s 700ms both;
  transition: opacity 0.2s;
  ${(p) => p.$out && "opacity: 0;"}
`;

const easeInOutCubic = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

const Ignition: React.FC = () => {
  const [req, setReq] = useAtom(ignitionAtom);
  const { t } = useTranslation();
  /** 淡出階段: 照時間軸走是 slow, 使用者略過是 fast (光條、揭幕都縮短) */
  const [out, setOut] = useState<false | "slow" | "fast">(false);
  const outRef = useRef(false);
  const veil = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const raf = useRef(0);

  const clear = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    cancelAnimationFrame(raf.current);
  };

  const finish = useCallback(() => {
    clear();
    outRef.current = false;
    setOut(false);
    setReq(null);
  }, [setReq]);

  /** 淡出字樣 → 光條展開 → 黑幕從中間開一個圓洞往外擴大 */
  const goOut = useCallback(
    (fast: boolean) => {
      if (outRef.current) return;
      outRef.current = true;
      clear();
      setOut(fast ? "fast" : "slow");
      const dur = fast ? 450 : IRIS_MS;
      timers.current.push(
        window.setTimeout(
          () => {
            const el = veil.current;
            if (!el) return finish();
            const feather = 180;
            const max = Math.hypot(window.innerWidth, window.innerHeight) / 2 + feather;
            const t0 = performance.now();
            const step = (now: number) => {
              const k = Math.min(1, (now - t0) / dur);
              const r = -feather + easeInOutCubic(k) * (max + feather);
              const mask = `radial-gradient(circle at 50% 50%, transparent ${r}px, #000 ${r + feather}px)`;
              el.style.maskImage = mask;
              el.style.webkitMaskImage = mask;
              if (k < 1) raf.current = requestAnimationFrame(step);
              else finish();
            };
            raf.current = requestAnimationFrame(step);
          },
          fast ? 60 : IRIS_DELAY,
        ),
      );
    },
    [finish],
  );

  useEffect(() => {
    if (!req) return;
    timers.current.push(window.setTimeout(() => goOut(false), OUT_AT));
    const skip = (e: KeyboardEvent) => {
      if (!["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) goOut(true);
    };
    window.addEventListener("keydown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      clear();
    };
  }, [req, goOut]);

  if (!req) return null;
  return (
    <Root onPointerDown={() => goOut(true)} data-testid="ignition">
      <Veil ref={veil} />
      <Stage $out={!!out}>
        <Brand>
          <div className="wordmark">KENMEC</div>
          <div className="line" />
          <div className="label">{t("login.system_label")}</div>
          <div className="welcome">{t("login.welcome_back", { name: req.name })}</div>
        </Brand>
      </Stage>
      {out && <LightBar $ms={out === "fast" ? 500 : 950} />}
      <Hint $out={!!out}>{t("login.skip_hint")}</Hint>
    </Root>
  );
};

export default Ignition;
