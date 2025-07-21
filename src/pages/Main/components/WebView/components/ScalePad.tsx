import { Button, message, Tooltip } from 'antd';
import { memo, useState, useEffect } from 'react';
import styled from 'styled-components';
import { useMutation } from '@tanstack/react-query';
import client from '@/api/axiosClient';
import { SwapOutlined, CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useMockInfo } from '@/sockets/useMockInfo';

const ScalePadWrap = styled.div<{ $isMinimized: boolean }>`
  position: absolute;
  z-index: 4;
  top: 16px;
  left: 16px;
  background-color: #ffffff;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  gap: 8px;
  opacity: 1;
  transition: all 0.3s ease-in-out;
  width: ${(props) => (props.$isMinimized ? '40px' : 'auto')};
  height: ${(props) => (props.$isMinimized ? '4em' : 'auto')};
  overflow: hidden;
  display: flex;
  align-items: center;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 768px) {
    padding: ${(props) => (props.$isMinimized ? '0' : '6px')};
    gap: 6px;
    border-radius: 6px;
  }

  @media (max-width: 576px) {
    padding: ${(props) => (props.$isMinimized ? '0' : '4px')};
    gap: 4px;
    border-radius: 4px;
  }

  @media (max-width: 480px) {
    padding: ${(props) => (props.$isMinimized ? '0' : '4px')};
    gap: 4px;
    border-radius: 4px;
  }
`;

const StyledButton = styled(Button)`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  padding: 0;
  border: none;
  background-color: #f5f5f5;
  color: #333;
  font-weight: 500;
  font-size: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    background-color: #1890ff;
    color: #fff;
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  &.selected {
    background-color: #1890ff;
    color: #fff;
    box-shadow: 0 2px 6px rgba(24, 144, 255, 0.3);
  }

  &.selected:hover {
    background-color: #40a9ff;
  }
`;

const MinimizeButton = styled(Button)`
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  background-color: #f5f5f5;
  color: #333;
  font-size: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 1s ease;

  &:hover {
    background-color: #ff4d4f; /* Red for minimize action */
    color: #fff;
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const ContentWrapper = styled.div<{ $isVisible: boolean }>`
  display: flex;
  gap: 8px;
  opacity: ${(props) => (props.$isVisible ? 1 : 0)};
  transition: opacity 0.3s ease-in-out;
  pointer-events: ${(props) => (props.$isVisible ? 'auto' : 'none')};
`;

const ScalePad = () => {
  const [scale, setScale] = useState(1);
  const [$isMinimized, set$isMinimized] = useState(false); // State to toggle minimize/expand
  const [messageApi, contextHolder] = message.useMessage();
  const script = useMockInfo();
  const { t } = useTranslation();

  // Optionally persist the minimized state in localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('scalePadMinimized');
    if (savedState) {
      set$isMinimized(JSON.parse(savedState));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('scalePadMinimized', JSON.stringify($isMinimized));
  }, [$isMinimized]);

  const sendSetScale = useMutation({
    mutationFn: (scale: number) => {
      return client.post(
        '/api/simulate/scale',
        { scale },
        {
          headers: { authorization: `Bearer ${localStorage.getItem('_KMT')}` }
        }
      );
    },
    onSuccess: (resData) => {
      const res = resData.data;
      if (res.status === 'success') {
        setScale(res.response.scale);
      } else {
        void messageApi.error('無法排除 聯絡FAE工程師');
      }
    },
    onError: () => {
      void messageApi.error('無法排除 聯絡FAE工程師');
    }
  });

  const scaleOptions = Array.from({ length: 10 }, (_, index) => index + 1);

  useEffect(() => {
    if (script?.isSimulate === false) {
      setScale(1);
    }
    return;
  }, [script]);

  return (
    <>
      {contextHolder}
      {script?.isSimulate ? (
        <ScalePadWrap $isMinimized={$isMinimized}>
          <Tooltip placement="bottom" title={t('scale_pad.title')}>
            <Button
              type="text"
              icon={<SwapOutlined />}
              onClick={() => set$isMinimized(false)}
              style={{ display: $isMinimized ? 'inline-flex' : 'none' }}
            />
          </Tooltip>

          <ContentWrapper $isVisible={!$isMinimized}>
            {scaleOptions.map((scaleValue) => (
              <StyledButton
                key={scaleValue}
                className={scale === scaleValue ? 'selected' : ''}
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
              title="Minimize Scale Controls"
            />
          </ContentWrapper>
        </ScalePadWrap>
      ) : null}
    </>
  );
};

export default memo(ScalePad);
