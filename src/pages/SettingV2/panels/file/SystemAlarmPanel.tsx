import { FC, useEffect, useMemo, useState } from "react";
import { Input, Switch, Table } from "antd";
import type { TableColumnsType } from "antd";
import { AlertOutlined, SearchOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { io } from "@/sockets/socketConnect";
import {
  ALARM_TYPES,
  systemAlarmTypeFilter,
} from "@/utils/systemAlarmFilter";
import useIsNarrow from "../../ui/useIsNarrow";
import StatusTag from "../../ui/StatusTag";
import { c, font, space } from "../../ui/tokens";
import {
  PanelShell,
  Section,
  SectionTitle,
  Toolbar,
  EmptyState,
  TableWrap,
  CardList,
  ItemCard,
  CardTitleRow,
  CardFacts,
  Hint,
} from "../../ui/primitives";

type SystemAlarmConfig = Record<
  string,
  { enable: boolean; description: string }
>;

type AlarmRow = {
  code: string;
  enable: boolean;
  description: string;
};

const TypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${space.sm};
`;

const TypeItem = styled.label`
  display: flex;
  align-items: center;
  gap: ${space.sm};
  padding: ${space.sm} ${space.md};
  border: 1px solid ${c.border};
  background: ${c.bgSubtle};
  font-size: ${font.xs};
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: ${c.textSecondary};
  cursor: pointer;

  &:hover {
    border-color: ${c.borderStrong};
    color: ${c.text};
  }
`;

const SystemAlarmPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();

  const [config, setConfig] = useState<SystemAlarmConfig>({});
  const [typeFilter, setTypeFilter] = useAtom(systemAlarmTypeFilter);
  const [search, setSearch] = useState("");

  // 設定是伺服器推過來的,不是用 query 抓的
  useEffect(() => {
    const handleConfig = (data: SystemAlarmConfig) => setConfig(data);
    io.on("system-alarm-config", handleConfig);
    return () => {
      io.off("system-alarm-config", handleConfig);
    };
  }, []);

  const toggle = (code: string, enable: boolean) => {
    io.emit("set-system-alarm", { code, enable });
    setConfig((prev) => ({
      ...prev,
      [code]: { enable, description: prev[code]?.description ?? "" },
    }));
  };

  const rows = useMemo(() => {
    const all: AlarmRow[] = Object.entries(config).map(([code, value]) => ({
      code,
      enable: value.enable,
      description: value.description,
    }));
    const keyword = search.trim().toLowerCase();
    if (!keyword) return all;
    return all.filter(
      (r) =>
        r.code.toLowerCase().includes(keyword) ||
        (r.description ?? "").toLowerCase().includes(keyword),
    );
  }, [config, search]);

  const columns: TableColumnsType<AlarmRow> = [
    {
      title: t("system_alarm.alarm_code"),
      dataIndex: "code",
      key: "code",
      width: 180,
      fixed: "left",
      sorter: (a, b) => a.code.localeCompare(b.code),
    },
    {
      title: t("system_alarm.description"),
      dataIndex: "description",
      key: "description",
      render: (v: string) => v || "—",
    },
    {
      title: t("system_alarm.enable"),
      key: "enable",
      width: 110,
      fixed: "right",
      filters: [
        { text: t("utils.yes"), value: true },
        { text: t("utils.no"), value: false },
      ],
      onFilter: (value, r) => r.enable === value,
      render: (_, row) => (
        <Switch
          size="small"
          checked={row.enable}
          onChange={(checked) => toggle(row.code, checked)}
        />
      ),
    },
  ];

  return (
    <PanelShell>
      <Section>
        <SectionTitle>
          <AlertOutlined />
          {t("system_alarm.type_filter")}
        </SectionTitle>

        <Hint>{t("system_alarm.type_filter_hint")}</Hint>

        <TypeGrid>
          {ALARM_TYPES.map((type) => (
            <TypeItem key={type}>
              <Switch
                size="small"
                checked={typeFilter[type]}
                onChange={(checked) => setTypeFilter(type, checked)}
              />
              {t(`system_alarm.type.${type}`)}
            </TypeItem>
          ))}
        </TypeGrid>
      </Section>

      <Section>
        <SectionTitle>
          <AlertOutlined />
          {t("system_alarm.title")}
        </SectionTitle>

        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={`${t("utils.search")} ${t("system_alarm.alarm_code")}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {rows.length === 0 ? (
          <EmptyState>WAITING FOR CONFIG…</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.code}>
                <CardTitleRow>
                  <span>{row.code}</span>
                  <StatusTag $on={row.enable}>
                    {row.enable ? t("utils.yes") : t("utils.no")}
                  </StatusTag>
                </CardTitleRow>

                <CardFacts>
                  <dt>{t("system_alarm.description")}</dt>
                  <dd>{row.description || "—"}</dd>
                </CardFacts>

                <Toolbar>
                  <Switch
                    size="small"
                    checked={row.enable}
                    onChange={(checked) => toggle(row.code, checked)}
                  />
                  <span>{t("system_alarm.enable")}</span>
                </Toolbar>
              </ItemCard>
            ))}
          </CardList>
        ) : (
          <TableWrap>
            <Table<AlarmRow>
              size="small"
              rowKey="code"
              dataSource={rows}
              columns={columns}
              scroll={{ x: "max-content" }}
              pagination={false}
            />
          </TableWrap>
        )}
      </Section>
    </PanelShell>
  );
};

export default SystemAlarmPanel;
