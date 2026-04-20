import React from "react";
// import Header from "../../components/common/Header";
import { Layout } from "antd";
import { useIsMobile } from "@/hooks/useIsMoblie";

const Register: React.FC = () => {
  const { isMobile } = useIsMobile();
  // const sceneRef = useRef<HTMLDivElement>(null);
  return (
    <Layout style={{ height: `${isMobile ? "100dvh" : "100%"}` }}>
      <Header isMobile={isMobile}></Header>
    </Layout>
  );
};

export default Register;
