import { useQuery } from "@tanstack/react-query";
import client from "./axiosClient";
import { ReportQuery, reportParams } from "./useOperationReport";

/** 斷線的對象類別 (後端 connectionLog.ts 的 ConnectionKind) */
export type ConnectionKind = "VEHICLE" | "RABBITMQ" | "MQTT" | "ECS" | "ADVANTECH" | "REDIS";

export const CONNECTION_KINDS: ConnectionKind[] = [
  "VEHICLE",
  "RABBITMQ",
  "MQTT",
  "ECS",
  "ADVANTECH",
  "REDIS",
];

export interface ConnectionEvent {
  id: string;
  kind: string;
  target: string;
  code: string;
  reason: string | null;
  startedAt: number;
  lastSeenAt: number;
  /** null = 還斷著 */
  endedAt: number | null;
  endedByRestart: boolean;
  /** 在查詢期間內的斷線毫秒數 */
  downMs: number;
  /** 整段斷線的毫秒數 */
  totalMs: number;
  ongoing: boolean;
}

export interface ConnectionKindRow {
  kind: string;
  count: number;
  downMs: number;
}

export interface ConnectionTargetRow extends ConnectionKindRow {
  target: string;
  longestMs: number;
  ongoing: boolean;
  lastCode: string;
}

export interface ConnectionCodeRow extends ConnectionKindRow {
  code: string;
}

export type ConnectionBucket = { at: number; total: number } & Record<string, number>;

export interface ConnectionReport {
  from: number;
  to: number;
  now: number;
  bucketMs: number;
  summary: { count: number; downMs: number; ongoing: number; longestMs: number; targets: number };
  kinds: ConnectionKindRow[];
  targets: ConnectionTargetRow[];
  codes: ConnectionCodeRow[];
  buckets: ConnectionBucket[];
  events: ConnectionEvent[];
  /** false: 資料庫還沒有 connection_event 表 */
  recorded: boolean;
}

const useConnectionReport = (query: ReportQuery | null) =>
  useQuery({
    queryKey: ["connection-report", query],
    queryFn: async () => {
      const { data } = await client.get<ConnectionReport>("api/report/connection", {
        params: reportParams(query as ReportQuery),
      });
      return data;
    },
    enabled: !!query,
    refetchOnWindowFocus: false,
  });

export default useConnectionReport;
