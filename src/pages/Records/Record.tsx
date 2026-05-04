import styled from "styled-components";
import Layout, { Content } from "antd/es/layout/layout";
import { FC } from "react";
import { Flex } from "antd";
import WarningTable from "./WarningTable";
import AlarmTable from "./AlarmTable";
import SystemAlarmTable from "./SystemAlarmTable";
import Header from "@/components/Common/Header";

const StyledLayout = styled(Layout)`
  min-height: 100dvh;
  height: 100%;
`;

const StyledContent = styled(Content)`
  padding: 16px;
  overflow: auto;

  @media (max-width: 768px) {
    padding: 8px;
  }
`;

const TableGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  width: 100%;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`;

const Record: FC = () => {
  return (
    <StyledLayout>
      <Header isMobile={false} />
      <StyledContent>
        <TableGrid>
          <SystemAlarmTable />
          <WarningTable />
          <AlarmTable />
        </TableGrid>
      </StyledContent>
    </StyledLayout>
  );
};

export default Record;

