//import AMRPerformance from './AMRPerformance';
import Header from "@/components/Common/Header";
import { Layout } from "antd";
import { BatteryUsageChart } from "./BatteryUsageChart";
import ChartsOverview from "./ChartsOverview";
import { DistancePerMissionChart } from "./DistancePerMissionChart";
import { MissionsOverTimeChart } from "./MissionsOverTimeChart";
import MissionSummary from "./MissionSummary";
import MissionTable from "./MissionTable";
import { DashboardContainer } from "./styles";
import WarningsPanel from "./WarningsPanel";
import { useIsMobile } from "@/hooks/useIsMoblie";

const MissionAnalysis = () => {
  const { isMobile } = useIsMobile();
  return (
    <Layout style={{ height: `${isMobile ? "100dvh" : "100%"}` }}>
      <Header isMobile={isMobile}></Header>
      <DashboardContainer>
        <MissionSummary />
        {/* <AMRPerformance /> */}
        <ChartsOverview />
        <BatteryUsageChart />
        <DistancePerMissionChart />
        <MissionsOverTimeChart />
        <MissionTable />
        <WarningsPanel />
      </DashboardContainer>
    </Layout>
  );
};

export default MissionAnalysis;
