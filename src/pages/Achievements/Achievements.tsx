import { FC, useState } from "react";
import { Alert, Progress, Segmented, Skeleton, Tag } from "antd";
import { TrophyOutlined } from "@ant-design/icons";
import Layout, { Content } from "antd/es/layout/layout";
import dayjs from "dayjs";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import { Achievement, DayReport, Tier, useAchievements, useDailyReport } from "@/api/useAchievements";
import { mq } from "@/styles/responsive";

const StyledLayout = styled(Layout)`
  height: var(--app-height);
  overflow: hidden;
`;

const StyledContent = styled(Content)`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-sm);
  background: var(--c-bg-muted);

  ${mq.pad} {
    padding: var(--space-md);
  }
`;

const Panel = styled.section`
  padding: var(--space-md);
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 8px;

  h2 {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    margin: 0 0 var(--space-sm);
    font-size: var(--font-lg);
    color: var(--c-text);
  }
  .hint {
    margin: 0 0 var(--space-sm);
    font-size: var(--font-sm);
    color: var(--c-text-muted);
  }
`;

const ReportGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-sm);
`;

const Stat = styled.div`
  padding: var(--space-sm);
  background: var(--c-bg-subtle);
  border-radius: 6px;

  .label {
    font-size: var(--font-xs);
    color: var(--c-text-muted);
  }
  .value {
    font-size: 22px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--c-text);
  }
  .sub {
    font-size: var(--font-xs);
    color: var(--c-text-secondary);
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-sm);
`;

/** 銅銀金: 固定的獎牌色, 不跟主題換 (跟狀態色一樣是有意義的顏色) */
const TIER_COLOR: Record<Tier, string> = { bronze: "#b87333", silver: "#9aa5b1", gold: "#e0a800" };

const Badge = styled.div<{ $tier: Tier; $done: boolean }>`
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--c-bg);
  border: 1px solid ${({ $done, $tier }) => ($done ? TIER_COLOR[$tier] : "var(--c-border)")};
  border-radius: 8px;
  box-shadow: ${({ $done, $tier }) => ($done ? `0 0 0 1px ${TIER_COLOR[$tier]}33` : "none")};

  .medal {
    flex: none;
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    font-size: 24px;
    border-radius: 50%;
    border: 3px solid ${({ $tier }) => TIER_COLOR[$tier]};
    background: var(--c-bg-subtle);
    filter: ${({ $done }) => ($done ? "none" : "grayscale(1)")};
    opacity: ${({ $done }) => ($done ? 1 : 0.55)};
  }
  .body {
    flex: 1 1 auto;
    min-width: 0;
  }
  .name {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-weight: 600;
    color: var(--c-text);
  }
  .desc {
    margin: 2px 0 var(--space-xs);
    font-size: var(--font-sm);
    color: var(--c-text-secondary);
  }
  .meta {
    font-size: var(--font-xs);
    color: var(--c-text-muted);
  }
