import { Modal } from "antd";
import styled, { createGlobalStyle } from "styled-components";
import { FC, ReactNode } from "react";

// 1. 引入恐怖風格字體 (Google Fonts)
const HorrorFontImport = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Creepster&family=Nosifer&display=swap');
`;

// 2. 透過 styled-components 定義 Modal 的樣式
// 這裡的 & 代表 ant-modal-content 本身
const StyledHorrorModal = styled(Modal)`
  /* 彈窗主體本體 */
  & {
    background:
      radial-gradient(ellipse at top left, rgba(120, 0, 0, 0.15), transparent 60%),
      radial-gradient(ellipse at bottom right, rgba(90, 0, 0, 0.2), transparent 60%),
      repeating-linear-gradient(
        45deg,
        #2b2320 0px,
        #2b2320 2px,
        #221b19 2px,
        #221b19 4px
      ),
      linear-gradient(160deg, #1a1512 0%, #2e2118 40%, #1c1310 100%) !important;
    border: 2px solid #4a1a12;
    border-radius: 2px;
    box-shadow:
      0 0 40px rgba(139, 0, 0, 0.4),
      inset 0 0 60px rgba(0, 0, 0, 0.6);
    position: relative;
    overflow: hidden;
    padding: 0;
  }

  /* 生鏽污漬紋理層 */
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(circle at 15% 20%, rgba(101, 45, 15, 0.5) 0%, transparent 25%),
      radial-gradient(circle at 85% 75%, rgba(80, 30, 10, 0.4) 0%, transparent 30%),
      radial-gradient(circle at 50% 90%, rgba(60, 10, 10, 0.5) 0%, transparent 35%);
    pointer-events: none;
    mix-blend-mode: multiply;
    z-index: 1;
  }

  /* 血滴效果 */
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100%;
    pointer-events: none;
    background-image:
      linear-gradient(180deg, #6b0000 0%, rgba(107, 0, 0, 0.6) 40%, transparent 41%),
      linear-gradient(180deg, #5a0000 0%, rgba(90, 0, 0, 0.5) 25%, transparent 26%),
      linear-gradient(180deg, #4a0000 0%, rgba(74, 0, 0, 0.4) 55%, transparent 56%);
    background-size: 3px 90px, 2px 60px, 4px 120px;
    background-position: 8% 0, 42% 0, 78% 0;
    background-repeat: no-repeat;
    opacity: 0.85;
    z-index: 1;
  }

  .ant-modal-header {
    background: transparent;
    border-bottom: 1px solid #4a1a12;
    padding: 20px 24px 12px;
    position: relative;
    z-index: 2;
  }

  .ant-modal-title {
    font-family: "Nosifer", "Creepster", cursive;
    font-size: 22px;
    color: #c41e1e;
    text-shadow:
      0 0 8px rgba(196, 30, 30, 0.8),
      0 0 20px rgba(139, 0, 0, 0.6),
      2px 2px 0 #000;
    letter-spacing: 2px;
    animation: flicker 3s infinite;
  }

  .ant-modal-body {
    position: relative;
    z-index: 2;
    padding: 20px 24px;
    color: #d8c4b0;
    font-family: "Creepster", cursive;
    font-size: 16px;
    letter-spacing: 1px;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    line-height: 1.6;
  }

  .ant-modal-footer {
    background: transparent;
    border-top: 1px solid #4a1a12;
    padding: 12px 24px 20px;
    position: relative;
    z-index: 2;
  }

  .ant-modal-close {
    color: #8b1a1a;
    z-index: 3;

    &:hover {
      color: #c41e1e;
      background: rgba(139, 0, 0, 0.2);
    }
  }

  @keyframes flicker {
    0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
      opacity: 1;
    }
    20%, 22%, 24%, 55% {
      opacity: 0.4;
    }
  }
`;

// 3. 恐怖風格按鈕
const HorrorButton = styled.button`
  font-family: "Nosifer", cursive;
  font-size: 12px;
  letter-spacing: 1px;
  padding: 10px 20px;
  background: linear-gradient(180deg, #3a0a0a, #1a0505);
  border: 1px solid #6b0000;
  color: #c41e1e;
  cursor: pointer;
  text-shadow: 0 0 6px rgba(196, 30, 30, 0.6);
  transition: all 0.2s;
  margin-left: 8px;

  &:hover {
    background: linear-gradient(180deg, #5a0000, #2a0808);
    box-shadow: 0 0 15px rgba(139, 0, 0, 0.6);
    color: #ff4444;
  }
`;

interface HorrorModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onOk?: () => void;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
}

// 4. 元件本體
const HorrorModal: FC<HorrorModalProps> = ({
  open,
  title,
  children,
  onOk,
  onCancel,
  okText = "確認",
  cancelText = "取消",
}) => {
  return (
    <>
      <HorrorFontImport />
      <StyledHorrorModal
        open={open}
        title={title}
        onCancel={onCancel}
        centered
        // 關鍵：將 styled-components 的 class 綁定到 Antd 的 content 上
        classNames={{
          content: "horror-modal-content",
        }}
        className="horror-modal-content"
        footer={[
          <HorrorButton key="cancel" onClick={onCancel}>
            {cancelText}
          </HorrorButton>,
          <HorrorButton key="ok" onClick={onOk}>
            {okText}
          </HorrorButton>,
        ]}
      >
        {children}
      </StyledHorrorModal>
    </>
  );
};

export default HorrorModal;