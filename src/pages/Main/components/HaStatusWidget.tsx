import { Alert, Badge, Button, Modal, Popover, Tag, message } from "antd";
import {
  CloudServerOutlined,
  CrownOutlined,
  SyncOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import styled from "styled-components";
import client from "@/api/axiosClient";
import useHaStatus, { type HaStatus } from "@/api/useHaStatus";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* 手機上整個 popover (含外框) 要塞得進螢幕 */
  width: min(340px, calc(100vw - 64px));
`;

const Section = styled.div`
  display: grid;
  /* 兩區的標籤欄寬度固定, 值才會上下對齊 */
  grid-template-columns: 88px 1fr;
  column-gap: 12px;
  row-gap: 4px;
  font-size: 13px;
  line-height: 20px;
`;

const SectionTitle = styled.div`
  grid-column: 1 / -1;
  font-weight: 600;
  margin-bottom: 2px;
`;

const Label = styled.span`
  color: rgba(128, 128, 128, 0.95);
  white-space: nowrap;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const RoleTag = styled(Tag)`
  && {
    margin: 0;
    cursor: pointer;
    font-weight: 600;
    user-select: none;
  }
`;

type Issue = { level: "error" | "warning"; text: string };

const roleName = (master: boolean) => (master ? "MASTER" : "BACKUP");

// 畫面上要提醒的事, 由重到輕
const issuesOf = (data: HaStatus, t: TFunction): Issue[] => {
  const arb = data.arbiter;
  if (!arb) {
    return [
      {
        level: "error",
        text: `${data.arbiterError || t("ha.arbiter_unreachable")}${t("ha.arbiter_unreachable_hint")}`,
      },
    ];
  }

  const issues: Issue[] = [];
  const other = arb.other;
  const peerKnown = other.ha && other.status_known === true;

  if (!data.roleKnown) {
    issues.push({ level: "warning", text: t("ha.role_unknown_hint") });
  } else if (arb.is_master !== (data.role === "MASTER")) {
    issues.push({
      level: "error",
      text: t("ha.role_mismatch", {
        mc: data.role,
        arbiter: roleName(arb.is_master),
      }),
    });
  }

  if (peerKnown && arb.is_master && other.is_master) {
    issues.push({ level: "error", text: t("ha.dual_master") });
  }
  if (peerKnown && !arb.is_master && other.is_master === false) {
    issues.push({ level: "warning", text: t("ha.no_master") });
  }
  if (arb.is_master && arb.has_vip === false) {
    issues.push({ level: "warning", text: t("ha.master_without_vip") });
  }
  if (!arb.is_master && arb.has_vip === true) {
    issues.push({ level: "warning", text: t("ha.backup_with_vip") });
  }
  if (!other.ha) {
    issues.push({ level: "warning", text: t("ha.peer_down") });
  } else if (peerKnown && !other.fleet) {
    issues.push({ level: "warning", text: t("ha.peer_fleet_down") });
  }
  if (arb.maintenance) {
    issues.push({ level: "warning", text: t("ha.maintenance") });
  }
  return issues;
};

const takeOver = (role: "MASTER" | "BACKUP") =>
  client.post("/api/ha/take-over", { role });

const syncCargoFromMaster = () => client.post("/api/ha/sync/cargo");

/**
 * HA 主備狀態: header 上一直看得到的角色標籤, 點開是兩台的狀態、要注意的事
 * 和接手 / 釋放 / 同步的按鈕。沒開 REDUNDANCY 的案場不畫。
 * compact: 手機版 header 放不下文字, 只顯示圖示 (顏色一樣代表狀態)
 */
const HaStatusWidget: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { data } = useHaStatus();
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const takeOverMutation = useMutation({
    mutationFn: takeOver,
    onSuccess: (res) => {
      const { role, peerNotified, peerNotifyError } = res.data as {
        role: "MASTER" | "BACKUP";
        peerNotified?: boolean;
        peerNotifyError?: string;
      };

      // peerNotified 只有在切成 MASTER 時才有意義（arbiter 只有升級時才會
      // 去通知對方降級）；如果通知失敗，代表對方可能還沒被降級成 BACKUP，
      // 要提醒操作者自己去確認，不然可能會兩邊同時是 MASTER。
      if (role === "MASTER" && peerNotified === false) {
        messageApi.warning(
          t("ha.take_over_peer_notify_failed", {
            reason: peerNotifyError || t("ha.unknown_reason"),
          }),
          8,
        );
      } else {
        messageApi.success(t("ha.switch_sent"));
      }
      queryClient.invalidateQueries(["ha-status"]);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const syncMutation = useMutation({
    mutationFn: syncCargoFromMaster,
    onSuccess: () => {
      messageApi.success(t("ha.sync_done"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  // 沒開 REDUNDANCY 或還沒拿到資料就先不畫，避免沒用到 HA 的場站也在 header 看到這塊
  if (!data?.redundancy) return null;

  const arb = data.arbiter;
  const isMaster = data.role === "MASTER";
  const issues = issuesOf(data, t);
  const worst = issues.some((i) => i.level === "error")
    ? "error"
    : issues.length > 0
      ? "warning"
      : null;
  const peerKnown = !!arb && arb.other.ha && arb.other.status_known === true;
  // 沒有 ECS 的案場兩邊永遠是 false, 不顯示這一列
  const showEcs = !!arb && (arb.self.ecs || arb.other.ecs);

  const tagLabel = data.roleKnown ? data.role : t("ha.role_unknown");
  const tagColor = worst ?? (isMaster ? "success" : "processing");
  const tagIcon = worst ? (
    <WarningOutlined />
  ) : isMaster ? (
    <CrownOutlined />
  ) : (
    <CloudServerOutlined />
  );

  const ok = (text: string) => <Badge status="success" text={text} />;
  const bad = (text: string) => <Badge status="error" text={text} />;
  const unknown = <Badge status="default" text={t("ha.unknown")} />;

  const confirmTakeOver = () => {
    setOpen(false);
    const peerReachable = !!arb && arb.other.ha;
    Modal.confirm({
      title: t("ha.confirm_take_over_title"),
      icon: <WarningOutlined />,
      content: (
        <div>
          <p>
            {peerReachable
              ? t("ha.take_over_peer_alive")
              : t("ha.take_over_peer_unreachable")}
          </p>
          <p>{t("ha.take_over_warn_2")}</p>
          <p>{t("ha.take_over_missions")}</p>
        </div>
      ),
      okText: t("ha.take_over"),
      cancelText: t("utils.cancel"),
      onOk: () => takeOverMutation.mutate("MASTER"),
    });
  };

  const confirmRelease = () => {
    setOpen(false);
    Modal.confirm({
      title: t("ha.confirm_release_title"),
      icon: <WarningOutlined />,
      content: <p>{t("ha.release_warn")}</p>,
      okText: t("ha.release"),
      okButtonProps: { danger: true },
      cancelText: t("utils.cancel"),
      onOk: () => takeOverMutation.mutate("BACKUP"),
    });
  };

  // 同步方向固定是「BACKUP 這台去跟 MASTER 要資料」，MASTER 那台不會有這個按鈕
  const confirmSync = () => {
    setOpen(false);
    Modal.confirm({
      title: t("ha.confirm_sync_title", { label: t("ha.sync_item_cargo") }),
      icon: <WarningOutlined />,
      content: <p>{t("ha.sync_warn")}</p>,
      okText: t("ha.confirm_sync_ok"),
      cancelText: t("utils.cancel"),
      onOk: () => syncMutation.mutate(),
    });
  };

  const panel = (
    <Panel>
      {issues.map((issue) => (
        <Alert key={issue.text} type={issue.level} showIcon title={issue.text} />
      ))}

      <Section>
        <SectionTitle>{t("ha.this_host")}</SectionTitle>
        <Label>{t("ha.row_role")}</Label>
        <span>{tagLabel}</span>
        <Label>{t("ha.row_arbiter")}</Label>
        {arb ? ok(t("ha.ok")) : bad(t("ha.unreachable"))}
        <Label>VIP</Label>
        {arb?.has_vip === undefined ? (
          unknown
        ) : (
          <Badge
            status={arb.has_vip ? "success" : "default"}
            text={`${arb.has_vip ? t("ha.vip_here") : t("ha.vip_not_here")}${arb.vip ? ` (${arb.vip})` : ""}`}
          />
        )}
        {showEcs && (
          <>
            <Label>ECS</Label>
            {arb?.self.ecs ? ok(t("ha.connected")) : <Badge status="default" text={t("ha.not_connected")} />}
          </>
        )}
      </Section>

      <Section>
        <SectionTitle>{t("ha.peer_host")}</SectionTitle>
        <Label>{t("ha.row_link")}</Label>
        {!arb ? unknown : arb.other.ha ? ok(t("ha.ok")) : bad(t("ha.disconnected"))}
        <Label>{t("ha.row_peer_fleet")}</Label>
        {peerKnown ? (arb.other.fleet ? ok(t("ha.running")) : bad(t("ha.stopped"))) : unknown}
        <Label>{t("ha.row_role")}</Label>
        {peerKnown && arb.other.is_master !== undefined ? (
          <span>{roleName(arb.other.is_master)}</span>
        ) : (
          unknown
        )}
      </Section>

      <Actions>
        {isMaster ? (
          <Button
            danger
            size="small"
            disabled={!arb}
            loading={takeOverMutation.isLoading}
            onClick={confirmRelease}
          >
            {t("ha.release")}
          </Button>
        ) : (
          <>
            <Button
              type="primary"
              size="small"
              disabled={!arb}
              loading={takeOverMutation.isLoading}
              onClick={confirmTakeOver}
            >
              {t("ha.take_over")}
            </Button>
            <Button
              size="small"
              icon={<SyncOutlined />}
              loading={syncMutation.isLoading}
              onClick={confirmSync}
            >
              {t("ha.sync_from_master")}
            </Button>
          </>
        )}
      </Actions>
    </Panel>
  );

  return (
    <>
      {contextHolder}
      <Popover
        trigger="click"
        placement={compact ? "bottom" : "bottomRight"}
        title={t("ha.panel_title")}
        content={panel}
        open={open}
        onOpenChange={setOpen}
      >
        <RoleTag color={tagColor} icon={tagIcon} aria-label={tagLabel}>
          {compact ? (issues.length > 0 ? issues.length : null) : tagLabel}
          {!compact && issues.length > 0 && ` · ${issues.length}`}
        </RoleTag>
      </Popover>
    </>
  );
};

export default HaStatusWidget;
