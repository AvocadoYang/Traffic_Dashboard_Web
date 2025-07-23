import useCargoHistory from "@/api/useCargoHistory";
import {
  Typography,
  Table,
  Tag,
  Flex,
  Card,
  Input,
  Alert,
  Tooltip,
} from "antd";
import moment from "moment";
import { FC, useState } from "react";
import styled from "styled-components";
import ReactJsonView from "@uiw/react-json-view";
import { Button } from "antd";
import { useTranslation } from "react-i18next";
import useSearchCargoMetadata from "@/api/useSearchCargoMetadata";
import { useReverifyCargoFormat } from "@/hooks/useReverifyCargoFormat";

const { Text } = Typography;

const PageContainer = styled.div`
  padding: 24px;
  background-color: #f5f5f5;
`;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
`;

const StyledTable = styled(Table)`
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const ActionWrapper = styled.div`
  width: 6em;
`;

const MetaCard = styled(Card)`
  width: 30%;
  min-height: 100%;
`;

const HisCard = styled(Card)`
  width: 70%;
  min-height: 100%;
`;

const NoDefine = styled.span`
  margin: 0;
  font-size: 1.5em;
  font-weight: 600;
  color: #a4a4a4;
`;

type CargoData = {
  id: string;
  status: string;
  metadata: string | null;
  createdAt: Date;
  register_robot?: { id: string };
  script_robot?: { id: string };
  ShelfConfig?: { id: string };
  custom_cargo_metadata?: { custom_name: string };
  history: {
    id: string;
    action: string;
    description?: string;
    actor?: string;
    timestamp: string;
  }[];
};

export enum CargoCurrentStatus {
  ON_AMR = "ON_AMR",
  AT_LOCATION = "AT_LOCATION",
  SHIFT = "SHIFT",
}

export enum CargoAction {
  CREATED = "CREATED",
  TRANSFER = "TRANSFER",
  LOAD = "LOAD",
  OFFLOAD = "OFFLOAD",
  SHIFTED = "SHIFTED",
  UPDATED = "UPDATED",
}

