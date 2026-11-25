import { FC, Fragment, useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Flex, Modal, Tag, message } from "antd";
import { useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useMutation } from "@tanstack/react-query";
import styled from "styled-components";
import dayjs from "dayjs";
import { ThunderboltOutlined, StopOutlined } from "@ant-design/icons";
import { OpenChargeStationModal } from "@/atoms/main/mainAtoms";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useChargeStationSocket, {
  type Charge_Status_Info,
} from "@/sockets/useChargeStationSocket";
import { c, font, mqNarrow, space } from "@/theme/tokens";

// 充電站的狀態是一條鏈: 派車系統 ← 串接程式 ←(TCP)← 充電站 (回傳資料)。
// FAE 要知道的是「斷在哪一段、該找誰」, 所以只報最上游斷掉的那一段;
// 上游斷掉時下游的值是舊的, 一律顯示「無法得知」。

/** 派車系統每 300ms 推一次充電站狀態, 這麼久沒推就當畫面沒在更新 */
const SOCKET_STALE_MS = 3000;
/**
 * 充電站沒回資料時, 串接程式會一直斷線重連, TCP 在「連上 / 連不上」之間跳。
 * 視窗開著的這段時間內看過 TCP 連上卻沒資料, 就算 TCP 現在是斷的,
 * 也當成充電站沒回資料, 不要讓 FAE 去查網路 (現場一輪大約 3 分鐘)
 */
const TCP_FLAP_WINDOW_MS = 4 * 60 * 1000;

type Verdict =
  | "no_data"
  | "stale"
  | "bridge"
  | "tcp"
  | "silent"
  | "bar_unknown"
  | "ok";

/** 鏈上的一段 */
type LinkState = "ok" | "bad" | "unknown";

type Node = "fleet" | "bridge" | "station";

const ALERT_TYPE: Record<Verdict, "success" | "warning" | "error"> = {
  no_data: "warning",
  stale: "error",
  bridge: "error",
  tcp: "error",
  silent: "error",
  bar_unknown: "warning",
  ok: "success",
};

/** 問題出在鏈上的哪一個節點 (圖上標出來) */
const BLAME: Record<Verdict, Node | null> = {
  no_data: "fleet",
  stale: "fleet",
  bridge: "bridge",
  tcp: "station",
  silent: "station",
  bar_unknown: "bridge",
  ok: null,
};

const durationText = (ms: number, t: TFunction) => {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return t("charge.station_panel.dur_sec", { n: sec });
  const min = Math.floor(sec / 60);
  if (min < 60) return t("charge.station_panel.dur_min", { n: min });
  const hour = Math.floor(min / 60);
  if (hour < 24) return t("charge.station_panel.dur_hour", { n: hour });
  return t("charge.station_panel.dur_day", { n: Math.floor(hour / 24) });
};

const barText = (barOut: string | undefined, t: TFunction) =>
  barOut === "1"
    ? t("charge.station_panel.bar_out")
    : barOut === "0"
      ? t("charge.station_panel.bar_in")
      : t("charge.station_panel.bar_unknown");

const judge = (
  station: Charge_Status_Info | null,
  socketStale: boolean,
  tcpFlapping: boolean,
): {
  verdict: Verdict;
  links: { bridge: LinkState; tcp: LinkState; data: LinkState };
} => {
  const unknown = { bridge: "unknown", tcp: "unknown", data: "unknown" } as const;
  if (!station) return { verdict: "no_data", links: unknown };
  if (socketStale) return { verdict: "stale", links: unknown };
  if (!station.isMQTTConnect) {
    return {
      verdict: "bridge",
      links: { bridge: "bad", tcp: "unknown", data: "unknown" },
    };
  }
  const alive = !!station.isStationCodeAlive;
  if (!station.isTCPConnect) {
    return {
      verdict: tcpFlapping && !alive ? "silent" : "tcp",
      links: { bridge: "ok", tcp: "bad", data: "unknown" },
    };
  }
  if (!alive) {
    return {
      verdict: "silent",
      links: { bridge: "ok", tcp: "ok", data: "bad" },
    };
  }
  const links = { bridge: "ok", tcp: "ok", data: "ok" } as const;
  if (station.barOut !== "0" && station.barOut !== "1") {
    return { verdict: "bar_unknown", links };
  }
  return { verdict: "ok", links };
};

