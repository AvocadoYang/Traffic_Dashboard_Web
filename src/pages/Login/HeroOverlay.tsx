import React, { useEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { useTranslation } from "react-i18next";
import timeline from "./heroTimeline.json";
import "./heroFont.css";

/**
 * 疊在登入頁背景影片上的文字 (車廠首頁那種): 跟著影片鏡頭換章節, 顯示車型名稱、規格、功能,
 * 底下的進度條會隨影片時間填滿, 點一段可以跳到那一章。
 * 章節時間軸 heroTimeline.json 是錄影片時 (scripts/login-hero) 一起輸出的, 影片重錄後會自動對齊。
 */

type ChapterId = "forklift" | "mir" | "roller" | "lift" | "fleet";
type Spec = { key: "payload" | "speed" | "size" | "lift"; value: string; unit: string };

/**
 * 每一章的規格數字 (例: { key: "payload", value: "1.5", unit: "t" }, 尺寸寫成 "800 × 580")。
 * 叉車、MI15、SW15 的數字還沒拿到, 有了直接加在這裡; 沒有規格的章節只顯示功能描述。
 */
const SPECS: Record<ChapterId, Spec[]> = {
  forklift: [],
  mir: [],
  roller: [],
  lift: [],
  fleet: [],
};

const CHAPTERS = timeline.chapters as { chapter: ChapterId; start: number; end: number; textAt: number }[];
/** 章節結束前多久開始淡出 (跟影片切鏡頭的壓暗對齊) */
const OUT_BEFORE = 0.4;

const RED = "#e2231a";
const FONT = `"Archivo", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;
const pad = (n: number) => String(n).padStart(2, "0");

const fadeUp = keyframes`from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); }`;
const titleIn = keyframes`
  from { opacity: 0; letter-spacing: 0.16em; filter: blur(6px); transform: translateY(10px); }
  to { opacity: 1; letter-spacing: 0.02em; filter: blur(0); transform: translateY(0); }
