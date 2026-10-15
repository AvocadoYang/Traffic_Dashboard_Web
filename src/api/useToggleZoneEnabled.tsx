import { useState } from "react";
import { Modal, message } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import client from "./axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { amrId2ColorRainbow } from "@/utils/utils";
import { c, font, space } from "@/pages/SettingV2/ui/tokens";

type Violations = {
  forbidden: string[];
  overLimit: { limit: number; amrIds: string[] } | null;
};

type ToggleResult = { ok: true } | { ok: false; violations: Violations };

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.md};
  font-family: ${font.mono};
  color: ${c.text};
`;

const Hint = styled.p`
  margin: 0;
  font-size: ${font.sm};
  color: ${c.textSecondary};
`;

const Problem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.sm};
  padding: ${space.md};
  background: ${c.dangerSoft};
  border: 1px solid ${c.danger};
`;

const ProblemTitle = styled.div`
  font-size: ${font.sm};
  font-weight: 700;
  color: ${c.danger};
`;

const Amrs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${space.xs};
`;

const Amr = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 1px 8px;
  font-size: ${font.xs};
  font-weight: 600;
  background: ${c.bg};
  border: 1px solid ${c.border};

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--amr-color);
  }
`;

const AmrChips = ({ amrIds }: { amrIds: string[] }) => (
  <Amrs>
    {amrIds.map((amrId) => (
      <Amr
        key={amrId}
        style={{ "--amr-color": amrId2ColorRainbow(amrId) } as never}
      >
        {amrId}
      </Amr>
    ))}
  </Amrs>
);

/**
 * 區域停用 / 啟用。停用前先確認; 啟用時後端發現區域裡的車違反區域條件
 * (禁止的車在裡面、超過容車數) 就不會啟用, 這裡跳出原因。
 * 回傳的 contextHolder 要放進畫面裡, 對話框才會跟著主題配色。
 */
const useToggleZoneEnabled = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modal, modalHolder] = Modal.useModal();
  const [messageApi, messageHolder] = message.useMessage();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (payload: { id: string; enabled: boolean }) => {
      const { data } = await client.post<ToggleResult>(
        "api/setting/zone-enabled",
        payload,
      );
      return data;
    },
    onMutate: ({ id }) => setPendingId(id),
    onSettled: () => setPendingId(null),
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const refresh = () => {
    void queryClient.refetchQueries({ queryKey: ["map"] });
    void queryClient.refetchQueries({ queryKey: ["active-group-resources"] });
    void queryClient.refetchQueries({ queryKey: ["all-groups-resources"] });
  };

  const showBlocked = (name: string, violations: Violations) => {
    void modal.error({
      title: t("zone_enable.enable_blocked_title", { name }),
      width: 460,
      content: (
        <Body>
          <Hint>{t("zone_enable.enable_blocked_hint")}</Hint>
          {violations.forbidden.length > 0 && (
            <Problem>
              <ProblemTitle>{t("zone_enable.forbidden_inside")}</ProblemTitle>
              <AmrChips amrIds={violations.forbidden} />
            </Problem>
          )}
          {violations.overLimit && (
            <Problem>
              <ProblemTitle>
                {t("zone_enable.over_limit", {
                  count: violations.overLimit.amrIds.length,
                  limit: violations.overLimit.limit,
                })}
              </ProblemTitle>
              <AmrChips amrIds={violations.overLimit.amrIds} />
            </Problem>
          )}
        </Body>
      ),
    });
  };

  const submit = (zone: { id: string; name: string }, enabled: boolean) =>
    mutation.mutate(
      { id: zone.id, enabled },
      {
        onSuccess: (result) => {
          if (!result.ok) {
            showBlocked(zone.name, result.violations);
            return;
          }
          void messageApi.success(
            t(enabled ? "zone_enable.enabled_success" : "zone_enable.disabled_success", {
              name: zone.name,
            }),
          );
          refresh();
        },
      },
    );

  /** 停用要先確認; 啟用直接送, 被擋下來才跳原因 */
  const setEnabled = (zone: { id: string; name: string }, enabled: boolean) => {
    if (enabled) {
      submit(zone, true);
      return;
    }
    void modal.confirm({
      title: t("zone_enable.confirm_disable_title", { name: zone.name }),
      content: <Hint>{t("zone_enable.confirm_disable_content")}</Hint>,
      okText: t("zone_enable.disable"),
      okButtonProps: { danger: true },
      cancelText: t("utils.cancel"),
      onOk: () => submit(zone, false),
    });
  };

  return {
    setEnabled,
    pendingId,
    contextHolder: (
      <>
        {modalHolder}
        {messageHolder}
      </>
    ),
  };
};

export default useToggleZoneEnabled;
