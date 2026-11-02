import { FC, useEffect, useMemo, useState } from "react";
import { Radio, Select, Skeleton, message } from "antd";
import type { MessageInstance } from "antd/es/message/interface";
import { ClockCircleOutlined, DeleteOutlined, SaveOutlined } from "@ant-design/icons";
import { Popconfirm } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import {
  BLOCKED_ACTIONS,
  BOOKING_TIMINGS,
  BOOKING_TIMING_KEY,
  BookingTimingConfig,
  BookingTimingSetting,
  OFFLOAD_BLOCKED_ACTIONS,
  useBookingTimingConfig,
} from "@/api/useBookingTiming";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import {
  PanelShell,
  Section,
  SectionTitle,
  FieldGrid,
  Field,
  FieldLabel,
  Toolbar,
  SolidButton,
  DangerButton,
  Hint,
  EmptyState,
  Tag,
  WarnNote,
  CountNote,
} from "../../ui/primitives";

/**
 * 群組預約時機: 群組當取貨 / 放貨目的地時, 位置是任務建立當下就挑好預約好,
 * 還是車開到那一步才挑; 到了卻挑不到位置時車怎麼辦。
 * 沒設定的群組跟以前一樣在任務建立當下預約。
 */
const BookingTimingPanel: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: config, isLoading } = useBookingTimingConfig();

  if (isLoading || !config) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}
      {!config.schemaReady && <WarnNote>{t("booking_timing.schema_not_ready")}</WarnNote>}
      <Hint>{t("booking_timing.intro")}</Hint>
      <Editor config={config} messageApi={messageApi} />
    </PanelShell>
  );
};

type End = "pick" | "offload";

const Editor: FC<{ config: BookingTimingConfig; messageApi: MessageInstance }> = ({
  config,
  messageApi,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { groups } = config;
  const [groupId, setGroupId] = useState<string | undefined>(groups[0]?.id);

  useEffect(() => {
    if (!groups.some((g) => g.id === groupId)) setGroupId(groups[0]?.id);
  }, [groups, groupId]);

  const group = groups.find((g) => g.id === groupId);
  const savedKey = JSON.stringify(group?.setting ?? null);
  const [draft, setDraft] = useState<BookingTimingSetting | null>(group?.setting ?? null);

  // 換群組, 或後端的設定真的變了 (例如別人存檔) 才重設草稿
  useEffect(() => {
    setDraft(JSON.parse(savedKey) as BookingTimingSetting | null);
  }, [groupId, savedKey]);

  const changed = useMemo(() => JSON.stringify(draft) !== savedKey, [draft, savedKey]);

  const onDone = () => {
    void messageApi.success(t("utils.success"));
    void queryClient.invalidateQueries({ queryKey: BOOKING_TIMING_KEY });
  };
  const onError = (e: ErrorResponse) => errorHandler(e, messageApi);

  // groupName 只是給設定變更紀錄看是哪個群組
  const saveMutation = useMutation({
    mutationFn: (setting: BookingTimingSetting) =>
      client.put(`/api/booking-timing/${groupId}`, { ...setting, groupName: group?.name }),
    onSuccess: onDone,
    onError,
  });
  const resetMutation = useMutation({
    mutationFn: () =>
      client.delete(`/api/booking-timing/${groupId}`, { data: { groupName: group?.name } }),
    onSuccess: onDone,
    onError,
  });

  if (groups.length === 0 || !group || !draft) {
    return <EmptyState>{t("booking_timing.no_group")}</EmptyState>;
  }

  const patch = (next: Partial<BookingTimingSetting>) =>
    setDraft((d) => (d ? { ...d, ...next } : d));

  const renderEnd = (end: End) => {
    const timing = draft[end === "pick" ? "pickTiming" : "offloadTiming"];
    const blocked = draft[end === "pick" ? "pickBlocked" : "offloadBlocked"];
    const allowed = end === "pick" ? BLOCKED_ACTIONS : OFFLOAD_BLOCKED_ACTIONS;
    const late = timing === "AT_ARRIVAL";
    return (
      <Section key={end}>
        <SectionTitle>
          <ClockCircleOutlined />
          {t(`booking_timing.${end}_title`)}
        </SectionTitle>
        <Hint>{t(`booking_timing.${end}_hint`)}</Hint>
        <FieldGrid $cols={1}>
          {/* 單選鈕不能包在 <label> 裡: 點欄位名稱會選到第一個選項 */}
          <Field as="div">
            <FieldLabel>{t("booking_timing.timing_label")}</FieldLabel>
            <Radio.Group
              optionType="button"
              value={timing}
              onChange={(e) =>
                patch(
                  end === "pick"
                    ? { pickTiming: e.target.value }
                    : { offloadTiming: e.target.value },
                )
              }
              options={BOOKING_TIMINGS.map((o) => ({
                label: t(`booking_timing.timing_${o}`),
                value: o,
              }))}
            />
            <Hint>{t(`booking_timing.timing_hint_${timing}`)}</Hint>
          </Field>
          {late && (
            <Field as="div">
              <FieldLabel>{t("booking_timing.blocked_label")}</FieldLabel>
              <Radio.Group
                optionType="button"
                value={blocked}
                onChange={(e) =>
                  patch(
                    end === "pick"
                      ? { pickBlocked: e.target.value }
                      : { offloadBlocked: e.target.value },
                  )
                }
                options={allowed.map((o) => ({
                  label: t(`booking_timing.blocked_${o}`),
                  value: o,
                }))}
              />
              <Hint>{t(`booking_timing.blocked_hint_${blocked}`)}</Hint>
              {end === "offload" && <Hint>{t("booking_timing.offload_no_pool")}</Hint>}
            </Field>
          )}
          {late && !config.enforced[end] && (
            <WarnNote>{t("booking_timing.not_enforced")}</WarnNote>
          )}
        </FieldGrid>
      </Section>
    );
  };

  return (
    <>
      <Section>
        <Toolbar>
          <Select
            style={{ minWidth: 200 }}
            value={groupId}
            onChange={setGroupId}
            options={groups.map((g) => ({ label: g.name, value: g.id }))}
            showSearch={{
              filterOption: (input, option) =>
                String(option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase()),
            }}
          />
          <CountNote>{t("booking_timing.member_count", { count: group.memberCount })}</CountNote>
          {!group.configured && <Tag>{t("booking_timing.not_configured")}</Tag>}
          {changed && <Tag>{t("booking_timing.unsaved")}</Tag>}
        </Toolbar>
      </Section>

      {renderEnd("pick")}
      {renderEnd("offload")}

      <Toolbar>
        <SolidButton
          type="button"
          disabled={!changed || saveMutation.isPending}
          onClick={() => saveMutation.mutate(draft)}
        >
          <SaveOutlined />
          {t("booking_timing.save")}
        </SolidButton>
        {group.configured && (
          <Popconfirm
            title={t("booking_timing.reset_confirm")}
            onConfirm={() => resetMutation.mutate()}
          >
            <DangerButton type="button" disabled={resetMutation.isPending}>
              <DeleteOutlined />
              {t("booking_timing.reset")}
            </DangerButton>
          </Popconfirm>
        )}
      </Toolbar>
    </>
  );
};

export default BookingTimingPanel;