`;
const grow = keyframes`from { transform: scaleX(0); } to { transform: scaleX(1); }`;
const blockOut = keyframes`to { opacity: 0; transform: translateY(-6px); }`;

const Wrap = styled.div<{ $hidden: boolean }>`
  position: absolute;
  left: 6vw;
  bottom: 8vh;
  z-index: 2;
  max-width: calc(94vw - 560px);
  color: #fff;
  font-family: ${FONT};
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.45);
  pointer-events: none;
  transition: opacity 0.4s;
  ${(p) => p.$hidden && "opacity: 0;"}

  /* 窄螢幕被登入卡片蓋住; 減少動態效果時影片不播, 字也不出來 */
  @media (max-width: 1000px), (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

const Block = styled.div<{ $out: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 190px;
  justify-content: flex-end;
  margin-bottom: 26px;
  ${(p) =>
    p.$out &&
    css`
      animation: ${blockOut} 0.35s ease-in forwards;
    `}

  .index {
    display: flex;
    align-items: center;
    gap: 14px;
    font: 500 12px / 1 ${FONT};
    letter-spacing: 0.32em;
    color: rgba(255, 255, 255, 0.72);
    animation: ${fadeUp} 0.6s both;

    i {
      width: 40px;
      height: 1px;
      background: ${RED};
      box-shadow: 0 0 8px rgba(226, 35, 26, 0.7);
      transform-origin: left;
      animation: ${grow} 0.7s 0.05s cubic-bezier(0.2, 0.7, 0.2, 1) both;
    }
  }
  .title {
    font-family: ${FONT};
    font-stretch: 125%;
    font-weight: 600;
    font-size: clamp(30px, 3.3vw, 56px);
    line-height: 1.05;
    letter-spacing: 0.02em; /* 放不下時換行 (FLEET ORCHESTRATION 在窄一點的螢幕會碰到登入卡片) */
    animation: ${titleIn} 0.9s 0.1s cubic-bezier(0.2, 0.7, 0.2, 1) both;
  }
  .subtitle {
    font-weight: 300;
    font-size: 16px;
    letter-spacing: 0.24em;
    color: rgba(255, 255, 255, 0.82);
    animation: ${fadeUp} 0.7s 0.3s both;
  }
  .specs {
    display: flex;
    margin-top: 8px;

    > div {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 0 22px;
      border-left: 1px solid rgba(255, 255, 255, 0.2);
      animation: ${fadeUp} 0.7s both;

      &:first-child {
        padding-left: 0;
        border-left: 0;
      }
    }
    span {
      font: 500 11px / 1 ${FONT};
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.55);
    }
    b {
      font-weight: 300;
      font-stretch: 112%;
      font-size: 30px;
      line-height: 1;
      font-variant-numeric: tabular-nums;

      small {
        font-size: 13px;
        margin-left: 5px;
        color: rgba(255, 255, 255, 0.7);
      }
      /* Archivo 的 × 在細字重 + 加寬時字形會畫壞, 改用系統字型 */
      i {
        font: 300 0.62em sans-serif;
        font-style: normal;
        margin: 0 0.25em;
        vertical-align: 0.18em;
        color: rgba(255, 255, 255, 0.75);
      }
    }
  }
  .features {
    font-weight: 400;
    font-size: 13px;
    letter-spacing: 0.16em;
    color: rgba(255, 255, 255, 0.72);
    animation: ${fadeUp} 0.7s 0.5s both;
  }
`;

const Progress = styled.div`
  display: flex;
  gap: 10px;
  pointer-events: auto;

  button {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 64px;
    padding: 8px 0;
    border: 0;
    background: none;
    cursor: pointer;
    text-align: left;
  }
  .track {
    display: block;
    height: 2px;
    background: rgba(255, 255, 255, 0.22);
    overflow: hidden;
    transition: height 0.2s;
  }
  .fill {
    display: block;
    height: 100%;
    background: #fff;
    transform-origin: left;
    transform: scaleX(0);
  }
  em {
    font: 500 10px / 1 ${FONT};
    font-style: normal;
    letter-spacing: 0.2em;
    color: rgba(255, 255, 255, 0.4);
    transition: color 0.2s;
  }
  button.on em,
  button:hover em {
    color: #fff;
  }
  button:hover .track {
    height: 3px;
  }
`;

const HeroOverlay: React.FC<{ video: React.RefObject<HTMLVideoElement>; hidden?: boolean }> = ({ video, hidden = false }) => {
  const { t } = useTranslation();
  // 章節的 key 是組出來的, i18next 的型別推不出來
  const tk = (key: string, opts?: Record<string, unknown>) => t(key as Parameters<typeof t>[0], opts as never) as unknown as string;
  const [cur, setCur] = useState({ i: 0, show: false, out: false });
  const fills = useRef<(HTMLSpanElement | null)[]>([]);

  // 每一畫格讀影片時間: 章節變了才更新 state, 進度條直接改 DOM (不觸發重繪整個元件)
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = video.current;
      if (v) {
        const time = v.currentTime;
        let i = CHAPTERS.findIndex((c) => time >= c.start && time < c.end);
        if (i < 0) i = CHAPTERS.length - 1;
        const c = CHAPTERS[i];
        const show = time >= c.textAt;
        const out = c.end - time < OUT_BEFORE;
        setCur((p) => (p.i === i && p.show === show && p.out === out ? p : { i, show, out }));
        fills.current.forEach((el, k) => {
          if (!el) return;
          const p = k < i ? 1 : k > i ? 0 : Math.min(1, (time - c.start) / (c.end - c.start));
          el.style.transform = `scaleX(${p})`;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [video]);

  const seek = (k: number) => {
    const v = video.current;
    if (!v) return;
    v.currentTime = CHAPTERS[k].textAt;
    void v.play().catch(() => undefined);
  };

  const id = CHAPTERS[cur.i].chapter;
  const specs = SPECS[id];
  return (
    <Wrap $hidden={hidden} aria-hidden={hidden}>
      {cur.show && (
        <Block key={cur.i} $out={cur.out}>
          <div className="index">
            <span>{pad(cur.i + 1)}</span>
            <i />
          </div>
          <div className="title">{tk(`login.hero.${id}.title`)}</div>
          <div className="subtitle">{tk(`login.hero.${id}.subtitle`)}</div>
          {specs.length > 0 && (
            <div className="specs">
              {specs.map((s, k) => (
                <div key={s.key} style={{ animationDelay: `${0.4 + k * 0.08}s` }}>
                  <span>{tk(`login.hero.spec.${s.key}`)}</span>
                  <b>
                    {s.value.split("×").map((part, n) => (
                      <React.Fragment key={n}>
                        {n > 0 && <i>×</i>}
                        {part.trim()}
                      </React.Fragment>
                    ))}
                    <small>{s.unit}</small>
                  </b>
                </div>
              ))}
            </div>
          )}
          <div className="features">{tk(`login.hero.${id}.features`)}</div>
        </Block>
      )}
      <Progress>
        {CHAPTERS.map((c, k) => (
          <button
            key={c.chapter + k}
            type="button"
            className={k === cur.i ? "on" : undefined}
            onClick={() => seek(k)}
            aria-label={tk("login.hero.goto", { n: k + 1, name: tk(`login.hero.${c.chapter}.title`) })}
          >
            <span className="track">
              <span className="fill" ref={(el) => (fills.current[k] = el)} />
            </span>
            <em>{pad(k + 1)}</em>
          </button>
        ))}
      </Progress>
    </Wrap>
  );
};

export default HeroOverlay;
