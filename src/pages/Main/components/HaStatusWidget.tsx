import { Button, Modal, Select, Tag, message } from "antd";
import { CrownOutlined, SyncOutlined, WarningOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import client from "@/api/axiosClient";
import useHaStatus from "@/api/useHaStatus";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";

const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

// 之後如果要加「任務資料」同步，往這裡加一個 value 就好，對應的後端
// 路由是 POST /api/ha/sync/<value>——現在只有 cargo 真的有實作。
const SYNC_ITEM_OPTIONS = [
  { value: "cargo", labelKey: "ha.sync_item_cargo" },
  { value: "mission", labelKey: "ha.sync_item_mission", disabled: true },
] as const;

const takeOver = (role: "MASTER" | "BACKUP") =>
  client.post("/api/ha/take-over", { role });

const syncFromMaster = (item: string) =>
  client.post(`/api/ha/sync/${item}`);

const HaStatusWidget: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { data } = useHaStatus();
  const [syncItem, setSyncItem] = useState<string>("cargo");
  const { t } = useTranslation();
  const syncItemOptions = SYNC_ITEM_OPTIONS.map(({ labelKey, ...o }) => ({
    ...o,
    label: t(labelKey),
  }));

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
    mutationFn: syncFromMaster,
    onSuccess: () => {
      messageApi.success(t("ha.sync_done"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  // 沒開 REDUNDANCY 或還沒拿到資料就先不畫，避免沒用到 HA 的場站也在首頁看到這塊
  if (!data?.redundancy) return null;

  const isMaster = data.role === "MASTER";
  const arbiterUnreachable = !data.arbiter;
  const peerHaDown = data.arbiter ? !data.arbiter.other.ha : false;

  const confirmTakeOver = (role: "MASTER" | "BACKUP") => {
    const toMaster = role === "MASTER";
    Modal.confirm({
      title: toMaster
        ? t("ha.confirm_take_over_title")
        : t("ha.confirm_release_title"),
      icon: <WarningOutlined />,
      content: toMaster ? (
        <div>
          <p>{t("ha.take_over_warn_1")}</p>
          <p>{t("ha.take_over_warn_2")}</p>
        </div>
      ) : (
        <p>{t("ha.release_warn")}</p>
      ),
      okText: t("utils.confirm"),
      cancelText: t("utils.cancel"),
      onOk: () => takeOverMutation.mutate(role),
    });
  };

  const confirmSync = () => {
    const label =
      syncItemOptions.find((o) => o.value === syncItem)?.label ?? syncItem;
    Modal.confirm({
      title: t("ha.confirm_sync_title", { label }),
      icon: <WarningOutlined />,
      content: (
        <p>{t("ha.sync_warn")}</p>
      ),
      okText: t("ha.confirm_sync_ok"),
      cancelText: t("utils.cancel"),
      onOk: () => syncMutation.mutate(syncItem),
    });
  };

  return (
    <Wrap>
      {contextHolder}
      <Tag
        icon={isMaster ? <CrownOutlined /> : undefined}
        color={isMaster ? "green" : "default"}
      >
        {isMaster ? "MASTER" : "BACKUP"}
      </Tag>

      {arbiterUnreachable ? (
        <Tag icon={<WarningOutlined />} color="error">
          {data.arbiterError || t("ha.arbiter_unreachable")}
        </Tag>
      ) : peerHaDown ? (
        <Tag icon={<WarningOutlined />} color="warning">
          {t("ha.peer_down")}
        </Tag>
      ) : (
        <Tag color="success">{t("ha.peer_ok")}</Tag>
      )}

      {isMaster ? (
        <Button
          size="small"
          danger
          loading={takeOverMutation.isLoading}
          onClick={() => confirmTakeOver("BACKUP")}
        >
          {t("ha.release")}
        </Button>
      ) : (
        <>
          <Button
            size="small"
            type="primary"
            loading={takeOverMutation.isLoading}
            onClick={() => confirmTakeOver("MASTER")}
          >
            {t("ha.take_over")}
          </Button>

          {/* 只有 BACKUP 才看得到、能按這個——同步方向固定是「這台去跟
              MASTER 要資料」，MASTER 那台不會有這個按鈕，避免不小心
              反方向把 MASTER 的資料蓋成 BACKUP 的。 */}
          <Select
            size="small"
            value={syncItem}
            onChange={setSyncItem}
            options={syncItemOptions}
            style={{ width: 160 }}
          />
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
    </Wrap>
  );
};

export default HaStatusWidget;
