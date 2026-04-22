import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import { useIsMobile } from "@/hooks/useIsMoblie";
import Header from "@/components/Common/Header/Header";

const MainLayout = () => {
  const { isMobile } = useIsMobile();

  return (
    <Layout style={{ height: isMobile ? "100dvh" : "100%" }}>
      <Header isMobile={isMobile} />
      <Outlet />
    </Layout>
  );
};

export default MainLayout;