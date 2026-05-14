import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useConformManager } from "@/sockets/useUserConformTaskStep";
import { io } from "@/sockets/socketConnect";

// --- 樣式部分保持不變 ---
const ActionButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px; // 稍微增加間距
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
  background: rgba(45, 55, 72, 0.95);
  color: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  min-width: 350px;
  border: 2px solid #1890ff;
  backdrop-filter: blur(10px);
`;

const OverlayContainer = styled.div`
  position: fixed;
  top: 100px;
  right: 30px;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

// --- 新增文字樣式 (可選) ---
const InfoRow = styled.div`
  font-size: 0.9rem;
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
`;

const MessageText = styled.div`
  background: rgba(255, 255, 255, 0.1);
  padding: 8px;
  border-radius: 4px;
  font-size: 0.95rem;
  margin: 10px 0;
  border-left: 3px solid #1890ff;
`;

export const UserConformOverlay = () => {
  // 注意：這裡的 pendingTasks 是物件陣列 [{ amrId, inner: { ... } }, ...]
  const pendingTasks = useConformManager();

  const handleAction = (amrId: string, action: "continue" | "cancel") => {
    io.emit("user-has-conform", { amrId, action });
  };

  return (
    <OverlayContainer>
      <AnimatePresence>
        {pendingTasks.map((task) => (
          <ConformCard
            key={task.amrId}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            layout
          >
            <div
              style={{
                fontSize: "1.1rem",
                marginBottom: "8px",
                fontWeight: "bold",
              }}
            >
              🤖 任務確認請求
            </div>

            {/* 顯示 AMR ID */}
            <InfoRow>
              <span style={{ opacity: 0.7 }}>AMR ID:</span>
              <strong>{task.amrId}</strong>
            </InfoRow>

            {/* 顯示後端傳來的詳細資訊 */}
            {task.inner && (
              <>
                <InfoRow>
                  <span style={{ opacity: 0.7 }}>名稱:</span>
                  <span>
                    {task.inner.fullName} ({task.inner.subName})
                  </span>
                </InfoRow>

                <MessageText>{task.inner.message}</MessageText>
              </>
            )}

            <ActionButtonGroup>
              <ActionButton onClick={() => handleAction(task.amrId, "cancel")}>
                取消任務
              </ActionButton>
              <ActionButton
                $primary
                onClick={() => handleAction(task.amrId, "continue")}
              >
                繼續執行
              </ActionButton>
            </ActionButtonGroup>
          </ConformCard>
        ))}
      </AnimatePresence>
    </OverlayContainer>
  );
};