`;

const nf = new Intl.NumberFormat();

/** 成就的名稱 / 說明: key 是後端給的 code (動態字串), i18next 的型別只認寫死的 key */
const useItemText = () => {
  const { t } = useTranslation();
  return (code: string, field: "name" | "desc") => t(`achievements.items.${code}.${field}` as Parameters<typeof t>[0]) as string;
};

const formatValue = (v: number) => (v >= 100 ? nf.format(Math.floor(v)) : String(Math.round(v * 10) / 10));

const BadgeCard: FC<{ a: Achievement }> = ({ a }) => {
  const { t } = useTranslation();
  const item = useItemText();
  const done = !!a.unlockedAt;
  const percent = Math.min(100, Math.round(((a.value ?? 0) / a.target) * 100));
  return (
    <Badge $tier={a.tier} $done={done} data-testid={`achievement-${a.code}`} data-unlocked={done}>
      <div className="medal" aria-hidden>
        {a.icon}
      </div>
      <div className="body">
        <div className="name">
          {item(a.code, "name")}
          <Tag color={TIER_COLOR[a.tier]} style={{ marginInlineEnd: 0 }}>
            {t(`achievements.tier.${a.tier}` as Parameters<typeof t>[0]) as string}
          </Tag>
        </div>
        <div className="desc">{item(a.code, "desc")}</div>
        {done ? (
          <div className="meta">{t("achievements.unlocked_at", { time: dayjs(a.unlockedAt).format("YYYY/MM/DD HH:mm") })}</div>
        ) : (
          <>
            <Progress percent={percent} size="small" showInfo={false} strokeColor={TIER_COLOR[a.tier]} />
            <div className="meta">
              {a.value === null ? t("achievements.locked") : t("achievements.progress", { value: formatValue(a.value), target: formatValue(a.target) })}
            </div>
          </>
        )}
      </div>
    </Badge>
  );
};

const delta = (today: number, yesterday: number) => (yesterday === 0 ? "" : `${today >= yesterday ? "▲" : "▼"} ${Math.abs(Math.round(((today - yesterday) / yesterday) * 100))}%`);

const Report: FC<{ today: DayReport; yesterday: DayReport }> = ({ today, yesterday }) => {
  const { t } = useTranslation();
  const stats: { key: string; value: string; sub: string }[] = [
    { key: "completed", value: nf.format(today.completed), sub: delta(today.completed, yesterday.completed) },
    { key: "canceled", value: nf.format(today.canceled), sub: "" },
    { key: "cargo", value: nf.format(today.cargoMoved), sub: delta(today.cargoMoved, yesterday.cargoMoved) },
    { key: "distance", value: `${today.distanceKm.toFixed(1)} km`, sub: delta(today.distanceKm, yesterday.distanceKm) },
    { key: "alarms", value: nf.format(today.alarms), sub: "" },
  ];
  return (
    <ReportGrid>
      {stats.map((s) => (
        <Stat key={s.key}>
          <div className="label">{t(`achievements.report.${s.key}` as Parameters<typeof t>[0]) as string}</div>
          <div className="value">{s.value}</div>
          <div className="sub">{s.sub ? `${s.sub} ${t("achievements.report.yesterday")}` : " "}</div>
        </Stat>
      ))}
      <Stat>
        <div className="label">{t("achievements.report.top_vehicle")}</div>
        <div className="value" style={{ fontSize: 16 }}>
          {today.topVehicle ? t("achievements.report.top_vehicle_value", { amrId: today.topVehicle.amrId, n: today.topVehicle.completed }) : t("achievements.report.none")}
        </div>
        <div className="sub">{" "}</div>
      </Stat>
    </ReportGrid>
  );
};

type Tab = "fleet" | "user";

/** 成就與今日戰報 (/achievements) */
const Achievements: FC = () => {
  const { t } = useTranslation();
  const item = useItemText();
  const { data, isLoading } = useAchievements();
  const { data: report } = useDailyReport();
  const [tab, setTab] = useState<Tab>("fleet");

  const list = data ? data[tab] : [];
  const done = list.filter((a) => a.unlockedAt).length;

  return (
    <StyledLayout>
      <Header />
      <StyledContent>
        {report && (
          <Panel>
            <h2>
              <TrophyOutlined />
              {t("achievements.report.title")} · {dayjs(report.today.date).format("MM/DD")}
            </h2>
            <Report today={report.today} yesterday={report.yesterday} />
          </Panel>
        )}
        <Panel>
          <h2>
            <TrophyOutlined />
            {t("achievements.title")}
          </h2>
          <p className="hint">{t("achievements.hint")}</p>
          {data && !data.enabled && <Alert type="warning" showIcon message={t("achievements.disabled")} style={{ marginBottom: "var(--space-sm)" }} />}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-sm)", flexWrap: "wrap" }}>
            <Segmented<Tab>
              value={tab}
              onChange={setTab}
              options={[
                { value: "fleet", label: t("achievements.tab_fleet") },
                { value: "user", label: t("achievements.tab_user") },
              ]}
            />
            {data && <span className="hint" style={{ margin: 0 }}>{t("achievements.unlocked_count", { done, total: list.length })}</span>}
          </div>
          {isLoading ? (
            <Skeleton active />
          ) : (
            <Grid>
              {[...list]
                .sort((a, b) => Number(!!b.unlockedAt) - Number(!!a.unlockedAt))
                .map((a) => (
                  <BadgeCard key={a.code} a={a} />
                ))}
            </Grid>
          )}
        </Panel>
        {data && data.recent.length > 0 && (
          <Panel>
            <h2>{t("achievements.recent")}</h2>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--c-text-secondary)", fontSize: "var(--font-sm)" }}>
              {data.recent.slice(0, 10).map((r) => (
                <li key={`${r.code}:${r.account}`}>
                  {dayjs(r.unlockedAt).format("MM/DD HH:mm")} · {r.account || t("achievements.fleet_name")} · {item(r.code, "name")}
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </StyledContent>
    </StyledLayout>
  );
};

export default Achievements;
