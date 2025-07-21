import { memo } from 'react';
import Card from './Card';
import { Flex } from 'antd';
import useName from '@/api/useAmrName';
import { useMockInfo } from '@/sockets/useMockInfo';

const Cards: React.FC<{}> = () => {
  const { data: names } = useName();
  const mockRobot = useMockInfo();

  if (!names || !names.amrs.length) return;
  if (mockRobot && mockRobot.isSimulate) {
    return (
      <Flex align="center" justify="center" wrap gap="middle" style={{ width: '95%' }}>
        {mockRobot?.robot
          ?.filter((v) => v.script_placement_location !== 'unset')
          .map((v) => {
            return <Card key={v.id} id={v.id as string} />;
          })}
      </Flex>
    );
  }
  return (
    <Flex align="center" justify="center" wrap gap="middle" style={{ width: '95%' }}>
      {names.amrs
        .filter((v) => v.isReal)
        .map((item) => (
          <Card key={item.amrId} id={item.amrId}></Card>
        ))}
    </Flex>
  );
};

export default memo(Cards);
