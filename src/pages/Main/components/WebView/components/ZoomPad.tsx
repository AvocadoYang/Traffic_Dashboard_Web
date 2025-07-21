import styled from 'styled-components';
import { Button, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import useMap from '@/api/useMap';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { memo } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  isShowLocation,
  isShowLocationTooltip,
  isShowRoad,
  isShowRoadTooltip
} from '@/utils/siderGloble';
import { Scale } from '@/utils/gloable';

const ZoomPadWrap = styled.div`
  position: absolute;
  z-index: 4;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #f5f5f5;
  border-radius: 20px;
  padding: 6px 13px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  gap: 12px;
  opacity: 0.9;
  transition: opacity 0.3s ease-in-out;

  &:hover {
    opacity: 1;
  }

  @media (max-width: 768px) {
    padding: 10px 15px;
    gap: 8px;
    border-radius: 16px;
  }

  @media (max-width: 576px) {
    padding: 9px 14px;
    gap: 7px;
    border-radius: 14px;
  }

  @media (max-width: 480px) {
    padding: 8px 12px;
    gap: 6px;
    border-radius: 12px;
  }
`;

const ResponsiveSVG = styled.svg`
  width: 1.2em;
  height: 1.2em;
  font-size: 0.8em;

  @media (max-width: 768px) {
    width: 1em;
    height: 1em;
  }

  @media (max-width: 480px) {
    width: 1em;
    height: 1em;
  }
`;

const StyledButton = styled(Button)`
  border: none;
  background-color: transparent;
  color: #151313;
  margin: 0;

  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: #ddd;
  }

  &.ant-btn-primary {
    background-color: #359dfe;
    &:hover {
      background-color: #40a9ff;
    }
  }
`;

