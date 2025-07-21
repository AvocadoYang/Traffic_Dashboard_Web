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

type Open = {
  $is_open: boolean;
};

const Box = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1em;
`;

const ModelStyle = styled.div<Open>`
  display: ${(prop) => (prop.$is_open ? 'flex' : 'none')};
  width: 20em;
  height: 20em;
  flex-direction: column;
  background-color: white;
  border: solid 1px #7b7b7b;
  border-radius: 6px;
  position: relative;
  z-index: 999;
  bottom: 0px;
  right: 0px;

  padding: 0.8em;
  gap: 1em;
`;

const MyIcon = styled.div`
  position: absolute;
  right: 10px;
  z-index: 999;
`;

const InfoWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.2em;
`;

type HasTrigger = {
  b: boolean;
};

const C = styled.div<HasTrigger>`
  width: 100%;
  opacity: ${(props) => (props.b ? 1 : 0.5)};
`;

const TextWrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

const H3 = styled.h3`
  margin: 0;
`;

const BlurText = styled.p`
  margin: 0;
  text-align: center;
  font-size: larger;
  font-weight: bolder;
`;

const NoConnectBlock = styled.div`
  width: 100%;
  height: 100%;
  background: #c9c4c4;
  filter: blur(10px);
`;

const PointDiv = styled.div.attrs<{
  left: number;
  top: number;
  canrotate: string;
}>(({ left, top, canrotate }) => ({
  style: { left, top, canrotate }
}))<{
  left: number;
  top: number;
  canrotate: string;
}>`
  position: absolute;
  width: ${(props) => (props.canrotate === 'true' ? '6.5px' : '5px')};
  height: ${(props) => (props.canrotate === 'true' ? '6.5px' : '5px')};
  background: ${(props) => (props.canrotate === 'true' ? '#f27ef4' : '#1b00ce')};
  border-radius: ${(props) => (props.canrotate === 'true' ? 0 : '50%')};
  z-index: 10;
  transition-duration: 200ms;
`;
export const Point = memo(PointDiv);

const ChargeStationModel: FC = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useAtom(chargeStationModelProp);
  const { data } = useMap();
  const { data: AllStation } = useLocation();
  const nodeRef = useRef<HTMLDivElement>(null);

  if (!open || !data) return [];

  const info =
    (AllStation?.chargingStations.find((v) => v.locationId === open.location)
      ?.info as ChargeStationResponseObj) || null;

  const [displayX, displayY] = rosCoord2DisplayCoord({
    x: data?.locations.find((v) => v.locationId === open?.location)?.x || 0,
    y: data?.locations.find((v) => v.locationId === open?.location)?.y || 0,
    mapHeight: data?.mapHeight,
    mapOriginX: data?.mapOriginX,
    mapOriginY: data.mapOriginY,
    mapResolution: data.mapResolution
  });

  return (
    <>
      <Draggable nodeRef={nodeRef}>
        <Point ref={nodeRef} canrotate="false" left={displayX} top={displayY}>
          <ModelStyle $is_open={true}>
            {info ? (
              <>
                <MyIcon onClick={() => setOpen(null)}>
                  <CloseCircleOutlined style={{ alignSelf: 'end' }} />
                </MyIcon>

                <Box>
                  <InfoWrapper>
                    <h3>{t('charge.current')}</h3>
                    <C b={info.current.AUTO_MODE}>{t('charge.auto_mode')}</C>
                    <C b={info.current.COMPLETE}>{t('charge.complete')}</C>
                    <C b={info.current.FAULT}>{t('charge.fault')}</C>
                    <C b={info.current.PROCESS}>{t('charge.process')}</C>
                    <C b={info.current.STANDBY}>{t('charge.standby')}</C>
                  </InfoWrapper>

                  <InfoWrapper>
                    <h3>{t('charge.error')}</h3>
                    <C b={info.error.MODULE_COMMUNICATION_FAILURE}>
                      {t('charge.moduleCommunicationFailure')}
                    </C>
                    <C b={info.error.REVERSE_BATTERY_CONNECTION}>
                      {t('charge.reverseBetterConnection')}
                    </C>
                    <C b={info.error.BATTERY_NOT_CONNECTED}>{t('charge.batteryNotConnected')}</C>
                    <C b={info.error.SHORT_CIRCUIT}>{t('charge.shortCircuit')}</C>
                    <C b={info.error.OVER_VOLTAGE}>{t('charge.overVoltage')}</C>
                    <C b={info.error.OVER_CURRENT}>{t('charge.overCurrent')}</C>
                    <C b={info.error.TOTAL_FAULT}>{t('charge.totalFault')}</C>
                  </InfoWrapper>

                  <InfoWrapper>
                    <h3>{t('charge.other')}</h3>
                    <C b={info.other.INFRARED_IN_PLACE}>{t('charge.infraredInPlace')}</C>
                    <C b={info.other.COMPRESS}>{t('charge.compress')}</C>
                    <C b={info.other.SCALING_FAILURE}>{t('charge.scalingFault')}</C>
                    <C b={info.other.REACH_OUT_CHARGE}>{t('charge.reachOutCharge')}</C>
                    <C b={info.other.RETURNING}>{t('charge.returning')}</C>
                    <C b={info.other.IS_STRETCHING_OUT}>{t('charge.isStretching')}</C>
                    <C b={info.other.RESET}>{t('charge.reset')}</C>
                  </InfoWrapper>
                </Box>
                <TextWrapper>
                  <H3>{`充電站標號： ${open.location.slice(-2)}`}</H3>
                  <H3>
                    {t('charge.updateTime')}
                    {`: ${dayjs(info.responseTime).format('YYYY/M/D HH:mm:ss')}`}
                  </H3>
                </TextWrapper>
              </>
            ) : (
              <>
                <MyIcon onClick={() => setOpen(null)}>
                  <CloseCircleOutlined style={{ alignSelf: 'end' }} />
                </MyIcon>
                <NoConnectBlock />
                <BlurText>{t('charge.coreFail')}</BlurText>
              </>
            )}
          </ModelStyle>
        </Point>
      </Draggable>
    </>
  );
};

export default ChargeStationModel;
