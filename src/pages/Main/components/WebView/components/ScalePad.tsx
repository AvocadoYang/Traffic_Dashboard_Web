import { Button, message, Tooltip } from "antd";
import { memo, useState, useEffect } from "react";
import styled, { css } from "styled-components";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { SwapOutlined, CloseOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMockInfo } from "@/sockets/useMockInfo";

// 三顆地圖左上角的模擬工具 (模擬速度 / 效能監看 / 模擬車輛) 都用固定 px 尺寸排成一欄:
// 以前用 em, 使用者把字體大小調大時按鈕跟著變大, 下面的按鈕就被壓到 (排位置的 top 是寫死的 px)。
// 排法: ScalePad 16px 起、高 44px → 效能監看 top 68px → 模擬車輛 top 120px, 之間各留 8px。
// 顏色全部走主題變數 (以前寫死白 / 灰 / 藍, 換主題不會變)。
const ScalePadWrap = styled.div<{ $isMinimized: boolean }>`
  position: absolute;
  z-index: 4;
  top: 16px;
  left: 16px;
  box-sizing: border-box;
  background-color: var(--c-bg);
  border: 1px solid var(--c-border-strong);
  border-radius: 0;
  padding: 3px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  gap: 4px;
  transition: width 0.2s ease-in-out;
  width: ${(props) => (props.$isMinimized ? "44px" : "auto")};
  height: 44px;
  overflow: hidden;

  &:hover {
    border-color: var(--c-text-muted);
  }

  @media (max-width: 768px) {
    gap: 2px;
  }
`;

const toolBtn = css`
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 0;
  background-color: var(--c-bg-muted);
  color: var(--c-text);
  font-weight: 600;
  font-size: var(--font-sm);
  box-shadow: none;
  transition:
    background-color 0.15s,
    color 0.15s;
`;

const StyledButton = styled(Button)`
  && {
    ${toolBtn}
  }

  &&:hover:not(:disabled) {
    background-color: var(--c-header-accent-soft);
    border-color: var(--c-header-accent);
    color: var(--c-header-accent);
  }

  &&.selected,
  &&.selected:hover:not(:disabled) {
    background-color: var(--c-header-accent-text);
    border-color: var(--c-header-accent-text);
    color: var(--c-bg);
  }
`;

const MinimizeButton = styled(Button)`
  && {
    ${toolBtn}
  }

  &&:hover:not(:disabled) {
    background-color: var(--c-danger-soft);
    border-color: var(--c-danger);
    color: var(--c-danger);
  }
`;

const ContentWrapper = styled.div<{ $isVisible: boolean }>`
  display: flex;
  gap: 4px;
  opacity: ${(props) => (props.$isVisible ? 1 : 0)};
  transition: opacity 0.3s ease-in-out;
  pointer-events: ${(props) => (props.$isVisible ? "auto" : "none")};
`;

const ScalePad = () => {
  const [scale, setScale] = useState(1);
  const [$isMinimized, set$isMinimized] = useState(false); // State to toggle minimize/expand
  const [messageApi, contextHolder] = message.useMessage();
  const script = useMockInfo();
  const { t } = useTranslation();

  // Optionally persist the minimized state in localStorage
  useEffect(() => {
    const savedState = localStorage.getItem("scalePadMinimized");
    if (savedState) {
      set$isMinimized(JSON.parse(savedState));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("scalePadMinimized", JSON.stringify($isMinimized));
  }, [$isMinimized]);

  const sendSetScale = useMutation({
    mutationFn: (scale: number) => {
      return client.post(
        "/api/simulate/scale",
        { scale },
        {
          headers: { authorization: `Bearer ${localStorage.getItem("_KMT")}` },
        },
      );
    },
    onSuccess: (resData) => {
      const res = resData.data;
      if (res.status === "success") {
        setScale(res.response.scale);
      } else {
        void messageApi.error(t("utils.contact_fae"));
      }
    },
    onError: () => {
      void messageApi.error(t("utils.contact_fae"));
    },
  });

  const scaleOptions = [0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 3, 4, 5];

  useEffect(() => {
    if (script?.isSimulate === false) {
      setScale(1);
    }

    setScale(script?.scale || 1);

    return;
  }, [script]);

  return (
    <>
      {contextHolder}
      {script?.isSimulate ? (
        <ScalePadWrap $isMinimized={$isMinimized}>
          <Tooltip placement="bottom" title={t("scale_pad.title")}>
            <Button
              type="text"
              icon={<SwapOutlined />}
              onClick={() => set$isMinimized(false)}
              style={{ display: $isMinimized ? "inline-flex" : "none" }}
            />
          </Tooltip>

          <ContentWrapper $isVisible={!$isMinimized}>
            {scaleOptions.map((scaleValue) => (
              <StyledButton
                key={scaleValue}
                className={scale === scaleValue ? "selected" : ""}
                onClick={() => {
                  if (scale === scaleValue) return;
                  sendSetScale.mutate(scaleValue);
                }}
                loading={sendSetScale.isLoading && scaleValue === scale}
              >
                x{scaleValue}
              </StyledButton>
            ))}
            <MinimizeButton
              icon={<CloseOutlined />}
              onClick={() => set$isMinimized(true)}
              title={t("scale_pad.minimize")}
            />
          </ContentWrapper>
        </ScalePadWrap>
      ) : null}
    </>
  );
};

export default memo(ScalePad);
