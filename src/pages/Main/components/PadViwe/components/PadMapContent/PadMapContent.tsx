import { Layout } from 'antd';
import { CloseBtn, ZoomPad } from './component/ZomPadAndCloseBtn';
import { memo, useRef, useState } from 'react';
import PadMapView from './component/PadMapView';

const { Content } = Layout;

const PadMapContent = () => {
  const mapRef = useRef(null);
  const [scale, setScale] = useState(0.5);
  return (
    <Content className="pad-map-content">
      <PadMapView scale={scale} mapRef={mapRef}></PadMapView>
      <CloseBtn></CloseBtn>
      <ZoomPad setScale={setScale}></ZoomPad>
    </Content>
  );
};

export default memo(PadMapContent);
