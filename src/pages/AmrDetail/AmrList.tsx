import { Card, Col, Empty, Layout, List, Row, Typography } from "antd";
import styled from "styled-components";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { useIsMobile } from "@/hooks/useIsMoblie";
import { useAllAmrStatus } from "@/sockets/useAMRInfo";
import { useTranslation } from "react-i18next";
import { RobotOutlined } from "@ant-design/icons";

const { Title } = Typography;

const IndustrialContainer = styled.div`
  max-width: 1200px;
  width: 100%;
  margin: 40px auto;
  padding: 24px;
  background: #ffffff;
  border: 2px solid #d9d9d9;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  font-family: "Roboto Mono", monospace;

  @media (max-width: 800px) {
    padding: 16px;
    margin: 20px auto;
  }
  @media (max-width: 500px) {
    padding: 12px;
    margin: 12px;
  }
`;

const PageHeader = styled.div`
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-left: 4px solid #1890ff;
  padding: 16px 20px;
  margin-bottom: 32px;
  font-family: "Roboto Mono", monospace;
  display: flex;
  align-items: center;
  gap: 12px;

  h2 {
    margin: 0;
    color: #1890ff;
    font-size: 18px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }
`;

const IndustrialCard = styled(Card)`
  width: 100%;
  border: 2px solid #d9d9d9;
  border-radius: 0;
  transition: all 0.2s;
  position: relative;
  font-family: "Roboto Mono", monospace;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 0;
    background: #1890ff;
    transition: width 0.2s;
  }

  &:hover {
    box-shadow: 0 4px 16px rgba(24, 144, 255, 0.2);
    border-color: #1890ff;
    transform: translateY(-4px);

    &::before {
      width: 4px;
    }
  }

  .ant-card-body {
    padding: 20px;
  }

  @media (max-width: 500px) {
    .ant-card-body {
      padding: 16px;
    }
  }
`;

const AmrTitle = styled(Title)`
  &&& {
    margin: 0 0 16px 0;
    color: #262626;
    font-family: "Roboto Mono", monospace;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 8px;

    @media (max-width: 500px) {
      font-size: 16px !important;
    }
  }
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px dashed #e8e8e8;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &:last-child {
    border-bottom: none;
  }

  .label {
    color: #8c8c8c;
    font-weight: 600;
  }
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: ${({ $status }) =>
    $status === "Active"
      ? "#f6ffed"
      : $status === "Charging"
        ? "#fffbe6"
        : "#fafafa"};
  border: 1px solid
    ${({ $status }) =>
      $status === "Active"
        ? "#52c41a"
        : $status === "Charging"
          ? "#faad14"
          : "#d9d9d9"};
  color: ${({ $status }) =>
    $status === "Active"
      ? "#52c41a"
      : $status === "Charging"
        ? "#faad14"
        : "#8c8c8c"};
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const NetworkDelay = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: #e6f7ff;
  border: 1px solid #1890ff;
  color: #1890ff;
  font-weight: 700;
  font-size: 10px;
`;

const AmrList = () => {
  const { isMobile } = useIsMobile();
  const data = useAllAmrStatus();
  const { t } = useTranslation();

  const columns = isMobile ? 1 : 2;
  const colSpan = isMobile ? 24 : 12;

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Header isMobile={isMobile} />
      <IndustrialContainer>
        <PageHeader>
          <RobotOutlined style={{ fontSize: 24 }} />
          <h2>{t("page_amr")}</h2>
        </PageHeader>

        {/* REPLACEMENT START */}
        {data && data.length > 0 ? (
          <Row gutter={[24, 24]}>
            {data.map((amr) => {
              // Your ID cleaning logic
              let amrId = amr.amrId;
              if (amrId.startsWith("/#")) {
                amrId = "mock-" + amrId.slice(2);
              } else if (amrId.startsWith("#")) {
                amrId = "mock-" + amrId.slice(1);
              }

              const status = amr.isOnline
                ? amr.isOverdue
                  ? "Error"
                  : "Active"
                : "Idle";

              return (
                <Col span={colSpan} key={amr.amrId}>
                  <Link to={`/amr/${amrId}`} style={{ display: "block" }}>
                    <IndustrialCard hoverable>
                      <AmrTitle level={4}>
                        <RobotOutlined style={{ color: "#1890ff" }} />
                        {amr.amrId}
                      </AmrTitle>

                      <InfoRow>
                        <span className="label">{t("utils.status")}:</span>
                        <StatusBadge $status={status}>
                          {amr.isOnline
                            ? amr.isOverdue
                              ? t("utils.error")
                              : t("utils.active")
                            : t("utils.inactive")}
                        </StatusBadge>
                      </InfoRow>

                      <InfoRow>
                        <span className="label">
                          {t("utils.online")}/{t("utils.offline")}:
                        </span>
                        <StatusBadge $status={amr.isOnline ? "Active" : "Idle"}>
                          {amr.isOnline
                            ? t("utils.online")
                            : t("utils.offline")}
                        </StatusBadge>
                      </InfoRow>

                      <InfoRow>
                        <span className="label">
                          {t("utils.road_conditions")}:
                        </span>
                        <NetworkDelay>{amr.networkDelay} ms</NetworkDelay>
                      </InfoRow>

                      <InfoRow>
                        <span className="label">
                          {t("utils.maintenance_level")}:
                        </span>
                        <StatusBadge
                          $status={amr.isPosAccurate ? "Active" : "Idle"}
                        >
                          {amr.isPosAccurate
                            ? t("utils.active")
                            : t("utils.inactive")}
                        </StatusBadge>
                      </InfoRow>
                    </IndustrialCard>
                  </Link>
                </Col>
              );
            })}
          </Row>
        ) : (
          <Empty description={t("utils.none")} />
        )}
        {/* REPLACEMENT END */}
      </IndustrialContainer>
    </Layout>
  );
};

export default AmrList;
