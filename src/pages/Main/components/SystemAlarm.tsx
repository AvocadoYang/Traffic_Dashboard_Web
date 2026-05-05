import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { AlarmType, useSystemAlarm } from "@/sockets/useSystemAlarm";

const AlarmContainer = styled.div`
  position: fixed;
  bottom: 30px; /* 改為 bottom 避開導航欄 */
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  pointer-events: none;
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
  const [displayMsg, setDisplayMsg] = useState("");
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentTheme =
    THEMES[systemAlarm.alarmType as AlarmType] || THEMES.error;

  const handleClose = () => {
    setVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => {
    if (systemAlarm.message) {
      if (timerRef.current) clearTimeout(timerRef.current);

      setVisible(true);

      // 邏輯：Level 1 -> 3秒, Level 2 -> 5秒, Level 3+ -> 7秒
      const duration = Math.min(3000 + systemAlarm.level * 2000, 10000);

      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, duration);
    }
  }, [systemAlarm]);

  return (
    <AnimatePresence>
      {visible && (
        <AlarmContainer>
          <AlarmCard
            $type={systemAlarm.alarmType as AlarmType} // 傳入當前類型
            initial={{ y: 50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
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
                {/* 動態顯示圖示 */}
                <span>{currentTheme.icon}</span>
                <MessageContent>{systemAlarm.message}</MessageContent>
                <CloseButton onClick={() => setVisible(false)}>×</CloseButton>
              </div>

              <Timestamp>
                {systemAlarm.tstamp?.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </Timestamp>
            </div>
          </AlarmCard>
        </AlarmContainer>
      )}
    </AnimatePresence>
  );
};
