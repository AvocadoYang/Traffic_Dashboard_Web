import { FC, useEffect, useMemo, useState } from "react";
import { Button, Empty, Select, Tooltip } from "antd";
import { CloseOutlined, DisconnectOutlined } from "@ant-design/icons";
import { useAtom, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import styled, { css, keyframes } from "styled-components";
import {
  AdvantechGroupRow,
  GroupStatusResult,
  IoSide,
  StateTone,
  describeConditions,
  evaluateGroup,
  groupSignalName,
  groupSignals,
  signalValue,
  useAdvantechGroups,
  useAdvantechIoSocket,
  useAdvantechIoStatus,
} from "@/api/useAdvantech";
import { OpenSimCarPanel } from "@/components/SimCars/simCarAtoms";
import { toneSoft, toneSolid } from "./stateTone";
import { OpenAdvantechPanel } from "./atoms";

/** 上次看的群組, 每台電腦各自記 (只是方便, 讀不到就選第一個) */
const GROUP_STORAGE_KEY = "advantech-status-group";
const readStoredGroup = () => {
  try {
    return localStorage.getItem(GROUP_STORAGE_KEY);
  } catch {
    return null;
  }
};
const storeGroup = (id: string) => {
  try {
    localStorage.setItem(GROUP_STORAGE_KEY, id);
  } catch {
    /* 私密視窗等存不了, 不影響 */
  }
};

/** 按鈕上小燈的顏色: 離線紅色; 有成立的用第一個的顏色; 都沒有就不亮 */
const dotTone = (r: GroupStatusResult): StateTone | null =>
  r.kind === "offline"
    ? "red"
    : r.kind === "ok" && r.active.length
      ? r.active[0].tone
      : null;

const Btn = styled.div<{ $top: string; $left: string; $active: boolean }>`
  position: absolute;
  z-index: 5;
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  box-sizing: border-box;
  /* 固定 px, 跟 ScalePad / 效能監看 / 模擬車輛同尺寸 */
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $active }) =>
    $active ? "var(--c-header-accent)" : "var(--c-text)"};
  background-color: ${({ $active }) =>
    $active ? "var(--c-header-accent-soft)" : "var(--c-bg)"};
  border: 1px solid
    ${({ $active }) =>
      $active ? "var(--c-header-accent)" : "var(--c-border-strong)"};
  border-radius: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;

  &:hover {
    color: var(--c-header-accent);
    border-color: var(--c-header-accent);
  }

  svg {
    width: 22px;
    height: 22px;
    fill: currentColor;
  }
`;

/** 按鈕右上角的小燈: 不打開面板也看得到上次選的群組有沒有狀態成立 */
const BtnDot = styled.span<{ $color: string }>`
  position: absolute;
  top: 5px;
  right: 5px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 0 2px var(--c-bg);
`;

const Panel = styled.div<{ $top: string; $left: string }>`
  position: absolute;
  z-index: 21;
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  width: 340px;
  max-width: calc(100% - ${({ $left }) => $left} - 16px);
  max-height: calc(100% - ${({ $top }) => $top} - 16px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: var(--c-bg-subtle);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const Title = styled.span`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.2px;
  color: var(--c-text-secondary);
`;

const Body = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-right: -4px;
  padding-right: 4px;
`;

const SectionLabel = styled.div`
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.6px;
  color: var(--c-text-muted);
`;

const ActiveList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 var(--card-glow); }
  70% { box-shadow: 0 0 0 7px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
`;

/** 現在成立的一筆: 大字 + 顏色 */
const ActiveCard = styled.div<{ $tone: StateTone }>`
  --card-color: ${({ $tone }) => toneSolid($tone)};
  --card-glow: ${({ $tone }) => toneSoft($tone, 45)};
  position: relative;
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr);
  align-items: center;
  gap: 2px 12px;
  padding: 10px 12px 10px 15px;
  border-radius: 10px;
  border: 1px solid ${({ $tone }) => toneSoft($tone, 40)};
  background: ${({ $tone }) => toneSoft($tone)};
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
    background: var(--card-color);
  }
`;

const CardLamp = styled.span<{ $animate: boolean }>`
  grid-row: span 2;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--card-color);
  ${({ $animate }) =>
    $animate &&
    css`
      animation: ${pulse} 2s ease-out infinite;
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const CardName = styled.span`
  font-size: 17px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--c-text);
  overflow-wrap: anywhere;
