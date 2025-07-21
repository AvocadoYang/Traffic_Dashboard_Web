import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Typography, Tag, Progress, Descriptions, Table, Button, Modal, Flex } from 'antd';
import styled from 'styled-components';
import ReactJsonView from '@uiw/react-json-view';
import {
  ArrowLeftOutlined
  // UpOutlined,
  // DownOutlined,
  // LeftOutlined,
  // RightOutlined,
} from '@ant-design/icons';
import {
  useAMRAllIO,
  useAmrDetail,
  useAmrPose,
  useIsCarry,
  useIsLogIn,
  useMaintenanceStatus
} from '@/sockets/useAMRInfo';
import { useRecentMission } from '@/sockets/useMissions';
import { useTranslation } from 'react-i18next';
import DPad from './DPad';
import EditCargoCarrier from '../Main/Car_Card/components/EditCargoCarrier';

const { Title, Text } = Typography;

const Container = styled.div`
  max-width: 700px;
  margin: 40px auto;
  padding: 24px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  max-height: 90vh;
  overflow-y: scroll;

  @media (max-width: 900px) {
    max-width: 98vw;
    padding: 12px;
    margin: 16px auto;
  }
  @media (max-width: 600px) {
    padding: 4vw 2vw;
    border-radius: 8px;
    margin: 8px auto;
  }
`;

const PoseWrapper = styled.div`
  max-width: 15em;
  min-width: 15em;
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  margin-bottom: 16px;

  .ant-table {
    min-width: 480px;
  }

  @media (max-width: 600px) {
    .ant-table {
      min-width: 360px;
    }
  }
`;

const FixedDescWrapper = styled.div`
  position: relative;
  overflow: hidden;
  padding-right: 24px;

  .ant-descriptions {
    margin-bottom: 0;
  }

  @media (max-width: 600px) {
    padding-right: 16px;
  }
`;

const StatusWrapper = styled.div`
  height: 2em;
  width: 15em;
  text-overflow: clip;
`;

