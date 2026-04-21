import Layout, { Content } from "antd/es/layout/layout";
import { useIsMobile } from "@/hooks/useIsMoblie";
import Header from "@/components/Header";
import { FC } from "react";
import { Flex } from "antd";
import WarningTable from "./WarningTable";
import AlarmTable from "./AlarmTable";

const Record: FC = () => {
  return (
    <Content>
      <Flex>
        <WarningTable />
        <AlarmTable />
      </Flex>
    </Content>
  );
};

export default Record;

