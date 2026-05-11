import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { AlarmType, useSystemAlarm } from "@/sockets/useSystemAlarm";

const AlarmContainer = styled.div`
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  pointer-events: none;
  /* Add these for stacking */
  display: flex;
  flex-direction: column-reverse; /* Newest at bottom, stack upwards */
  gap: 12px;
`;

// 2. 定義顏色主題
const THEMES: Record<AlarmType, { bg: string; shadow: string; icon: string }> =
  {
    error: {
      bg: "rgba(255, 77, 79, 0.95)",
      shadow: "rgba(255, 77, 79, 0.3)",
      icon: "🚨",
    },
    warn: {
      bg: "rgba(250, 173, 20, 0.95)",
      shadow: "rgba(250, 173, 20, 0.3)",
      icon: "⚠️",
    },
    success: {
      bg: "rgba(82, 196, 26, 0.95)",
      shadow: "rgba(82, 196, 26, 0.3)",
      icon: "✅",
    },
    info: {
      bg: "rgba(24, 144, 255, 0.95)",
      shadow: "rgba(24, 144, 255, 0.3)",
      icon: "ℹ️", // Information emoji
    },
  };

// 3. 讓 Styled Component 接收 $type 屬性 (使用 $ 前綴避免屬性傳遞到 DOM)
const AlarmCard = styled(motion.div)<{ $type: AlarmType }>`
  pointer-events: auto;
  /* 動態背景色 */
  background: ${(props) => THEMES[props.$type].bg};
  color: white;
  padding: 12px 20px 12px 24px;
  border-radius: 12px;
  /* 動態陰影 */
  box-shadow: 0 8px 32px ${(props) => THEMES[props.$type].shadow};
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 350px;
  max-width: 90vw;
  font-size: 1rem;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0; /* 防止文字太長把按鈕壓扁 */

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.9);
  }
`;

const MessageContent = styled.div`
  flex-grow: 1;
  word-break: break-all;
`;

const Timestamp = styled.div`
  font-size: 0.75rem;
  opacity: 0.7;
  margin-top: 4px;
  font-family: monospace;
`;

export const SystemAlarmOverlay = () => {
  const systemAlarm = useSystemAlarm();
  // Store an array of active alarms
  const [alarms, setAlarms] = useState<any[]>([]);

  // Function to remove an alarm by ID
  const removeAlarm = (id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  };

  useEffect(() => {
    if (systemAlarm.message) {
      const id = Date.now().toString(); // Simple unique ID
      const duration = Math.min(3000 + systemAlarm.level * 2000, 10000);

      const newAlarm = {
        ...systemAlarm,
        id,
      };

      // Add new alarm to list
      setAlarms((prev) => [...prev, newAlarm]);

      // Set timer to remove this specific alarm
      setTimeout(() => {
        removeAlarm(id);
      }, duration);
    }
  }, [systemAlarm]);

  return (
    <AlarmContainer>
      <AnimatePresence>
        {alarms.map((alarm) => {
          const theme = THEMES[alarm.alarmType as AlarmType] || THEMES.error;

          return (
            <AlarmCard
              key={alarm.id} // Important for Framer Motion!
              $type={alarm.alarmType as AlarmType}
              initial={{ y: 50, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              layout // Smoothly slide other cards when one disappears
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span>{theme.icon}</span>
                  <MessageContent>
                    {/* Add your line-break logic from earlier if needed! */}
                    {alarm.message.split("|").map((part: string, i: number) => (
                      <div key={i}>{part.trim()}</div>
                    ))}
                  </MessageContent>
                  <CloseButton onClick={() => removeAlarm(alarm.id)}>
                    ×
                  </CloseButton>
                </div>
                <Timestamp>
                  {alarm.tstamp?.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </Timestamp>
              </div>
            </AlarmCard>
          );
        })}
      </AnimatePresence>
    </AlarmContainer>
  );
};
