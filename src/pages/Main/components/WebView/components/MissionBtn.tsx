import {
  ThunderboltOutlined,
  RedoOutlined,
  CalendarOutlined,
  SwapOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { Button, Flex, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { DialogMission } from '../../missionModal';
import { memo, useState, useEffect } from 'react';
import { OpenAssignMission } from '@/pages/Main/global/jotai';
import { useSetAtom } from 'jotai';
import QuickMissionWebView from '../../missionModal/QuickMissionWebView';
import styled from 'styled-components';

// Styled Components
const MissionBtnWrap = styled.div<{ $isMinimized: boolean }>`
  position: absolute;
  z-index: 4;
  top: 16px; /* Align with the header */
  right: 16px; /* Align with the right edge of the mission panel */
  background-color: rgba(255, 255, 255, 0.01); /* White background to match panels */
  border-radius: 8px; /* Consistent rounded corners */
  padding: 8px; /* More padding for a spacious feel */
  opacity: 1; /* Always fully opaque for clarity */
  transition: all 0.3s ease-in-out;
  width: ${(props) => (props.$isMinimized ? '40px' : 'auto')};
  height: ${(props) => (props.$isMinimized ? '4em' : 'auto')};
  overflow: hidden;
  display: flex;
  align-items: center;


  @media (max-width: 768px) {
    padding: ${(props) => (props.$isMinimized ? '0' : '6px')};
    border-radius: 6px;
  }

  @media (max-width: 576px) {
    padding: ${(props) => (props.$isMinimized ? '0' : '4px')};
    border-radius: 4px;
  }

  @media (max-width: 480px) {
    padding: ${(props) => (props.$isMinimized ? '0' : '4px')};
    border-radius: 4px;
  }
`;

const StyledButton = styled(Button)`
  height: 40px; /* Consistent height with other buttons */
  border-radius: 4px; /* Rounded corners for a modern look */
  border: none; /* No border for a clean look */
  background-color:rgb(135, 208, 241); /* Light gray background for unselected buttons */
  color: #333; /* Darker text for contrast */
  font-weight: 500; /* Slightly bold text */
  font-size: 14px; /* Larger font size for readability */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); /* Subtle shadow */
  transition: all 0.3s ease;

  &:hover {
    background-color: #1890ff; /* Ant Design primary color on hover */
    color: #fff; /* White text on hover */
    transform: scale(1.05); /* Slight scale-up effect */
  }

  &:active {
    transform: scale(0.95); /* Scale-down on click */
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
  transition: all 0.3s ease;

  &:hover {
    background-color: #ff4d4f;
    color: #fff;
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const MissionBtn = () => {
  const { t } = useTranslation();
  const openAssignMission = useSetAtom(OpenAssignMission);
  const [showQuickMission, setShowQuickMission] = useState(false);
  const [$isMinimized, set$isMinimized] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem('missionBtnMinimized');
    if (savedState) {
      set$isMinimized(JSON.parse(savedState));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('missionBtnMinimized', JSON.stringify($isMinimized));
  }, [$isMinimized]);

  return (
    <>
      <MissionBtnWrap $isMinimized={$isMinimized}>
        {$isMinimized ? (
          <Tooltip title={t('main.card_name.mission')} placement="bottom">
            <Button icon={<SwapOutlined />} type="text" onClick={() => set$isMinimized(false)} />
          </Tooltip>
        ) : (
          <Flex gap="small" wrap="wrap" align="center" justify="end">
            <StyledButton onClick={() => { }} icon={<RedoOutlined />}>
              {t('toolbar.mission.cycle_mission')}
            </StyledButton>

            <StyledButton
              onClick={() => {
                setShowQuickMission(!showQuickMission);
              }}
              icon={<ThunderboltOutlined />}
            >
              {t('main.card_name.quick_mission')}
            </StyledButton>

            <StyledButton
              onClick={() => {
                openAssignMission(true);
              }}
              icon={<CalendarOutlined />}
            >
              {t('main.card_name.new_mission')}
            </StyledButton>

            <MinimizeButton icon={<CloseOutlined />} onClick={() => set$isMinimized(true)} />
          </Flex>
        )}
      </MissionBtnWrap>
      <DialogMission />
      <QuickMissionWebView
        showQuickMission={showQuickMission}
        setShowQuickMission={setShowQuickMission}
      />
    </>
  );
};

export default memo(MissionBtn);