const AmrDetail = () => {
  const { amrId } = useParams<{ amrId: string }>();
  let prefixAmrId = '';
  if (amrId?.startsWith('mock')) {
    prefixAmrId = `#` + amrId.slice(5);
  } else {
    prefixAmrId = amrId || '';
  }

  const amr = useAmrDetail(prefixAmrId || '');
  const currier = useIsCarry(prefixAmrId || '');
  const maintenance = useMaintenanceStatus(prefixAmrId || '');
  const { pose } = useAmrPose(prefixAmrId || '');
  const { recentMission } = useRecentMission(prefixAmrId || '');
  const connectionStatus = useIsLogIn(prefixAmrId || '');
  const io = useAMRAllIO(prefixAmrId || '');
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [showCargoMetadata, setShowCargoMetadata] = useState(false);
  const [showIO, setShowIO] = useState(false);
  const [editCargoModalOpen, setEditCargoModalOpen] = useState(false);
  const { t } = useTranslation();

  // Prepare table data from recentMission
  const missionTasks = recentMission
    ? [
        {
          key: recentMission.missionId,
          id: recentMission.missionId,
          desc: recentMission.full_name?.join(' / ') || recentMission.sub_name || '-',
          status: recentMission.missionStatus,
          time: recentMission.startedAt
            ? new Date(recentMission.startedAt).toLocaleTimeString()
            : '-'
        }
      ]
    : [];

  return (
    <>
      <Container>
        <Link to="/amr">
          <Button icon={<ArrowLeftOutlined />}>{t('amr_detail.back')}</Button>
        </Link>
        {amr ? (
          <>
            <Flex vertical gap="small">
              <Title level={2} style={{ marginBottom: 0, fontSize: '2rem' }}>
                {prefixAmrId}
              </Title>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap',
                  marginBottom: 16
                }}
              >
                <Tag color={connectionStatus.isOnline ? 'green' : 'red'}>
                  {connectionStatus.isOnline ? t('amr_detail.online') : t('amr_detail.offline')}
                </Tag>
                <Tag color={connectionStatus.isOverdue ? 'red' : 'blue'}>
                  {connectionStatus.isOverdue ? t('amr_detail.overdue') : t('amr_detail.normal')}
                </Tag>
                <Tag color={connectionStatus.isPosAccurate ? 'green' : 'orange'}>
                  {connectionStatus.isPosAccurate
                    ? t('amr_detail.accurate')
                    : t('amr_detail.inaccurate')}
                </Tag>
                <Tag color="default">
                  {t('amr_detail.delay', { ms: connectionStatus.networkDelay })}
                </Tag>
              </div>
            </Flex>
            <FixedDescWrapper>
              <Descriptions bordered column={1} size="middle" style={{ marginBottom: 24 }}>
                <Descriptions.Item label={t('amr_detail.battery')}>
                  <Progress
                    percent={amr.battery}
                    size="small"
                    status={amr.battery < 20 ? 'exception' : 'active'}
                  />
                </Descriptions.Item>

                <Descriptions.Item label={t('amr_detail.status')}>
                  <StatusWrapper>{amr.status || '-'}</StatusWrapper>
                </Descriptions.Item>

                <Descriptions.Item label={t('amr_detail.location')}>
                  <Text>{amr.locationId || '-'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={t('amr_detail.current_position')}>
                  <Text>
                    {pose && typeof pose === 'object' ? (
                      <PoseWrapper>
                        {`x: ${pose.x ?? '-'}, y: ${pose.y ?? '-'}, θ: ${pose.yaw ?? '-'}`}
                      </PoseWrapper>
                    ) : (
                      <PoseWrapper>-</PoseWrapper>
                    )}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label={t('amr_detail.carrying_cargo')}>
                  {currier.isCarry ? (
                    <>
                      <Tag color="volcano">{t('utils.yes')}</Tag>
                      <Button
                        size="small"
                        style={{ marginLeft: 8 }}
                        onClick={() => setShowCargoMetadata(true)}
                      >
                        {t('amr_detail.show_cargo_metadata')}
                      </Button>
                      <Button
                        size="small"
                        type="primary"
                        style={{ marginLeft: 8 }}
                        onClick={() => setEditCargoModalOpen(true)}
                      >
                        {t('amr_card.update_cargo')}
                      </Button>
                    </>
                  ) : (
                    t('utils.no')
                  )}
                </Descriptions.Item>
                <Descriptions.Item label={t('amr_detail.maintenance')}>
                  <Text>
                    {maintenance && typeof maintenance === 'object'
                      ? maintenance.status || JSON.stringify(maintenance)
                      : maintenance
                        ? String(maintenance)
                        : '-'}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </FixedDescWrapper>
            <Button
              type="primary"
              onClick={() => setShowControlPanel((v) => !v)}
              style={{ marginBottom: showControlPanel ? 0 : 24, width: '100%', maxWidth: 300 }}
            >
              {showControlPanel ? t('amr_detail.hide_manual') : t('amr_detail.show_manual')}
            </Button>
            {showControlPanel && <DPad amrId={prefixAmrId} />}

            <Button
              type="primary"
              onClick={() => setShowIO((v) => !v)}
              style={{ marginBottom: 12, width: '100%', maxWidth: 300, marginLeft: 8 }}
            >
              {showIO ? t('amr_detail.hide_io', '隱藏 IO') : t('amr_detail.show_io', '顯示 IO')}
            </Button>
            {showIO && (
              <Card style={{ marginTop: 16, padding: 16 }}>
                <Title level={4} style={{ fontSize: '1.1em' }}>
                  {t('amr_detail.io')}
                </Title>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {io && Object.keys(io).length > 0 ? (
                    <ReactJsonView
                      displayDataTypes={false}
                      value={io}
                      collapsed={false}
                      enableClipboard={false}
                      style={{ fontSize: 14 }}
                    />
                  ) : (
                    t('amr_detail.no_io')
                  )}
                </pre>
              </Card>
            )}
            <Title level={4} style={{ fontSize: '1.1em' }}>
              {t('amr_detail.recent_tasks')}
            </Title>
            <TableWrapper>
              <Table
                dataSource={missionTasks}
                pagination={false}
                size="small"
                columns={[
                  {
                    title: t('amr_detail.task_id'),
                    dataIndex: 'id',
                    key: 'id',
                    render(value: string) {
                      return `${value.slice(0, 5)}...`;
                    }
                  },
                  { title: t('amr_detail.desc'), dataIndex: 'desc', key: 'desc' },
                  {
                    title: t('amr_detail.status'),
                    dataIndex: 'status',
                    key: 'status',
                    render: (status) => (
                      <Tag
                        color={
                          status === 'Completed'
                            ? 'green'
                            : status === 'In Progress'
                              ? 'blue'
                              : 'default'
                        }
                      >
                        {t('amr_detail.status')}: {status}
                      </Tag>
                    )
                  },
                  { title: t('amr_detail.time'), dataIndex: 'time', key: 'time' }
                ]}
                style={{ marginTop: 12 }}
                locale={{ emptyText: t('amr_detail.no_mission') }}
              />
            </TableWrapper>
          </>
        ) : (
          <Card>
            <Title level={4}>{t('amr_detail.amr_not_found')}</Title>
            <Text type="secondary">{t('amr_detail.no_data')}</Text>
          </Card>
        )}
      </Container>
      <Modal
        open={showCargoMetadata}
        onCancel={() => setShowCargoMetadata(false)}
        footer={null}
        title={t('amr_detail.cargo_metadata')}
      >
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {Array.isArray(currier.cargo) && currier.cargo.length > 0
            ? currier.cargo.map((cargo, idx) =>
                cargo.metadata && cargo.metadata !== 'null' ? (
                  <div key={idx} style={{ marginBottom: 16 }}>
                    <b>
                      {t('amr_detail.carrying_cargo')} #{idx + 1}
                    </b>
                    <ReactJsonView
                      displayDataTypes={false}
                      value={
                        typeof cargo.metadata === 'string'
                          ? JSON.parse(cargo.metadata)
                          : cargo.metadata
                      }
                      collapsed={false}
                      enableClipboard={false}
                      style={{ fontSize: 14 }}
                    />
                  </div>
                ) : (
                  <div key={idx}>
                    <b>
                      {t('amr_detail.carrying_cargo')} #{idx + 1}
                    </b>
                    <div>{t('amr_detail.no_metadata')}</div>
                  </div>
                )
              )
            : t('amr_detail.no_metadata')}
        </pre>
      </Modal>
      <EditCargoCarrier
        amrId={prefixAmrId}
        isModalOpen={editCargoModalOpen}
        setIsModalOpen={setEditCargoModalOpen}
      />
    </>
  );
};

export default AmrDetail;