`;

const CardSub = styled.span`
  font-size: 12px;
  color: var(--c-text-secondary);
  overflow-wrap: anywhere;
  white-space: pre-line;

  code {
    font-family: "Roboto Mono", ui-monospace, monospace;
    font-size: 11px;
    color: var(--c-text-muted);
  }
`;

/** 沒有任何成立 / 沒設定 / 離線時的那一塊 */
const QuietCard = styled.div<{ $danger?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px dashed
    ${({ $danger }) => ($danger ? toneSolid("red") : "var(--c-border-strong)")};
  background: ${({ $danger }) =>
    $danger ? toneSoft("red", 10) : "var(--c-bg)"};
  font-size: 13px;
  color: var(--c-text-secondary);

  strong {
    display: block;
    margin-bottom: 2px;
    font-size: 14px;
    color: var(--c-text);
  }
`;

/** 沒成立的: 淡淡列出來, 看得出還會出現哪些狀態 */
const IdlePills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const IdlePill = styled.span<{ $tone: StateTone }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px solid var(--c-border);
  font-size: 12px;
  color: var(--c-text-secondary);

  &::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${({ $tone }) => toneSolid($tone)};
    opacity: 0.6;
  }
`;

const IoBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const IoRowLabel = styled.span`
  font-size: 11px;
  color: var(--c-text-muted);
`;

/** 群組全部的訊號, 照接續編號一格一格排 */
const IoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 4px;
`;

const IoCell = styled.span<{ $on: boolean | null }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 34px;
  border-radius: 5px;
  font-family: "Roboto Mono", ui-monospace, monospace;
  font-size: 11px;
  font-weight: ${({ $on }) => ($on ? 700 : 400)};
  background: ${({ $on }) =>
    $on === null
      ? "transparent"
      : $on
        ? "var(--c-header-accent)"
        : "var(--c-bg)"};
  color: ${({ $on }) =>
    $on
      ? "var(--c-bg)"
      : $on === null
        ? "var(--c-text-muted)"
        : "var(--c-text-secondary)"};
  border: 1px solid
    ${({ $on }) => ($on ? "var(--c-header-accent)" : "var(--c-border)")};
  transition:
    background 0.15s,
    color 0.15s;

  small {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 9px;
    opacity: 0.8;
  }
