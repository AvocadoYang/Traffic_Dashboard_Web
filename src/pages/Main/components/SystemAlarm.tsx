import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  CloseCircleFilled,
  WarningFilled,
  CheckCircleFilled,
  InfoCircleFilled,
  CloseOutlined,
} from "@ant-design/icons";
import {
  AlarmType,
  SystemAlarmData,
  useSystemAlarm,
} from "@/sockets/useSystemAlarm";

// 同時最多疊幾張卡。超過就把最舊的擠掉,避免一串警報把整個畫面洗成瀑布。
const MAX_VISIBLE = 4;
const PRUNE_INTERVAL = 250;

type ActiveAlarm = SystemAlarmData & {
  // alarmType + message 當識別值,同一則警報重複進來就累加次數而不是再疊一張卡。
  key: string;
  count: number;
  expiresAt: number;
};

const THEMES: Record<
  AlarmType,
  { accent: string; label: string; Icon: typeof InfoCircleFilled }
> = {
  error: { accent: "#ff4d4f", label: "error", Icon: CloseCircleFilled },
  warn: { accent: "#faad14", label: "warning", Icon: WarningFilled },
  success: { accent: "#52c41a", label: "success", Icon: CheckCircleFilled },
  info: { accent: "#1890ff", label: "info", Icon: InfoCircleFilled },
};

const AlarmContainer = styled.div`
  position: fixed;
  bottom: var(--space-lg);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  pointer-events: none;
  display: flex;
  flex-direction: column-reverse;
  gap: var(--space-sm);
  width: min(420px, calc(100vw - 2 * var(--space-lg)));
`;

const AlarmCard = styled(motion.div)<{ $accent: string }>`
  pointer-events: auto;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--space-sm);
  padding: 10px 12px;
  background: rgba(28, 34, 45, 0.95);
  color: #f0f2f5;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 3px solid ${(props) => props.$accent};
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(6px);
`;

const TypeIcon = styled.span<{ $accent: string }>`
  color: ${(props) => props.$accent};
  font-size: var(--icon-size);
  line-height: 1.5;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-family: "Roboto Mono", monospace;
  font-size: var(--font-xs);
  letter-spacing: 1px;
  text-transform: uppercase;
`;

const TypeLabel = styled.span<{ $accent: string }>`
  color: ${(props) => props.$accent};
  font-weight: 700;
`;

const RepeatBadge = styled.span`
  padding: 0 5px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.75);
  font-weight: 700;
`;

const Timestamp = styled.span`
  margin-left: auto;
  color: rgba(255, 255, 255, 0.45);
`;

// 單筆訊息也可能很長(例如帶一串座標),先給高度上限再自己捲,
// 不讓一張卡把整個畫面吃掉。
const MessageContent = styled.div`
  margin-top: 4px;
  font-size: var(--font-md);
  line-height: 1.45;
  overflow-wrap: anywhere;
  max-height: 96px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.25);
    border-radius: 2px;
  }
`;

const CloseButton = styled.button`
  align-self: start;
  padding: 0;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-size: var(--font-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }
`;

export const SystemAlarmOverlay = () => {
  const systemAlarm = useSystemAlarm();
  const [alarms, setAlarms] = useState<ActiveAlarm[]>([]);

  const removeAlarm = (key: string) => {
    setAlarms((prev) => prev.filter((a) => a.key !== key));
  };

  useEffect(() => {
    if (!systemAlarm.message) return;

    const key = `${systemAlarm.alarmType}|${systemAlarm.message}`;
    const expiresAt =
      Date.now() + Math.min(3000 + systemAlarm.level * 2000, 10000);

    setAlarms((prev) => {
      if (prev.some((a) => a.key === key)) {
        return prev.map((a) =>
          a.key === key
            ? {
                ...a,
                count: a.count + 1,
                tstamp: systemAlarm.tstamp,
                expiresAt,
              }
            : a,
        );
      }
      const next = [...prev, { ...systemAlarm, key, count: 1, expiresAt }];
      if (next.length <= MAX_VISIBLE) return next;
      // 超量時優先擠掉最舊的非 error,免得一串 info/success 把錯誤訊息洗掉。
      const victim = next.find((a) => a.alarmType !== "error") ?? next[0];
      return next.filter((a) => a !== victim);
    });
  }, [systemAlarm]);

  useEffect(() => {
    if (alarms.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setAlarms((prev) => prev.filter((a) => a.expiresAt > now));
    }, PRUNE_INTERVAL);
    return () => clearInterval(timer);
  }, [alarms.length]);

  return (
    <AlarmContainer>
      <AnimatePresence>
        {alarms.map((alarm) => {
          const { accent, label, Icon } =
            THEMES[alarm.alarmType] ?? THEMES.error;

          return (
            <AlarmCard
              key={alarm.key}
              $accent={accent}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
              layout
            >
              <TypeIcon $accent={accent}>
                <Icon />
              </TypeIcon>

              <div>
                <MetaRow>
                  <TypeLabel $accent={accent}>{label}</TypeLabel>
                  {alarm.count > 1 && <RepeatBadge>×{alarm.count}</RepeatBadge>}
                  <Timestamp>
                    {alarm.tstamp?.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </Timestamp>
                </MetaRow>
                <MessageContent>
                  {alarm.message.split("|").map((part, i) => (
                    <div key={i}>{part.trim()}</div>
                  ))}
                </MessageContent>
              </div>

              <CloseButton onClick={() => removeAlarm(alarm.key)}>
                <CloseOutlined />
              </CloseButton>
            </AlarmCard>
          );
        })}
      </AnimatePresence>
    </AlarmContainer>
  );
};
