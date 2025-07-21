import { ChargeStationResponseObj } from '@/api/type/useLocation';
import { FC, memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAtom } from 'jotai';
import { chargeStationModelProp } from '@/utils/gloable';
import { rosCoord2DisplayCoord } from '@/utils/utils';
import useMap from '@/api/useMap';
import useLocation from '@/api/useLocation';
import Draggable from 'react-draggable';

// Define types for styled components
type Open = {
  $isOpen: boolean;
};

type HasTrigger = {
  $isActive: boolean;
};

// Styled Components with enhanced styling
const Box = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1.5rem;
  padding: 1rem;
`;

const ModelStyle = styled.div<Open>`
  display: ${({ $isOpen }) => ($isOpen ? 'flex' : 'none')};
  min-width: 25rem;

  flex-direction: column;
  background: linear-gradient(145deg, #ffffff, #f8f9fa);
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: absolute;
  z-index: 1000;
  padding: 2.5rem 1.2em;
  gap: 1.5rem;
  transition: all 0.3s ease-in-out;

  &:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  }
`;

const MyIcon = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  cursor: pointer;
  color: #6b7280;
  transition: color 0.2s ease;

  &:hover {
    color: #ef4444;
  }
`;

const InfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const StatusItem = styled.div<HasTrigger>`
  width: 100%;
  padding: 0.5rem;
  border-radius: 6px;
  background: ${({ $isActive }) => ($isActive ? '#e6f3ff' : '#f3f4f6')};
  color: ${({ $isActive }) => ($isActive ? '#1d4ed8' : '#6b7280')};
  font-size: 0.9rem;
  font-weight: 500;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: ${({ $isActive }) => ($isActive ? '#bfdbfe' : '#e5e7eb')};
  }
`;

const TextWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
`;

const SubText = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: #4b5563;
  font-weight: 500;
`;

const NoConnectBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 16rem;
  background: linear-gradient(135deg, #ffe5e5, #fffafa);
  border: 1px solid #fecaca;
  border-radius: 12px;
  box-shadow: inset 0 0 10px rgba(255, 0, 0, 0.05);
  padding: 1rem;
  position: relative;
`;

const BlurText = styled.p`
  font-size: 1.2rem;
  font-weight: 600;
  color: #dc2626;
  text-align: center;
  margin: 0;
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
    100% {
      opacity: 1;
    }
  }
`;

const ErrorIcon = styled.div`
  font-size: 2.5rem;
  color: #ef4444;
  margin-bottom: 1rem;
`;

const PointDiv = styled.div.attrs<{
  left: number;
  top: number;
  canRotate: string;
}>(({ left, top, canRotate }) => ({
  style: { left, top, transform: canRotate === 'true' ? 'rotate(45deg)' : 'none' }
}))<{
  left: number;
  top: number;
  canRotate: string;
}>`
  position: absolute;
  width: ${({ canRotate }) => (canRotate === 'true' ? '8px' : '6px')};
  height: ${({ canRotate }) => (canRotate === 'true' ? '8px' : '6px')};
  background: ${({ canRotate }) => (canRotate === 'true' ? '#d946ef' : '#2563eb')};
  border-radius: ${({ canRotate }) => (canRotate === 'true' ? '2px' : '50%')};
  z-index: 10;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

export const Point = memo(PointDiv);

