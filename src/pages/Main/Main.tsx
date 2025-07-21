import React from 'react';
import { Layout } from 'antd';
import WebView from './components/WebView/WebView';
import Header from '../../components/Header';
import './components/PadViwe/style.css';
import PadView from './components/PadViwe/PadView';
import { useIsMobile } from '@/hooks/useIsMoblie';

// import { Scene } from './3D'
// import CarCardWrap from './Car_Card/CardWrap'
// import MissionWrap from './Mission_Card/MissionWrap'

const Main: React.FC = () => {
  const { isMobile } = useIsMobile();
  return (
    <Layout style={{ height: `${isMobile ? '100dvh' : '100%'}` }}>
      <Header isMobile={isMobile}></Header>
      {isMobile ? (
        <>
          <Layout style={{ height: '100%' }}>
            <PadView></PadView>
          </Layout>
        </>
      ) : (
        <WebView></WebView>
      )}
    </Layout>
  );
};

export default Main;
