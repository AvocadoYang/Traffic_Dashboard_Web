import { Card, Layout, List, Typography } from 'antd';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { useIsMobile } from '@/hooks/useIsMoblie';
import { useAllAmrStatus } from '@/sockets/useAMRInfo';
import { useTranslation } from 'react-i18next';

const { Title } = Typography;

const Container = styled.div`
  max-width: 700px;
  width: 100%;
  margin: 40px auto;
  padding: 24px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;

  @media (max-width: 800px) {
    padding: 12px;
    max-width: 98vw;
  }
  @media (max-width: 500px) {
    padding: 4vw 2vw;
    border-radius: 8px;
    margin: 8px auto;
  }
`;

const StyledCard = styled(Card)`
  width: 100%;
  max-width: 340px;
  min-width: 0;
  box-sizing: border-box;
  transition: box-shadow 0.2s;
  &:hover {
    box-shadow: 0 8px 32px rgba(24, 144, 255, 0.15);
    border-color: #1890ff;
  }
  @media (max-width: 500px) {
    max-width: 100%;
    font-size: 0.95em;
    padding: 8px 0;
  }
`;

const Status = styled.span<{ status: string }>`
  color: ${({ status }) =>
    status === 'Active' ? '#52c41a' : status === 'Charging' ? '#faad14' : '#bfbfbf'};
  font-weight: bold;
`;

const AmrList = () => {
  const { isMobile } = useIsMobile();
  const data = useAllAmrStatus();
  const { t } = useTranslation();

  // Responsive columns: 2 for desktop/tablet, 1 for mobile
  const columns = isMobile ? 1 : 2;

  return (
    <Layout style={{ height: `${isMobile ? '100dvh' : '100%'}` }}>
      <Header isMobile={isMobile}></Header>
      <Container>
        <Title
          level={2}
          style={{ textAlign: 'center', marginBottom: 32, fontSize: isMobile ? 22 : 28 }}
        >
          {t('page_amr')}
        </Title>
        <List
          grid={{ gutter: 24, column: columns }}
          dataSource={data}
          locale={{ emptyText: t('utils.none') }}
          renderItem={(amr) => {
            let amrId = amr.amrId;
            if (amrId.startsWith('/#')) {
              amrId = 'mock-' + amrId.slice(2);
            } else if (amrId.startsWith('#')) {
              amrId = 'mock-' + amrId.slice(1);
            }
            return (
              <List.Item
                style={
                  data.length === 1
                    ? { width: '100%', display: 'flex', justifyContent: 'center' }
                    : undefined
                }
              >
                <Link to={`/amr/${amrId}`} style={{ width: '100%', display: 'block' }}>
                  <StyledCard
                    hoverable
                    style={data.length === 1 ? { width: '100%', maxWidth: 340 } : undefined}
                  >
                    <Title level={4} style={{ fontSize: isMobile ? 18 : 22 }}>
                      {amr.amrId}
                    </Title>
                    <div>
                      {t('utils.status')}:{' '}
                      <Status status={amr.isOnline ? (amr.isOverdue ? 'Error' : 'Active') : 'Idle'}>
                        {amr.isOnline
                          ? amr.isOverdue
                            ? t('utils.error')
                            : t('utils.active')
                          : t('utils.inactive')}
                      </Status>
                    </div>
                    <div>
                      {t('utils.online')}/{t('utils.offline')}:&nbsp;
                      <Status status={amr.isOnline ? 'Active' : 'Idle'}>
                        {amr.isOnline ? t('utils.online') : t('utils.offline')}
                      </Status>
                    </div>
                    <div>
                      {t('utils.road_conditions')}: <b>{amr.networkDelay} ms</b>
                    </div>
                    <div>
                      {t('utils.maintenance_level')}:{' '}
                      <Status status={amr.isPosAccurate ? 'Active' : 'Idle'}>
                        {amr.isPosAccurate ? t('utils.active') : t('utils.inactive')}
                      </Status>
                    </div>
                  </StyledCard>
                </Link>
              </List.Item>
            );
          }}
        />
      </Container>
    </Layout>
  );
};

export default AmrList;