const ChargeStationModel: FC = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useAtom(chargeStationModelProp);
  const { data } = useMap();
  const { data: AllStation } = useLocation();
  const nodeRef = useRef<HTMLDivElement>(null);

  if (!open || !data) return null;

  const info =
    (AllStation?.chargingStations.find((v) => v.locationId === open.location)
      ?.info as ChargeStationResponseObj) || null;
  console.log();
  console.log(info);
  const [displayX, displayY] = rosCoord2DisplayCoord({
    x: data?.locations.find((v) => v.locationId === open?.location)?.x || 0,
    y: data?.locations.find((v) => v.locationId === open?.location)?.y || 0,
    mapHeight: data?.mapHeight,
    mapOriginX: data?.mapOriginX,
    mapOriginY: data?.mapOriginY,
    mapResolution: data.mapResolution
  });

  return (
    <Draggable nodeRef={nodeRef}>
      <Point ref={nodeRef} canRotate="false" left={displayX} top={displayY}>
        <ModelStyle $isOpen={true}>
          {info ? (
            <>
              <MyIcon onClick={() => setOpen(null)}>
                <CloseCircleOutlined style={{ fontSize: '1.2rem' }} />
              </MyIcon>

              <Box>
                <InfoWrapper>
                  <Title>{t('charge.current')}</Title>
                  <StatusItem $isActive={info.current.AUTO_MODE}>
                    {t('charge.auto_mode')}
                  </StatusItem>
                  <StatusItem $isActive={info.current.COMPLETE}>{t('charge.complete')}</StatusItem>
                  <StatusItem $isActive={info.current.FAULT}>{t('charge.fault')}</StatusItem>
                  <StatusItem $isActive={info.current.PROCESS}>{t('charge.process')}</StatusItem>
                  <StatusItem $isActive={info.current.STANDBY}>{t('charge.standby')}</StatusItem>
                </InfoWrapper>

                <InfoWrapper>
                  <Title>{t('charge.error')}</Title>
                  <StatusItem $isActive={info.error.MODULE_COMMUNICATION_FAILURE}>
                    {t('charge.moduleCommunicationFailure')}
                  </StatusItem>
                  <StatusItem $isActive={info.error.REVERSE_BATTERY_CONNECTION}>
                    {t('charge.reverseBetterConnection')}
                  </StatusItem>
                  <StatusItem $isActive={info.error.BATTERY_NOT_CONNECTED}>
                    {t('charge.batteryNotConnected')}
                  </StatusItem>
                  <StatusItem $isActive={info.error.SHORT_CIRCUIT}>
                    {t('charge.shortCircuit')}
                  </StatusItem>
                  <StatusItem $isActive={info.error.OVER_VOLTAGE}>
                    {t('charge.overVoltage')}
                  </StatusItem>
                  <StatusItem $isActive={info.error.OVER_CURRENT}>
                    {t('charge.overCurrent')}
                  </StatusItem>
                  <StatusItem $isActive={info.error.TOTAL_FAULT}>
                    {t('charge.totalFault')}
                  </StatusItem>
                </InfoWrapper>

                <InfoWrapper>
                  <Title>{t('charge.other')}</Title>
                  <StatusItem $isActive={info.other.INFRARED_IN_PLACE}>
                    {t('charge.infraredInPlace')}
                  </StatusItem>
                  <StatusItem $isActive={info.other.COMPRESS}>{t('charge.compress')}</StatusItem>
                  <StatusItem $isActive={info.other.SCALING_FAILURE}>
                    {t('charge.scalingFault')}
                  </StatusItem>
                  <StatusItem $isActive={info.other.REACH_OUT_CHARGE}>
                    {t('charge.reachOutCharge')}
                  </StatusItem>
                  <StatusItem $isActive={info.other.RETURNING}>{t('charge.returning')}</StatusItem>
                  <StatusItem $isActive={info.other.IS_STRETCHING_OUT}>
                    {t('charge.isStretching')}
                  </StatusItem>
                  <StatusItem $isActive={info.other.RESET}>{t('charge.reset')}</StatusItem>
                </InfoWrapper>
              </Box>

              <TextWrapper>
                <SubText>{`充電站標號： ${open.location.slice(-2)}`}</SubText>
                <SubText>
                  {t('charge.updateTime')}
                  {`: ${dayjs(info.responseTime).format('YYYY/M/D HH:mm:ss')}`}
                </SubText>
              </TextWrapper>
            </>
          ) : (
            <>
              <MyIcon onClick={() => setOpen(null)}>
                <CloseCircleOutlined style={{ fontSize: '1.2rem' }} />
              </MyIcon>
              <NoConnectBlock>
                <ErrorIcon>
                  <CloseCircleOutlined />
                </ErrorIcon>
                <BlurText>{t('charge.coreFail')}</BlurText>
              </NoConnectBlock>
            </>
          )}
        </ModelStyle>
      </Point>
    </Draggable>
  );
};

export default ChargeStationModel;