`;

/**
 * 首頁 (MainV2) 地圖上的「Advantech 4000」方塊 (只有 HAS_MIR 才有): 選一個模組群組,
 * 列出現在成立的訊號意義 (設定頁 設備 > Advantech 4000 serial 的群組卡設的, 例如 DO0 + DO1 → 專屬模式啟動),
 * 好幾個可以同時成立。只能看, 不能操作; IO 狀態靠 socket 即時更新。
 */
const AdvantechStatusPanel: FC<{ top?: string; left?: string }> = ({
  top = "172px",
  left = "16px",
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useAtom(OpenAdvantechPanel);
  const setSimOpen = useSetAtom(OpenSimCarPanel);
  // 整個首頁聽一次: 按鈕上的小燈不開面板也要即時
  useAdvantechIoSocket();
  const { data: groups } = useAdvantechGroups();
  const { data: status } = useAdvantechIoStatus();
  const [groupId, setGroupId] = useState<string | null>(readStoredGroup);

  // 記住的群組被刪了 (或第一次用) 就選第一個
  const group: AdvantechGroupRow | undefined = useMemo(
    () => groups?.find((g) => g.id === groupId) ?? groups?.[0],
    [groups, groupId],
  );
  useEffect(() => {
    if (group && group.id !== groupId) setGroupId(group.id);
  }, [group, groupId]);

  const result: GroupStatusResult = group
    ? evaluateGroup(group, status)
    : { kind: "loading" };
  const dot = dotTone(result);
  const states = group?.states ?? [];
  const activeIds = new Set(
    result.kind === "ok" ? result.active.map((s) => s.id) : [],
  );

  const toggle = () => {
    if (!open) setSimOpen(false);
    setOpen(!open);
  };

  const pick = (id: string) => {
    setGroupId(id);
    storeGroup(id);
  };

  const renderCurrent = () => {
    if (!group) return null;
    if (result.kind === "loading") return null;
    if (result.kind === "offline") {
      return (
        <QuietCard $danger>
          <DisconnectOutlined
            style={{ color: toneSolid("red"), fontSize: 16, marginTop: 2 }}
          />
          <div>
            <strong>{t("advantech.offline")}</strong>
            <span style={{ whiteSpace: "pre-line" }}>
              {result.offline
                .map((o) => {
                  const m = group.modules.find((x) => x.id === o.id);
                  return `${m?.name ?? o.id}: ${o.error || t("advantech.offline")}`;
                })
                .join("\n")}
            </span>
          </div>
        </QuietCard>
      );
    }
    if (!states.length) {
      return (
        <QuietCard>
          <div>
            <strong>{t("advantech.status.no_states")}</strong>
            {t("advantech.status.no_states_hint")}
          </div>
        </QuietCard>
      );
    }
    if (!result.active.length) {
      return (
        <QuietCard>
          <div>
            <strong>{t("advantech.status.no_active")}</strong>
            {t("advantech.status.no_active_hint")}
          </div>
        </QuietCard>
      );
    }
    return (
      <ActiveList>
        {result.active.map((s) => (
          <ActiveCard key={s.id} $tone={s.tone}>
            <CardLamp $animate={s.tone === "red" || s.tone === "amber"} />
            <CardName>{s.name}</CardName>
            <CardSub>
              <code>{describeConditions(group, s.conditions)}</code>
              {s.note ? ` · ${s.note}` : ""}
            </CardSub>
          </ActiveCard>
        ))}
      </ActiveList>
    );
  };

  const renderIo = (side: IoSide) => {
    if (!group) return null;
    return (
      <IoBlock>
        <IoRowLabel>
          {side === "do" ? t("advantech.outputs") : t("advantech.inputs")}
        </IoRowLabel>
        <IoGrid>
          {groupSignals(group, side).map((s) => {
            const on = signalValue(status, s.moduleId, s.side, s.channel);
            const tip = [
              groupSignalName(s.side, s.index),
              s.label?.code,
              s.label?.name,
              group.modules.length > 1 ? `(${s.moduleName})` : "",
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <Tooltip
                key={`${s.moduleId}${s.channel}`}
                title={tip}
                mouseEnterDelay={0.3}
              >
                <IoCell $on={on}>
                  {groupSignalName(s.side, s.index)}
                  {s.label?.code && <small>{s.label.code}</small>}
                </IoCell>
              </Tooltip>
            );
          })}
        </IoGrid>
      </IoBlock>
    );
  };

  const idle = states.filter((s) => !activeIds.has(s.id));

  return (
    <>
      <Tooltip title={t("advantech.status.title")} placement="right">
        <Btn
          $top={top}
          $left={left}
          $active={open}
          onClick={toggle}
          role="button"
          aria-pressed={open}
          aria-label={t("advantech.status.title")}
        >
          {/* mdi: chip */}
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M6,4H18V5H21V7H18V9H21V11H18V13H21V15H18V17H21V19H18V20H6V19H3V17H6V15H3V13H6V11H3V9H6V7H3V5H6V4M11,15V18H12V15H11M13,15V18H14V15H13M15,15V18H16V15H15Z" />
          </svg>
          {dot && <BtnDot $color={toneSolid(dot)} />}
        </Btn>
      </Tooltip>

      {open && (
        <Panel $top={top} $left={`calc(${left} + 52px)`}>
          <Head>
            <Title>ADVANTECH 4000</Title>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={() => setOpen(false)}
              aria-label={t("utils.close")}
            />
          </Head>

          {!groups ? null : groups.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t("advantech.status.no_groups")}
            />
          ) : (
            <>
              <Select
                value={group?.id}
                onChange={pick}
                options={groups.map((g) => ({ value: g.id, label: g.name }))}
                showSearch
                optionFilterProp="label"
                style={{ width: "100%" }}
              />
              <Body>
                <div>
                  <SectionLabel>{t("advantech.status.current")}</SectionLabel>
                  {renderCurrent()}
                </div>

                {result.kind === "ok" && idle.length > 0 && (
                  <div>
                    <SectionLabel>{t("advantech.status.others")}</SectionLabel>
                    <IdlePills>
                      {idle.map((s) => (
                        <IdlePill key={s.id} $tone={s.tone}>
                          {s.name}
                        </IdlePill>
                      ))}
                    </IdlePills>
                  </div>
                )}

                {group && group.modules.length > 0 && (
                  <div>
                    <SectionLabel>{t("advantech.status.signals")}</SectionLabel>
                    <IoBlock style={{ gap: 8 }}>
                      {renderIo("do")}
                      {renderIo("di")}
                    </IoBlock>
                  </div>
                )}
              </Body>
            </>
          )}
        </Panel>
      )}
    </>
  );
};

export default AdvantechStatusPanel;
