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
  background: var(--c-bg);
  border: 2px solid var(--c-header-border);
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
  background: var(--c-bg-subtle);
  border: 1px solid var(--c-header-border);
  border-left: 4px solid var(--c-header-accent);
  padding: 16px 20px;
  margin-bottom: 32px;
  font-family: "Roboto Mono", monospace;
  display: flex;
  align-items: center;
  gap: 12px;

  h2 {
    margin: 0;
    color: var(--c-header-accent);
    font-size: 18px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }
`;

const IndustrialCard = styled(Card)`
  width: 100%;
  border: 2px solid var(--c-header-border);
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
    background: var(--c-header-accent);
    transition: width 0.2s;
  }

  &:hover {
    box-shadow: 0 4px 16px rgba(24, 144, 255, 0.2);
    border-color: var(--c-header-accent);
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
    color: var(--c-text);
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
    color: var(--c-text-muted);
    font-weight: 600;
  }
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: ${({ $status }) =>
    $status === "Active"
      ? "var(--c-success-soft)"
      : $status === "Charging"
        ? "var(--c-warning-soft)"
        : $status === "Error"
          ? "var(--c-warning-soft)"
          : $status === "Offline"
            ? "var(--c-danger-soft)"
            : "var(--c-bg-subtle)"};
  border: 1px solid
    ${({ $status }) =>
      $status === "Active"
        ? "var(--c-success)"
        : $status === "Charging"
          ? "var(--c-warning)"
          : $status === "Error"
            ? "#ff9646"
            : $status === "Offline"
              ? "var(--c-danger)"
              : "var(--c-header-border)"};
  color: ${({ $status }) =>
    $status === "Active"
      ? "var(--c-success)"
      : $status === "Charging"
        ? "var(--c-warning)"
        : $status === "Error"
          ? "#ff9646"
          : $status === "Offline"
            ? "var(--c-danger)"
            : "var(--c-text-muted)"};
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const NetworkDelay = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: var(--c-header-accent-soft);
  border: 1px solid var(--c-header-accent);
  color: var(--c-header-accent);
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
    <Layout style={{ minHeight: "100vh", background: "var(--c-bg-subtle)" }}>
      <Header />
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

              const status = !amr.isOnline
                ? "Idle"
                : amr.isOverdue
                  ? "Offline"
                  : amr.hasServiceInterruption
                    ? "Error"
                    : "Active";

              return (
                <Col span={colSpan} key={amr.amrId}>
                  <Link to={`/amr/${amrId}`} style={{ display: "block" }}>
                    <IndustrialCard hoverable>
                      <AmrTitle level={4}>
                        <RobotOutlined style={{ color: "var(--c-header-accent)" }} />
                        {amr.amrId}
                      </AmrTitle>

                      <InfoRow>
                        <span className="label">{t("utils.status")}:</span>
                        <StatusBadge $status={status}>
                          {!amr.isOnline
                            ? t("utils.inactive")
                            : amr.isOverdue
                              ? t("utils.offline")
                              : amr.hasServiceInterruption
                                ? t("utils.service_interrupted")
                                : t("utils.active")}
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
