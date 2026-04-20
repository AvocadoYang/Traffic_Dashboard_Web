// import Layout, { Content } from "antd/es/layout/layout";
// import { useIsMobile } from "@/hooks/useIsMoblie";
// // import Header from "@/components/common/Header";
// import { FC } from "react";
// import WarningTable from "./WarningTable";
// import AlarmTable from "./AlarmTable";
// import { Flex } from "antd";

// const Record: FC = () => {
//   const { isMobile } = useIsMobile();

//   return (
//     <Layout style={{ height: `${isMobile ? "100dvh" : "100%"}` }}>
//       <Header isMobile={isMobile}></Header>
//       <Content>
//         <Flex>
//           <WarningTable></WarningTable>
//           <AlarmTable />
//         </Flex>
//       </Content>
//     </Layout>
//   );
// };

// export default Record;

import { Content } from "antd/es/layout/layout";
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

