import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useSystemAlarm } from "@/sockets/useSystemAlarm";

const AlarmContainer = styled.div`
  position: fixed;
  bottom: 30px; /* 改為 bottom 避開導航欄 */
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  pointer-events: none;
`;

const AlarmCard = styled(motion.div)`
  pointer-events: auto;
  background: rgba(255, 77, 79, 0.95);
  color: white;
  padding: 12px 20px 12px 24px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(255, 77, 79, 0.3);
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

export const SystemAlarmOverlay = () => {
  const systemAlarm = useSystemAlarm();
  const [displayMsg, setDisplayMsg] = useState("");
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleClose = () => {
    setVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => {
    if (systemAlarm.message && systemAlarm.message !== "") {
      if (timerRef.current) clearTimeout(timerRef.current);

      setDisplayMsg(systemAlarm.message);
      setVisible(true);

      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, 6000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [systemAlarm]);

  return (
    <AnimatePresence>
      {visible && (
        <AlarmContainer>
          <AlarmCard
            initial={{ y: 50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <span>🚨</span>
            <MessageContent>{displayMsg}</MessageContent>
            <CloseButton onClick={handleClose} aria-label="Close alarm">
              ×
            </CloseButton>
          </AlarmCard>
        </AlarmContainer>
      )}
    </AnimatePresence>
  );
};
