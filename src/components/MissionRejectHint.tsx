import { FC } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { ClockCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { Reject_Mission } from "@/types/mission";

/**
 * 任務為什麼還沒派出去, 原因由後端寫好 (哪台車、哪裡不通、要去哪裡修)。
 * FIX 要有人處理才派得出去, WAIT 只是在排隊。
 */
type RejectEntry = Reject_Mission[string][number];

const ANY_AMR = "none";

export const rejectEntries = (entries?: RejectEntry[]) =>
  (entries ?? []).filter((e) => e.reason);

export const needsFix = (entries?: RejectEntry[]) =>
  rejectEntries(entries).some((e) => e.level === "FIX");

const Block = styled.div<{ $fix: boolean }>`
  margin-top: 6px;
  padding: 6px 8px;
  border-left: 3px solid
    ${({ $fix }) => ($fix ? "var(--c-warning)" : "var(--c-text-muted)")};
  background: ${({ $fix }) => ($fix ? "var(--c-warning-soft)" : "var(--c-bg-muted)")};
  font-size: 12px;
  line-height: 1.5;
  text-align: left;
  white-space: normal;
  word-break: break-word;
`;

const Head = styled.div<{ $fix: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: ${({ $fix }) => ($fix ? "var(--c-warning)" : "var(--c-text-muted)")};
`;

const Line = styled.div`
  color: var(--c-text);
`;

const Amr = styled.span`
  font-family: "Roboto Mono", monospace;
  font-weight: 600;
  margin-right: 4px;
`;

const MissionRejectHint: FC<{ entries?: RejectEntry[] }> = ({ entries }) => {
  const { t } = useTranslation();
  const shown = rejectEntries(entries);
  if (shown.length === 0) return null;

  const groups = [
    { fix: true, items: shown.filter((e) => e.level === "FIX") },
    { fix: false, items: shown.filter((e) => e.level !== "FIX") },
  ].filter((g) => g.items.length);

  return (
    <>
      {groups.map(({ fix, items }) => (
        <Block key={String(fix)} $fix={fix}>
          <Head $fix={fix}>
            {fix ? <WarningOutlined /> : <ClockCircleOutlined />}
            {t(fix ? "mission_reject_reason.fix" : "mission_reject_reason.wait")}
          </Head>
          {items.map((e) => (
            <Line key={e.amrId}>
              {e.amrId !== ANY_AMR && <Amr>{e.amrId}</Amr>}
              {e.reason}
            </Line>
          ))}
        </Block>
      ))}
    </>
  );
};

export default MissionRejectHint;
