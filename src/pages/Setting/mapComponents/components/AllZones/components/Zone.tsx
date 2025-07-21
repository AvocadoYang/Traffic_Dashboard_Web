import useMap from '@/api/useMap';
import { rosCoord2DisplayCoord } from '@/utils/utils';
import { FC, memo, useEffect, useState } from 'react';
import styled from 'styled-components';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { Flex } from 'antd';
import { useTranslation } from 'react-i18next';
import { showZoneForbidden } from '@/utils/gloable';
import { useSetAtom } from 'jotai';

type ZoneInfo = {
  id: string;
  category: string[];
  backgroundColor: string;
  name: string;
  startPoint: {
    startX: number;
    startY: number;
  };
  endPoint: {
    endX: number;
    endY: number;
  };
  tagSetting: {
    speed_limit: number | null;
    hight_limit: number | null;
    forbidden_car: (string | undefined)[];
    limitNum: number | null;
  };
};

const Frame = styled.div.attrs<{
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
}>(({ left, top, width, height, color }) => ({
  style: {
    left,
    top,
    width: `${width}px`,
    height: `${height}px`,
    background: color,
    border: '2px solid rgba(251, 23, 3, 0.32)'
  }
}))<{
  left: number;
  top: number;
}>`
  box-sizing: border-box;
  position: absolute;
`;

const FrameName = styled.div.attrs<{
  left: number;
  top: number;
}>(({ left, top }) => ({
  style: {
    left,
    top
  }
}))<{
  left: number;
  top: number;
}>`
  z-index: 100;
  font-size: 1em;
  box-sizing: border-box;
  position: absolute;
`;

const Zone: FC<{ id: string; info: ZoneInfo; scale: number }> = ({ id, info }) => {
  const { data } = useMap();
  const [axis, setAxis] = useState({ x: -5000, y: -5000 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!data) return;

    const [startXDisplay, startYDisplay] = rosCoord2DisplayCoord({
      x: info.startPoint.startX,
      y: info.startPoint.startY,
      mapHeight: data.mapHeight,
      mapOriginX: data.mapOriginX,
      mapOriginY: data.mapOriginY,
      mapResolution: data.mapResolution
    });

    const [endXDisplay, endYDisplay] = rosCoord2DisplayCoord({
      x: info.endPoint.endX,
      y: info.endPoint.endY,
      mapHeight: data.mapHeight,
      mapOriginX: data.mapOriginX,
      mapOriginY: data.mapOriginY,
      mapResolution: data.mapResolution
    });

    setAxis({ x: Math.min(startXDisplay, endXDisplay), y: Math.min(startYDisplay, endYDisplay) });
    setSize({
      width: Math.abs(endXDisplay - startXDisplay),
      height: Math.abs(endYDisplay - startYDisplay)
    });
  }, [info, data]);

  if (!data) return;
  return (
    <>
      <FrameName left={axis.x} top={axis.y - 18} draggable={false}>
        {hidden ? (
          <EyeOutlined style={{ cursor: 'pointer' }} onClick={() => setHidden(false)} />
        ) : (
          <EyeInvisibleOutlined style={{ cursor: 'pointer' }} onClick={() => setHidden(true)} />
        )}
      </FrameName>
      <Tooltip color="rgba(0, 0, 0, 0.4)" title={<FrameInfo info={info}></FrameInfo>}>
        <FrameName left={axis.x + 22} top={axis.y - 20} draggable={false}>
          <p onClick={() => {}} style={{ cursor: 'pointer' }}>{` ${info.name}`}</p>
        </FrameName>
      </Tooltip>
      {hidden ? (
        []
      ) : (
        <Frame
          id={id}
          left={axis.x}
          top={axis.y}
          height={size.height}
          width={size.width}
          color={info.backgroundColor}
          draggable={false}
        ></Frame>
      )}
    </>
  );
};

const FrameInfo: FC<{ info: ZoneInfo }> = ({ info }) => {
  const { category } = info;
  const { t } = useTranslation();
  const setZoneForbidden = useSetAtom(showZoneForbidden);

  return (
    <Flex gap="middle" vertical>
      {category.includes('減速區') ? (
        <div>
          <p style={{ color: 'yellow' }}>{`${t('edit_zone_panel.deceleration_zone')}: `}</p>
          <p>{`${t('edit_zone_panel.highest_speed')} - ${info.tagSetting.speed_limit} (m/s)`}</p>
        </div>
      ) : (
        []
      )}
      {category.includes('限高區') ? (
        <div>
          <p style={{ color: 'yellow' }}>{`${t('edit_zone_panel.height_limit_zone')}: `}</p>
          <p>{`${t('edit_zone_panel.hight_limit')} - ${info.tagSetting.hight_limit} (mm)`}</p>
        </div>
      ) : (
        []
      )}
      {category.includes('限制區') ? (
        <div>
          <p style={{ color: 'yellow' }}>{`${t('edit_zone_panel.controlled_zone')}: `}</p>
          <p>{`${t('edit_zone_panel.limit_count')} - ${info.tagSetting.limitNum} `}</p>
        </div>
      ) : (
        []
      )}
      {category.includes('禁止區') ? (
        <div style={{ fontWeight: 'bold' }}>
          <p style={{ color: 'yellow' }}>{`${t('edit_zone_panel.restricted_zone')}: `}</p>
          {info.tagSetting.forbidden_car.length == 0 ? (
            <p>{`- ${t('edit_zone_panel.free_zone')} `}</p>
          ) : info.tagSetting.forbidden_car.includes('*') ? (
            <p>{`- ${t('edit_zone_panel.all_vehicle_forbidden')} `}</p>
          ) : (
            <p
              style={{ cursor: 'pointer', color: '#13dff2' }}
              onClick={(e) => {
                e.stopPropagation();
                setZoneForbidden(new Set(info.tagSetting.forbidden_car as string[]));
              }}
            >{`- 查看限制車輛 `}</p>
          )}
        </div>
      ) : (
        []
      )}
    </Flex>
  );
};

export default memo(Zone);
