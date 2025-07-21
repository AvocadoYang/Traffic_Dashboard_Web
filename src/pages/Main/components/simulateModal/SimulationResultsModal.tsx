import useSimResult from '@/api/useSimResult';
import { Modal, Typography, Space, Button, Table } from 'antd';
import { ColumnType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const StatItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
`;

const StatLabel = styled(Typography.Text)`
  font-weight: 500;
  color: #666;
`;

const StatValue = styled(Typography.Text)`
  color: #1a1a1a;
`;

const NoResult = styled.span`
  font-size: 1.2em;
  color: #bcbcbc;
`;

const StyledTable = styled(Table)`
  margin-top: 16px;
  .ant-table-thead > tr > th {
    background: #fafafa;
    font-weight: 500;
    color: #666;
  }
  .ant-table-tbody > tr > td {
    color: #1a1a1a;
  }
`;
type Mock_Result = {
  amrId: string;
  missionsPerAmr: number;
  batteryCostPerAmr: number;
  averageMissionTimePerAmr: number;
  totalDistanceTraveledPerAmr: number;
  cargoCarryPerAmr: number;
};

interface SimulationResultsModalProps {
  visible: boolean;
  onClose: () => void;
}

const SimulationResultsModal: React.FC<SimulationResultsModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const { data: result } = useSimResult();
  const handleDownload = () => {
    if (!result) return;
    const dataStr = JSON.stringify(result, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `simulation_results_${result.simulationId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const columns: Array<ColumnType<Mock_Result>> = [
    {
      title: t('sim.results.table.amr_id'),
      dataIndex: 'amrId',
      key: 'amrId'
    },
    {
      title: t('sim.results.table.missions'),
      dataIndex: 'missionsPerAmr',
      key: 'missionsPerAmr',
      render: (_, record: Mock_Result) => {
        return `${record.missionsPerAmr} ${t('utils.missions')}`;
      }
    },
    {
      title: t('sim.results.table.battery_cost'),
      dataIndex: 'batteryCost',
      key: 'batteryCost',
      render: (_, record: Mock_Result) => `${record.batteryCostPerAmr} ${t('utils.units')}`
    },
    {
      title: t('sim.results.table.average_mission_time'),
      dataIndex: 'averageMissionTime',
      key: 'averageMissionTime',
      render: (_, record: Mock_Result) => `${record.averageMissionTimePerAmr} ${t('utils.seconds')}`
    },
    {
      title: t('sim.results.table.total_distance_traveled'),
      dataIndex: 'totalDistanceTraveled',
      key: 'totalDistanceTraveled',
      render: (_, record: Mock_Result) =>
        `${record.totalDistanceTraveledPerAmr} ${t('utils.meters')}`
    },
    {
      title: t('sim.results.table.carried'),
      dataIndex: 'cargoCarryPerAmr',
      key: 'cargoCarryPerAmr',
      render: (_, record) => `${record.cargoCarryPerAmr}`
    }
  ];

  return (
    <Modal
      title={t('sim.results.title')}
      open={visible}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={handleDownload} disabled={result?.table === undefined}>
            {t('sim.results.download')}
          </Button>
          <Button type="primary" onClick={onClose}>
            {t('utils.close')}
          </Button>
        </Space>
      }
      width={800}
      centered
    >
      {result && result.table ? (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <StatItem>
            <StatLabel>{t('sim.results.duration')}</StatLabel>
            <StatValue>
              {result.duration} {t('utils.minutes')}
            </StatValue>
          </StatItem>

          <StatItem>
            <StatLabel>{t('sim.results.cargos_carried')}</StatLabel>
            <StatValue>{result.totalCargosCarried}</StatValue>
          </StatItem>

          <StatItem>
            <StatLabel>{t('sim.results.total_missions')}</StatLabel>
            <StatValue>{result.totalMissionCount}</StatValue>
          </StatItem>

          <StatItem>
            <StatLabel>{t('sim.results.mission_success_rate')}</StatLabel>
            <StatValue>{result.missionSuccessRate.toFixed(2)}%</StatValue>
          </StatItem>

          <StatItem>
            <StatLabel>{t('sim.results.completed_missions')}</StatLabel>
            <StatValue>{result.completedMissions}</StatValue>
          </StatItem>

          <StyledTable
            columns={columns as []}
            dataSource={result.table as Mock_Result[]}
            pagination={false}
            size="middle"
            bordered
          />
        </Space>
      ) : (
        <NoResult>{t('sim.results.no_result')}</NoResult>
      )}
    </Modal>
  );
};

export default SimulationResultsModal;