const ZoomPad = () => {
  const { data, isError } = useMap();
  const { t } = useTranslation();
  const setScale = useSetAtom(Scale);
  const [showLocationToolTip, setShowLocationTooltip] = useAtom(isShowLocationTooltip);
  const [showRoadToolTip, setShowRoadTooltip] = useAtom(isShowRoadTooltip);
  const [showLocation, setShowLocation] = useAtom(isShowLocation);
  const [showRoad, setShowRoad] = useAtom(isShowRoad);

  if (isError || !data) return;
  return (
    <ZoomPadWrap>
      <Tooltip title={t('map_tool.zoom_in')}>
        <StyledButton onClick={() => setScale((pre) => pre + 0.035)} icon={<PlusOutlined />} />
      </Tooltip>

      <Tooltip title={t('map_tool.zoom_out')}>
        <StyledButton
          onClick={() =>
            setScale((pre) => {
              return pre - 0.035;
            })
          }
          icon={<MinusOutlined />}
        />
      </Tooltip>

      <Tooltip title={t('map_tool.location')}>
        <StyledButton
          type={showLocation ? 'primary' : 'default'}
          onClick={() => setShowLocation(!showLocation)}
          icon={
            <ResponsiveSVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <title>adjust</title>
              <path
                fill={showLocation ? '#ffffff' : '#060606'}
                d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9A3,3 0 0,1 15,12Z"
              />
            </ResponsiveSVG>
          }
        />
      </Tooltip>

      <Tooltip title={t('map_tool.road')}>
        <StyledButton
          type={showRoad ? 'primary' : 'default'}
          onClick={() => setShowRoad(!showRoad)}
          icon={
            <ResponsiveSVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <title>map-marker-path</title>
              <path
                fill={showRoad ? '#ffffff' : '#060606'}
                d="M18,15A3,3 0 0,1 21,18A3,3 0 0,1 18,21C16.69,21 15.58,20.17 15.17,19H14V17H15.17C15.58,15.83 16.69,15 18,15M18,17A1,1 0 0,0 17,18A1,1 0 0,0 18,19A1,1 0 0,0 19,18A1,1 0 0,0 18,17M18,8A1.43,1.43 0 0,0 19.43,6.57C19.43,5.78 18.79,5.14 18,5.14C17.21,5.14 16.57,5.78 16.57,6.57A1.43,1.43 0 0,0 18,8M18,2.57A4,4 0 0,1 22,6.57C22,9.56 18,14 18,14C18,14 14,9.56 14,6.57A4,4 0 0,1 18,2.57M8.83,17H10V19H8.83C8.42,20.17 7.31,21 6,21A3,3 0 0,1 3,18C3,16.69 3.83,15.58 5,15.17V14H7V15.17C7.85,15.47 8.53,16.15 8.83,17M6,17A1,1 0 0,0 5,18A1,1 0 0,0 6,19A1,1 0 0,0 7,18A1,1 0 0,0 6,17M6,3A3,3 0 0,1 9,6C9,7.31 8.17,8.42 7,8.83V10H5V8.83C3.83,8.42 3,7.31 3,6A3,3 0 0,1 6,3M6,5A1,1 0 0,0 5,6A1,1 0 0,0 6,7A1,1 0 0,0 7,6A1,1 0 0,0 6,5M11,19V17H13V19H11M7,13H5V11H7V13Z"
              />
            </ResponsiveSVG>
          }
        />
      </Tooltip>

      <Tooltip title={t('map_tool.location_tooltip')}>
        <StyledButton
          type={showLocationToolTip ? 'primary' : 'default'}
          onClick={() => setShowLocationTooltip(!showLocationToolTip)}
          icon={
            <ResponsiveSVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <title>map-marker-question-outline</title>
              <path
                fill={showLocationToolTip ? '#ffffff' : '#060606'}
                d="M12,1C7.59,1 4,4.59 4,9C4,14.57 10.96,22.34 11.26,22.67L12,23.5L12.74,22.67C13.04,22.34 20,14.57 20,9C20,4.59 16.41,1 12,1M12,20.47C9.82,17.86 6,12.54 6,9A6,6 0 0,1 12,3A6,6 0 0,1 18,9C18,12.83 13.75,18.36 12,20.47M11.13,14H12.88V15.75H11.13M12,5A3.5,3.5 0 0,0 8.5,8.5H10.25A1.75,1.75 0 0,1 12,6.75A1.75,1.75 0 0,1 13.75,8.5C13.75,10.26 11.13,10.04 11.13,12.88H12.88C12.88,10.91 15.5,10.69 15.5,8.5A3.5,3.5 0 0,0 12,5Z"
              />
            </ResponsiveSVG>
          }
        />
      </Tooltip>

      <Tooltip title={t('map_tool.road_tooltip')}>
        <StyledButton
          type={showRoadToolTip ? 'primary' : 'default'}
          onClick={() => setShowRoadTooltip(!showRoadToolTip)}
          icon={
            <ResponsiveSVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <title>map-marker-path</title>
              <path
                fill={showRoadToolTip ? '#ffffff' : '#060606'}
                d="M18,15A3,3 0 0,1 21,18A3,3 0 0,1 18,21C16.69,21 15.58,20.17 15.17,19H14V17H15.17C15.58,15.83 16.69,15 18,15M18,17A1,1 0 0,0 17,18A1,1 0 0,0 18,19A1,1 0 0,0 19,18A1,1 0 0,0 18,17M18,8A1.43,1.43 0 0,0 19.43,6.57C19.43,5.78 18.79,5.14 18,5.14C17.21,5.14 16.57,5.78 16.57,6.57A1.43,1.43 0 0,0 18,8M18,2.57A4,4 0 0,1 22,6.57C22,9.56 18,14 18,14C18,14 14,9.56 14,6.57A4,4 0 0,1 18,2.57M8.83,17H10V19H8.83C8.42,20.17 7.31,21 6,21A3,3 0 0,1 3,18C3,16.69 3.83,15.58 5,15.17V14H7V15.17C7.85,15.47 8.53,16.15 8.83,17M6,17A1,1 0 0,0 5,18A1,1 0 0,0 6,19A1,1 0 0,0 7,18A1,1 0 0,0 6,17M6,3A3,3 0 0,1 9,6C9,7.31 8.17,8.42 7,8.83V10H5V8.83C3.83,8.42 3,7.31 3,6A3,3 0 0,1 6,3M6,5A1,1 0 0,0 5,6A1,1 0 0,0 6,7A1,1 0 0,0 7,6A1,1 0 0,0 6,5M11,19V17H13V19H11M7,13H5V11H7V13Z"
              />
            </ResponsiveSVG>
          }
        />
      </Tooltip>
    </ZoomPadWrap>
  );
};

export default memo(ZoomPad);
