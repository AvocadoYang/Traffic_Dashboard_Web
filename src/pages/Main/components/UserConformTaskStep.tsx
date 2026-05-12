import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react"; // 假設你的 Hook 在這
import {
  useConformManager,
  useInitUserConformTaskStep,
  useUserConformTaskStep,
} from "@/sockets/useUserConformTaskStep";
import { io } from "@/sockets/socketConnect";

// --- 擴展樣式 ---
const ActionButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: flex-end;
`;

const ActionButton = styled.button<{ $primary?: boolean }>`
  padding: 6px 16px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: ${props => props.$primary ? "rgba(255, 255, 255, 0.9)" : "transparent"};
  color: ${props => props.$primary ? "#333" : "white"};
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.$primary ? "#fff" : "rgba(255, 255, 255, 0.2)"};
    transform: translateY(-1px);
  }
`;

const ConformCard = styled(motion.div)`
  pointer-events: auto;
  background: rgba(45, 55, 72, 0.95); /* 深色背景區分一般 Alarm */
  color: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  min-width: 350px;
  border: 2px solid #1890ff; /* 加上主題色邊框 */
  backdrop-filter: blur(10px);
`;

const OverlayContainer = styled.div`
  position: fixed;
  top: 100px; /* 改為上方或右側，避免擋住下方的 Alarm */
  right: 30px;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

export const UserConformOverlay = () => {
const pendingIds = useConformManager();

  const handleAction = (amrId: string, action: "continue" | "cancel") => {
    // 1. 回報給後端 (後端收到後會廣播 remove-user-conform-step 給所有人)
    io.emit("user-has-conform", { amrId, action });
  };


  return (
    <OverlayContainer>
      <AnimatePresence>
        {pendingIds.map((amrId) => (
          <ConformCard
            key={amrId}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            layout
          >
            <div style={{ fontSize: "1.1rem", marginBottom: "4px" }}>
              🤖 任務確認請求
            </div>
            <div style={{ opacity: 0.8, fontSize: "0.9rem" }}>
              AMR ID: <strong>{amrId}</strong>
            </div>
            
            <ActionButtonGroup>
              <ActionButton onClick={() => handleAction(amrId, "cancel")}>
                取消任務
              </ActionButton>
              <ActionButton $primary onClick={() => handleAction(amrId, "continue")}>
                繼續
              </ActionButton>
            </ActionButtonGroup>
          </ConformCard>
        ))}
      </AnimatePresence>
    </OverlayContainer>
  );
};