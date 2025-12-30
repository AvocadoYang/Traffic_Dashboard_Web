import Layout, { Content } from "antd/es/layout/layout";
import { useIsMobile } from "@/hooks/useIsMoblie";
import Header from "@/components/Header";
import { FC } from "react";
import WarningTable from "./WarningTable";
import AlarmTable from "./AlarmTable";
import { Flex } from "antd";

const Record: FC = () => {
  const { isMobile } = useIsMobile();

  return (
    <Layout style={{ height: `${isMobile ? "100dvh" : "100%"}` }}>
      <Header isMobile={isMobile}></Header>
      <Content>
        <Flex>
          <WarningTable></WarningTable>
          <AlarmTable />
        </Flex>
      </Content>
    </Layout>
  );
};

export default Record;
