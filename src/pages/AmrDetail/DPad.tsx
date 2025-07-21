import { FC } from 'react';
import { RedoOutlined, StopOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { Button, Flex, message, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';
import client from '@/api/axiosClient';
import { useMutation } from '@tanstack/react-query';

const { Title } = Typography;
const ControlPanel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 24px 0;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  width: 100%;
`;

// const DPad = styled.div`
//   display: grid;
//   grid-template-columns: repeat(3, 1fr);
//   grid-template-rows: repeat(2, 1fr);
//   gap: 8px;
//   justify-items: center;
//   align-items: center;
//   width: 180px;
//   background: #f9f9f9;
//   padding: 8px;

//   @media (max-width: 600px) {
//     width: 120px;
//     gap: 4px;
//   }
// `;

const DPadRow = styled.div`
  display: flex;
  width: 100%;
  gap: 16px;
  justify-content: center;
  align-items: flex-start;
  margin-bottom: 8px;

  @media (max-width: 600px) {
    gap: 8px;
  }
`;

// const DPadMain = styled(DPad)`
//   flex: 0 1 70%;
//   max-width: 70%;
//   height: 14em;
// `;

const DPadSide = styled.div`
  flex: 0 1 40%;
  max-width: 380px;
  height: 14em; // increased from 10em
  padding: 0.8em;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  background: #f9f9f9;
`;

const DPad: FC<{ amrId: string }> = ({ amrId }) => {
  const { t } = useTranslation();

  const [messageApi, contextHolder] = message.useMessage();

  const forceIdleMutation = useMutation({
    mutationFn: () => {
      return client.post('api/amr/force-idle', { amrId });
    },
    onSuccess: () => {
      messageApi.success(t('utils.success'));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const resetMutation = useMutation({
    mutationFn: () => {
      return client.post('api/amr/reset', { amrId });
    },
    onSuccess: () => {
      messageApi.success(t('utils.success'));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const pauseMutation = useMutation({
    mutationFn: (isStop: boolean) => {
      return client.post('api/amr/emergency-stop', { amrId, isStop });
    },
    onSuccess: () => {
      messageApi.success(t('utils.success'));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  return (
    <>
      {contextHolder}
      <ControlPanel>
        <Title level={4} style={{ marginBottom: 12, fontSize: '1.2em' }}>
          {t('amr_detail.manual_operation')}
        </Title>
        <DPadRow>
          {/*
                      <DPadMain>
                        <div />
                        <Button icon={<UpOutlined />} />
                        <div />
                        <Button icon={<LeftOutlined />} />
                        <Button icon={<DownOutlined />} />
                        <Button icon={<RightOutlined />} />
                      </DPadMain>
                       */}
          <DPadSide>
            <Flex vertical gap="middle">
              <Button
                onClick={() => forceIdleMutation.mutate()}
                icon={<RedoOutlined />}
                type="default"
                aria-label="force_to_standby"
              >
                {t('amr_detail.force_to_standby')}
              </Button>
              <Button
                onClick={() => resetMutation.mutate()}
                icon={<RedoOutlined />}
                type="primary"
                style={{ background: '#faad14', borderColor: '#faad14', color: '#fff' }}
                aria-label="Reset AMR position"
              >
                {t('amr_detail.reset')}
              </Button>
              <Button
                onClick={() => pauseMutation.mutate(false)}
                style={{ background: '#92fa14', borderColor: '#92fa14', color: '#fff' }}
                icon={<StopOutlined />}
                aria-label="continue AMR"
              >
                {t('amr_detail.continue')}
              </Button>
              <Button
                onClick={() => pauseMutation.mutate(true)}
                icon={<StopOutlined />}
                danger
                aria-label="Emergency stop AMR"
              >
                {t('amr_detail.stop')}
              </Button>
            </Flex>
          </DPadSide>
        </DPadRow>
      </ControlPanel>
    </>
  );
};

export default DPad;
