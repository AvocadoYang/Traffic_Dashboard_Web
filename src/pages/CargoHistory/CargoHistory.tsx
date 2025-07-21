import Layout, { Content } from 'antd/es/layout/layout';
import HistoryTable from './HIstoryTable';
import { useIsMobile } from '@/hooks/useIsMoblie';
import Header from '@/components/Header';

const CargoHistory = () => {
  const { isMobile } = useIsMobile();
  return (
    <Layout style={{ height: `${isMobile ? '100dvh' : '100%'}` }}>
      <Header isMobile={isMobile}></Header>
      <Content>
        <HistoryTable />
      </Content>
    </Layout>
  );
};

export default CargoHistory;
