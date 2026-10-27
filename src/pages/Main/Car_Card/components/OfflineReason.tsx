import { memo, useEffect, useState } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { useIsLogIn, useOfflineInfo } from "@/sockets/useAMRInfo";

const Box = styled.div<{ $level: "error" | "warn" }>`
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--c-text-secondary);
  background: ${({ $level }) => ($level === "error" ? "var(--c-danger-soft)" : "var(--c-warning-soft)")};
  border: 1px solid ${({ $level }) => ($level === "error" ? "var(--c-danger)" : "var(--c-warning)")};
`;

const Title = styled.div<{ $level: "error" | "warn" }>`
  font-weight: 600;
  color: ${({ $level }) => ($level === "error" ? "var(--c-danger)" : "var(--c-warning)")};
`;

const Hint = styled.div`
  margin-top: 2px;
`;

const Meta = styled.div`
  margin-top: 2px;
  color: var(--c-text-muted);
`;

const Details = styled.details`
  margin-top: 4px;
  summary {
    cursor: pointer;
    color: var(--c-text-muted);
  }
  ul {
    margin: 2px 0 0;
    padding-left: 16px;
  }
`;

const formatAgo = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} 秒`;
  if (s < 3600) return `${Math.floor(s / 60)} 分 ${s % 60} 秒`;
  return `${Math.floor(s / 3600)} 小時 ${Math.floor((s % 3600) / 60)} 分`;
};

/** 車輛離線 (或連上了還沒對帳完) 時, 告訴 FAE 最可能是哪裡的問題、該去檢查什麼 */
const OfflineReason: React.FC<{ amrId: string }> = memo(({ amrId }) => {
  const { t } = useTranslation();
  const { isOverdue } = useIsLogIn(amrId);
  const info = useOfflineInfo(amrId);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!info) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [info]);

  // 離線狀態一變回在線, 後端的原因還會晚一個週期才清掉, 這裡先不顯示
  if (!info || !isOverdue) return null;

  return (
    <Box $level={info.level}>
      <Title $level={info.level}>{info.title}</Title>
      <Hint>{info.hint}</Hint>
      <Meta>
        {t("amr_card.offline_for", { time: formatAgo(now - info.since) })}
        {info.lastSeenAt !== null &&
          ` · ${t("amr_card.offline_last_seen", { time: formatAgo(now - info.lastSeenAt) })}`}
        {info.carUrl && (
          <>
            {" · "}
            <a href={info.carUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
              {t("amr_card.offline_car_page")}
            </a>
          </>
        )}
      </Meta>
      {info.details.length > 0 && (
        <Details>
          <summary>{t("amr_card.offline_basis")}</summary>
          <ul>
            {info.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </Details>
      )}
    </Box>
  );
});

export default OfflineReason;