const StatusPanel: FC<{ locId: string | null }> = ({ locId }) => {
  const socketState = useChargeStationSocket();
  const setChargeConfig = useSetAtom(OpenChargeStationModal);
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const station = locId ? (socketState[locId] ?? null) : null;

  // 每秒重畫: 「多久沒資料」和畫面有沒有在更新都要跟著時間走
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 派車系統最後一次推資料過來的時間
  const lastSocketAt = useRef<number | null>(null);
  // 視窗開著的期間, 最後一次看到 TCP 連上的時間
  const lastTcpUpAt = useRef<number | null>(null);
  useEffect(() => {
    if (!station) return;
    const at = Date.now();
    lastSocketAt.current = at;
    if (station.isMQTTConnect && station.isTCPConnect) lastTcpUpAt.current = at;
  }, [station]);

  const socketStale =
    lastSocketAt.current !== null &&
    now - lastSocketAt.current > SOCKET_STALE_MS;
  const tcpFlapping =
    lastTcpUpAt.current !== null &&
    now - lastTcpUpAt.current < TCP_FLAP_WINDOW_MS;

  const { verdict, links } = judge(station, socketStale, tcpFlapping);
  const blame = BLAME[verdict];

  const lastData = station?.leastHeartbeatTime
    ? dayjs(station.leastHeartbeatTime)
    : null;
  // 1970 = 串接程式啟動後一次都沒收到
  const hasLastData =
    !!lastData && lastData.isValid() && lastData.year() > 2000;
  const silentFor = hasLastData
    ? durationText(now - lastData.valueOf(), t)
    : t("charge.station_panel.never");

  const testMutation = useMutation({
    mutationFn: (payload: { locationId: string; cmd: string }) =>
      client.post("api/test/charge-station-bar", payload),
    onSuccess: (_, variables) => {
      if (variables.cmd === "start") {
        messageApi.success(t("charge.station_panel.charging_started"));
      } else {
        messageApi.info(t("charge.station_panel.charging_stopped"));
      }
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleBar = (cmd: "start" | "stop") => {
    if (!locId) {
      messageApi.error(t("charge.station_panel.location_not_found"));
      return;
    }
    testMutation.mutate({ locationId: locId, cmd });
  };

  const linkText = (state: LinkState) =>
    t(
      `charge.station_panel.${
        state === "ok" ? "connected" : state === "bad" ? "disconnected" : "unknown"
      }`,
    );

  const nodes: { key: Node; label: string; sub: string }[] = [
    {
      key: "fleet",
      label: t("charge.station_panel.node_fleet"),
      sub: t("charge.station_panel.node_fleet_sub"),
    },
    {
      key: "bridge",
      label: t("charge.station_panel.node_bridge"),
      sub: t("charge.station_panel.node_bridge_sub"),
    },
    {
      key: "station",
      label: t("charge.station_panel.node_station"),
      sub: t("charge.station_panel.node_station_sub"),
    },
  ];
  const edges: { state: LinkState; text: string }[] = [
    { state: links.bridge, text: linkText(links.bridge) },
    { state: links.tcp, text: `TCP ${linkText(links.tcp)}` },
  ];

  const dataText =
    links.data === "unknown"
      ? t("charge.station_panel.unknown")
      : links.data === "ok"
        ? t("charge.station_panel.data_ok")
        : t("charge.station_panel.data_stopped", { duration: silentFor });

  const steps =
    verdict === "ok"
      ? []
      : (t(`charge.station_panel.verdict.${verdict}.do`, {
          returnObjects: true,
        }) as string[]);
  // 這座站暫時不能用的情況, 提醒對車子的影響
  const showImpact = ALERT_TYPE[verdict] === "error" || verdict === "bar_unknown";
  const pending = testMutation.isLoading;

  return (
    <>
      {contextHolder}
      <Modal
        open={!!locId}
        onCancel={() => setChargeConfig(null)}
        footer={null}
        width={600}
        title={
          <Flex align="center" gap="small" wrap>
            <ThunderboltOutlined />
            <span>{station?.name || locId || "-"}</span>
            {station?.stationId ? (
              <Tag style={{ margin: 0 }}>
                {t("charge.station_panel.station_id")} {station.stationId}
              </Tag>
            ) : null}
            {station?.disable ? (
              <Tag style={{ margin: 0 }}>
                {t("charge.station_panel.disabled")}
              </Tag>
            ) : null}
          </Flex>
        }
      >
        <Body>
          <Alert
            type={ALERT_TYPE[verdict]}
            showIcon
            title={t(`charge.station_panel.verdict.${verdict}.title`)}
            description={
              <>
                <p>
                  {t(`charge.station_panel.verdict.${verdict}.what`, {
                    duration: silentFor,
                    bar: barText(station?.barOut, t),
                  })}
                </p>
                {steps.length > 0 && (
                  <Steps>
                    {steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </Steps>
                )}
                {showImpact && (
                  <Impact>{t("charge.station_panel.impact")}</Impact>
                )}
              </>
            }
          />

          <Chain>
            {nodes.map((node, i) => (
              <Fragment key={node.key}>
                <ChainNode $blamed={blame === node.key}>
                  <NodeLabel>{node.label}</NodeLabel>
                  <NodeSub>{node.sub}</NodeSub>
                  {node.key === "station" && (
                    <NodeData $state={links.data}>
                      {t("charge.station_panel.data")}: {dataText}
                    </NodeData>
                  )}
                  {blame === node.key && (
                    <BlameMark>{t("charge.station_panel.blame_here")}</BlameMark>
                  )}
                </ChainNode>
                {i < edges.length && (
                  <ChainEdge $state={edges[i].state}>
                    <EdgeLine $state={edges[i].state} />
                    <EdgeText>{edges[i].text}</EdgeText>
                  </ChainEdge>
                )}
              </Fragment>
            ))}
          </Chain>

          <Details>
            <dt>{t("charge.station_panel.last_data")}</dt>
            <dd>
              {hasLastData ? (
                <>
                  {lastData.format("YYYY-MM-DD HH:mm:ss")}
                  <Muted>
                    {" "}
                    ({t("charge.station_panel.ago", { duration: silentFor })})
                  </Muted>
                </>
              ) : (
                t("charge.station_panel.never")
              )}
            </dd>
            <dt>{t("charge.station_panel.charge_bar")}</dt>
            <dd>
              {links.data === "ok" ? (
                <Badge
                  status={
                    station?.barOut === "1"
                      ? "processing"
                      : station?.barOut === "0"
                        ? "success"
                        : "warning"
                  }
                  text={barText(station?.barOut, t)}
                />
              ) : (
                <Badge
                  status="default"
                  text={`${barText(station?.barOut, t)} (${t("charge.station_panel.last_known")})`}
                />
              )}
            </dd>
            <dt>{t("charge.station_panel.location_id")}</dt>
            <dd>{locId || "-"}</dd>
            {station?.occupier || station?.booker ? (
              <>
                <dt>{t("charge.station_panel.using_amr")}</dt>
                <dd>{station.occupier || station.booker}</dd>
              </>
            ) : null}
          </Details>

          <Actions>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={pending && testMutation.variables?.cmd === "start"}
              disabled={pending}
              onClick={() => handleBar("start")}
            >
              {t("charge.station_panel.start")}
            </Button>
            <Button
              danger
              icon={<StopOutlined />}
              loading={pending && testMutation.variables?.cmd === "stop"}
              disabled={pending}
              onClick={() => handleBar("stop")}
            >
              {t("charge.station_panel.stop")}
            </Button>
          </Actions>
        </Body>
      </Modal>
    </>
  );
};

export default StatusPanel;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.lg};

  .ant-alert-description p {
    margin: 0;
  }
`;

const Steps = styled.ol`
  margin: ${space.xs} 0 0;
  padding-left: 20px;
`;

const Impact = styled.div`
  margin-top: ${space.sm};
  font-size: ${font.sm};
  color: ${c.textSecondary};
`;

const stateColor = (state: LinkState) =>
  state === "ok" ? c.success : state === "bad" ? c.danger : c.textMuted;

const Chain = styled.div`
  display: flex;
  align-items: stretch;
  padding: ${space.md};
  background: ${c.bgSubtle};
  border: 1px solid ${c.border};
  border-radius: 2px;

  ${mqNarrow} {
    flex-direction: column;
  }
`;

const ChainNode = styled.div<{ $blamed: boolean }>`
  flex: 1 1 0;
  min-width: 0;
  padding: ${space.sm} ${space.md};
  background: ${c.bg};
  border: 1px solid ${({ $blamed }) => ($blamed ? c.danger : c.border)};
  box-shadow: ${({ $blamed }) => ($blamed ? `0 0 0 1px ${c.danger}` : "none")};
  border-radius: 2px;
`;

const NodeLabel = styled.div`
  font-size: ${font.md};
  font-weight: 600;
  color: ${c.text};
`;

const NodeSub = styled.div`
  font-size: ${font.xs};
  color: ${c.textMuted};
`;

const NodeData = styled.div<{ $state: LinkState }>`
  margin-top: ${space.xs};
  font-size: ${font.sm};
  font-weight: 600;
  color: ${({ $state }) => stateColor($state)};
`;

const BlameMark = styled.div`
  margin-top: ${space.xs};
  font-size: ${font.xs};
  font-weight: 600;
  color: ${c.danger};
`;

const ChainEdge = styled.div<{ $state: LinkState }>`
  flex: 0 0 84px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${space.xs};
  padding: 0 ${space.xs};
  color: ${({ $state }) => stateColor($state)};

  ${mqNarrow} {
    flex: 0 0 auto;
    flex-direction: row;
    padding: ${space.xs} 0 ${space.xs} ${space.lg};
  }
`;

// 斷掉的那一段畫虛線, 不只靠顏色分辨
const EdgeLine = styled.div<{ $state: LinkState }>`
  width: 100%;
  border-top: 2px ${({ $state }) => ($state === "ok" ? "solid" : "dashed")}
    currentColor;

  ${mqNarrow} {
    width: 0;
    height: 16px;
    border-top: none;
    border-left: 2px ${({ $state }) => ($state === "ok" ? "solid" : "dashed")}
      currentColor;
  }
`;

const EdgeText = styled.div`
  font-size: ${font.xs};
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
`;

const Details = styled.dl`
  display: grid;
  grid-template-columns: 120px 1fr;
  column-gap: ${space.md};
  row-gap: ${space.xs};
  margin: 0;
  font-size: ${font.md};

  dt {
    color: ${c.textMuted};
  }
  dd {
    margin: 0;
    color: ${c.text};
  }
`;

const Muted = styled.span`
  color: ${c.textMuted};
`;

const Actions = styled.div`
  display: flex;
  gap: ${space.sm};
  justify-content: flex-end;
  padding-top: ${space.md};
  border-top: 1px solid ${c.border};
`;