const HistoryTable: FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [metadataSearch, setMetadataSearch] = useState("");
  const { data, refetch, isFetching } = useCargoHistory(currentPage, pageSize);
  const { data: searchData } = useSearchCargoMetadata(metadataSearch);

  const { t } = useTranslation();

  const { mutate, isLoading, contextHolder } = useReverifyCargoFormat(refetch);

  const reVerityCargoFormat = (cargoInfoId: string) => {
    mutate(cargoInfoId);
  };

  const getActionColor = (action: CargoAction): string => {
    switch (action) {
      case CargoAction.CREATED:
        return "blue";
      case CargoAction.TRANSFER:
        return "magenta";
      case CargoAction.LOAD:
        return "gold";
      case CargoAction.OFFLOAD:
        return "green";
      case CargoAction.SHIFTED:
        return "default";
      case CargoAction.UPDATED:
        return "purple";
      default:
        return "default";
    }
  };

  const columns = [
    {
      title: t("cargo_history.cargoId"),
      dataIndex: "id",
      key: "id",
      render: (id: string) => <Text code>{id.slice(0, 8)}...</Text>,
    },
    {
      title: t("cargo_history.status"),
      dataIndex: "status",
      key: "status",
      render: (status: CargoCurrentStatus) => {
        switch (status) {
          case CargoCurrentStatus.ON_AMR:
            return <Tag color="yellow">{status}</Tag>;
          case CargoCurrentStatus.AT_LOCATION:
            return <Tag color="green">{status}</Tag>;
          case CargoCurrentStatus.SHIFT:
            return <Tag>{status}</Tag>;
          default:
            return <Tag>{status}</Tag>;
        }
      },
    },
    {
      title: t("cargo_history.customFormat"),
      dataIndex: ["custom_cargo_metadata", "custom_name"],
      key: "custom_cargo_metadata",
      render: (name: string | undefined) => name || "-",
    },
    {
      title: t("cargo_history.metadata"),
      dataIndex: "metadata",
      key: "metadata",
      render: (meta: string | null) => {
        try {
          const parsed = meta ? meta : {};
          return (
            <pre style={{ fontSize: 12 }}>
              {JSON.stringify(parsed, null, 0).slice(0, 8)}...
            </pre>
          );
        } catch (e) {
          return <Text type="secondary">Invalid JSON</Text>;
        }
      },
    },
    {
      title: t("cargo_history.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: (a, b) => moment(a.createdAt).unix() - moment(b.createdAt).unix(),
      render: (_v, record: CargoData) =>
        new Date(record.createdAt).toLocaleString(),
    },
  ];

  return (
    <>
      {contextHolder}
      <PageContainer>
        <HeaderContainer>
          <Flex gap="small">
            <Input
              placeholder={t("cargo_history.search_metadata")}
              value={metadataSearch}
              onChange={(e) => setMetadataSearch(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          </Flex>

          <Button onClick={() => refetch()} loading={isFetching}>
            {t("cargo_history.refetch")}
          </Button>
        </HeaderContainer>
        <StyledTable<any>
          dataSource={
            metadataSearch ? searchData?.data || [] : data?.data || []
          }
          columns={columns}
          pagination={
            metadataSearch
              ? false
              : {
                  pageSize,
                  total: data?.total,
                  onChange: (page) => setCurrentPage(page),
                }
          }
          rowKey="id"
          expandable={{
            expandedRowRender: (record: CargoData) => (
              <div style={{ width: "100%" }}>
                <Flex gap="small" style={{ width: "100%" }}>
                  <MetaCard
                    title={
                      <>
                        <Flex align="center" gap="large">
                          {t("cargo_history.metadata")}

                          {record.custom_cargo_metadata ? (
                            []
                          ) : (
                            <Tooltip
                              title={t("cargo_history.undefined_format_desc")}
                            >
                              <Alert
                                message={t("cargo_history.undefined_format")}
                                type="warning"
                                showIcon
                              />
                            </Tooltip>
                          )}

                          {record.custom_cargo_metadata ? (
                            []
                          ) : (
                            <Button
                              loading={isLoading}
                              onClick={() => reVerityCargoFormat(record.id)}
                            >
                              {t("cargo_history.re_verity_format")}
                            </Button>
                          )}
                        </Flex>
                      </>
                    }
                  >
                    {record.metadata && record.metadata !== "null" ? (
                      <ReactJsonView
                        displayDataTypes={false}
                        value={record.metadata as {}}
                        collapsed={false}
                        enableClipboard={false}
                        style={{ fontSize: 14 }}
                      />
                    ) : (
                      <NoDefine>{t("cargo_history.no_defined")}</NoDefine>
                    )}
                  </MetaCard>
                  <HisCard title={t("cargo_history.history")}>
                    <div style={{ marginTop: 8 }}>
                      {[...record.history]
                        .sort(
                          (a, b) =>
                            new Date(a.timestamp).getTime() -
                            new Date(b.timestamp).getTime(),
                        )
                        .map((h) => (
                          <Flex
                            key={h.id}
                            gap="small"
                            style={{ marginBottom: 4 }}
                          >
                            <Text type="secondary" style={{ minWidth: 160 }}>
                              {moment(h.timestamp).format(
                                "YYYY-MM-DD HH:mm:ss",
                              )}
                            </Text>
                            <ActionWrapper>
                              <Tag
                                color={getActionColor(h.action as CargoAction)}
                              >
                                {h.action}
                              </Tag>
                            </ActionWrapper>
                            <span>{h.description}</span>
                          </Flex>
                        ))}
                    </div>
                  </HisCard>
                </Flex>
              </div>
            ),
          }}
        />
      </PageContainer>
    </>
  );
};

export default HistoryTable;
