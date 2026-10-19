import { FC, useState } from "react";
import { Button, Card, DatePicker, Empty, Input, Modal, Progress, Space, Switch, Table, Tag, Typography, message } from "antd";
import { CheckOutlined, ToolOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import {
  MAINTENANCE_STATUS_KEY,
  MaintenanceItemStatus,
  MaintenanceStatus,
  useCarMaintenance,
  useMaintenanceRecords,
} from "@/api/useMaintenance";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

const { Text } = Typography;

export const STATUS_COLOR: Record<MaintenanceStatus, string> = {
  ok: "green",
  soon: "orange",
  due: "red",
};

const fmt = (v: number) => (v >= 100 ? Math.round(v).toString() : (Math.round(v * 10) / 10).toString());

/**
 * 車輛資訊頁的「保養」: 每個保養項目用了多少 (里程 / 運轉時數 / 天數)、到期沒,
 * 「完成保養」(可以補登以前的日期), 「維修中」(不派任何任務), 最近的保養紀錄。
 * 項目在設定頁 車輛 > 保養項目 設定。
 */
const MaintenanceSection: FC<{ amrId: string }> = ({ amrId }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const { data } = useCarMaintenance(amrId);
  const { data: records, refetch: refetchRecords } = useMaintenanceRecords(amrId);
  const car = data?.cars[0];

  const [completing, setCompleting] = useState<MaintenanceItemStatus | null>(null);
  const [doneAt, setDoneAt] = useState<Dayjs>(dayjs());
  const [note, setNote] = useState("");
  const [holdOpen, setHoldOpen] = useState(false);
  const [reason, setReason] = useState("");

  const refresh = () => {
    void queryClient.invalidateQueries(MAINTENANCE_STATUS_KEY);
    void refetchRecords();
  };
  const onError = (e: ErrorResponse) => errorHandler(e, messageApi);

  const completeMutation = useMutation({
    mutationFn: () =>
      client.post("api/maintenance/complete", {
        itemId: completing?.itemId,
        amrId,
        doneAt: doneAt.toISOString(),
        note,
      }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      setCompleting(null);
      refresh();
    },
    onError,
  });

  const holdMutation = useMutation({
    mutationFn: (hold: boolean) => client.post("api/maintenance/hold", { amrId, hold, reason }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      setHoldOpen(false);
      refresh();
    },
    onError,
  });

  const unit = (kind: "km" | "hours" | "days") => t(`car_maintenance.unit_${kind}`);

  return (
    <Card
      style={{ border: "2px solid var(--c-header-border)", borderRadius: 0, marginBottom: 24 }}
      title={
        <Space>
          <ToolOutlined />
          {t("car_maintenance.title")}
          {car?.hold && <Tag color="red">{t("car_maintenance.on_hold")}</Tag>}
        </Space>
      }
      extra={
        <Space>
          <Text>{t("car_maintenance.hold")}</Text>
          <Switch
            checked={!!car?.hold}
            loading={holdMutation.isLoading}
            onChange={(v) => {
              if (v) {
                setReason("");
                setHoldOpen(true);
              } else {
                holdMutation.mutate(false);
              }
            }}
          />
        </Space>
      }
    >
      {contextHolder}
      {car?.hold && (
        <Text type="danger" style={{ display: "block", marginBottom: 12 }}>
          {t("car_maintenance.hold_fact", {
            since: dayjs(car.hold.since).format("YYYY-MM-DD HH:mm"),
            reason: car.hold.reason || "—",
            who: car.hold.by?.account ?? "",
          })}
        </Text>
      )}

      {!data?.recorded ? (
        <Text type="secondary">{t("car_maintenance.not_recorded")}</Text>
      ) : !car || car.items.length === 0 ? (
        <Empty description={t("car_maintenance.no_items")} />
      ) : (
        <Table<MaintenanceItemStatus>
          size="small"
          rowKey="itemId"
          pagination={false}
          dataSource={car.items}
          columns={[
            { title: t("car_maintenance.item"), dataIndex: "name" },
            {
              title: t("car_maintenance.usage"),
              key: "usage",
              render: (_, s) =>
                s.progress.map((p) => (
                  <div key={p.kind} style={{ minWidth: 180 }}>
                    {fmt(p.used)} / {p.interval} {unit(p.kind)}
                    <Progress
                      percent={Math.min(100, Math.round(p.ratio * 100))}
                      size="small"
                      showInfo={false}
                      status={p.ratio >= 1 ? "exception" : "normal"}
                    />
                  </div>
                )),
            },
            {
              title: t("car_maintenance.status"),
              dataIndex: "status",
              render: (v: MaintenanceStatus) => <Tag color={STATUS_COLOR[v]}>{t(`car_maintenance.status_${v}`)}</Tag>,
            },
            {
              title: t("car_maintenance.last_done"),
              dataIndex: "lastDoneAt",
              render: (v: number | null) => (v ? dayjs(v).format("YYYY-MM-DD") : t("car_maintenance.never")),
            },
            {
              title: "",
              key: "act",
              render: (_, s) => (
                <Button
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => {
                    setDoneAt(dayjs());
                    setNote("");
                    setCompleting(s);
                  }}
                >
                  {t("car_maintenance.complete")}
                </Button>
              ),
            },
          ]}
        />
      )}

      {!!records?.length && (
        <>
          <Text strong style={{ display: "block", margin: "16px 0 8px" }}>
            {t("car_maintenance.records")}
          </Text>
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={records}
            columns={[
              { title: t("car_maintenance.done_at"), dataIndex: "doneAt", render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm") },
              { title: t("car_maintenance.item"), dataIndex: "itemName" },
              {
                title: t("car_maintenance.done_by"),
                dataIndex: "doneBy",
                render: (v: { account?: string; clientName?: string } | null) =>
                  [v?.account, v?.clientName].filter(Boolean).join(" · ") || "—",
              },
              { title: t("car_maintenance.note"), dataIndex: "note" },
            ]}
          />
        </>
      )}

      <Modal
        open={!!completing}
        title={t("car_maintenance.complete_title", { name: completing?.name ?? "" })}
        onCancel={() => setCompleting(null)}
        onOk={() => completeMutation.mutate()}
        confirmLoading={completeMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        destroyOnHidden
      >
        <Text>{t("car_maintenance.done_at")}</Text>
        <DatePicker
          showTime={{ format: "HH:mm" }}
          format="YYYY-MM-DD HH:mm"
          value={doneAt}
          allowClear={false}
          disabledDate={(d) => d.isAfter(dayjs(), "day")}
          onChange={(v) => v && setDoneAt(v)}
          style={{ width: "100%", margin: "4px 0 12px" }}
        />
        <Text>{t("car_maintenance.note")}</Text>
        <Input.TextArea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} autoSize={{ minRows: 2 }} />
        <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
          {t("car_maintenance.complete_hint")}
        </Text>
      </Modal>

      <Modal
        open={holdOpen}
        title={t("car_maintenance.hold_title", { amrId })}
        onCancel={() => setHoldOpen(false)}
        onOk={() => holdMutation.mutate(true)}
        confirmLoading={holdMutation.isLoading}
        okText={t("utils.confirm")}
        cancelText={t("utils.cancel")}
        destroyOnHidden
      >
        <Text>{t("car_maintenance.hold_hint")}</Text>
        <Input.TextArea
          style={{ marginTop: 8 }}
          maxLength={500}
          placeholder={t("car_maintenance.reason_placeholder")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoSize={{ minRows: 2 }}
        />
      </Modal>
    </Card>
  );
};

export default MaintenanceSection;
