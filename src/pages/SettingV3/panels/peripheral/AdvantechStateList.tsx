import { FC, useState } from "react";
import { Tooltip, message } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  EditOutlined,
  PlusOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import client from "@/api/axiosClient";
import {
  AdvantechGroupRow,
  AdvantechStateRow,
  describeConditions,
  evaluateGroup,
  useAdvantechIoStatus,
} from "@/api/useAdvantech";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { c, font, space } from "@/theme/tokens";
import { GhostButton, Hint } from "@/pages/SettingV3/ui/primitives";
import { toneSoft, toneSolid } from "@/components/Advantech/stateTone";
import AdvantechStateModal from "./AdvantechStateModal";

const Area = styled.div`
  align-self: stretch;
  display: flex;
  flex-direction: column;
  gap: ${space.xs};
  padding-top: ${space.sm};
  border-top: 1px solid ${c.border};
`;

const AreaLabel = styled.span`
  font-size: ${font.md};
  color: ${c.textSecondary};
`;

const List = styled.ol`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

/** 一筆一列: 訊號 → 代表什麼、成立時亮起來、上移 / 下移 / 編輯 */
const Row = styled.li<{ $tone: AdvantechStateRow["tone"]; $live: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: ${space.sm};
  padding: 6px ${space.sm} 6px 10px;
  border-radius: 6px;
  border: 1px solid
    ${({ $tone, $live }) => ($live ? toneSolid($tone) : c.border)};
  border-left: 4px solid ${({ $tone }) => toneSolid($tone)};
  background: ${({ $tone, $live }) => ($live ? toneSoft($tone) : c.bg)};
  transition:
    background 0.2s,
    border-color 0.2s;
`;

const Main = styled.div`
  min-width: 0;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 2px ${space.sm};
`;

const Signals = styled.span`
  font-family: ${font.mono};
  font-size: ${font.sm};
  font-weight: 600;
  color: ${c.textSecondary};
  white-space: nowrap;
`;

const Name = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: ${font.md};
  font-weight: 600;
  color: ${c.text};
  overflow-wrap: anywhere;
`;

const Arrow = styled.span`
  color: ${c.textMuted};
`;

const LiveBadge = styled.span<{ $tone: AdvantechStateRow["tone"] }>`
  flex: 0 0 auto;
  padding: 0 6px;
  border-radius: 999px;
  background: ${({ $tone }) => toneSolid($tone)};
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  letter-spacing: 0.4px;
`;

const RowButtons = styled.span`
  display: inline-flex;
  gap: 2px;
`;

type Props = {
  group: AdvantechGroupRow;
  onChanged: () => void;
};

/**
 * 群組卡上的「訊號意義」區: 哪些訊號 ON 代表什麼 (例如 DO0 + DO1 → 專屬模式啟動),
 * 現在成立的亮起來, 跟首頁 Advantech 4000 方塊看到的一樣。
 */
const AdvantechStateList: FC<Props> = ({ group, onChanged }) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: status } = useAdvantechIoStatus();
  const [editing, setEditing] = useState<AdvantechStateRow | null>(null);
  const [open, setOpen] = useState(false);

  const states = group.states ?? [];
  const result = evaluateGroup(group, status);
  const live = new Set(
    result.kind === "ok" ? result.active.map((s) => s.id) : [],
  );
  const inGroup = new Set(group.modules.map((m) => m.id));

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) =>
      client.post("api/setting/reorder-advantech-state", {
        groupId: group.id,
        ids,
      }),
    onSuccess: onChanged,
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const move = (index: number, delta: number) => {
    const ids = states.map((s) => s.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderMutation.mutate(ids);
  };

  const openState = (s: AdvantechStateRow | null) => {
    setEditing(s);
    setOpen(true);
  };

  return (
    <Area>
      {contextHolder}
      <AreaLabel>{t("advantech.state.title")}</AreaLabel>

      {states.length === 0 ? (
        <Hint>{t("advantech.state.empty")}</Hint>
      ) : (
        <List>
          {states.map((s, i) => {
            const broken = s.conditions.some((x) => !inGroup.has(x.moduleId));
            const isLive = live.has(s.id);
            return (
              <Row key={s.id} $tone={s.tone} $live={isLive}>
                <Main>
                  <Signals>
                    {describeConditions(
                      group,
                      s.conditions,
                      t("advantech.state.missing_module"),
                    )}
                  </Signals>
                  <Arrow>→</Arrow>
                  <Name>
                    {s.name}
                    {isLive && (
                      <LiveBadge $tone={s.tone}>
                        {t("advantech.state.now")}
                      </LiveBadge>
                    )}
                    {broken && (
                      <Tooltip title={t("advantech.state.broken")}>
                        <WarningOutlined style={{ color: c.warning }} />
                      </Tooltip>
                    )}
                  </Name>
                </Main>
                <RowButtons>
                  <GhostButton
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || reorderMutation.isLoading}
                    aria-label="up"
                  >
                    <ArrowUpOutlined />
                  </GhostButton>
                  <GhostButton
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={
                      i === states.length - 1 || reorderMutation.isLoading
                    }
                    aria-label="down"
                  >
                    <ArrowDownOutlined />
                  </GhostButton>
                  <GhostButton
                    type="button"
                    onClick={() => openState(s)}
                    aria-label={t("utils.edit")}
                  >
                    <EditOutlined />
                  </GhostButton>
                </RowButtons>
              </Row>
            );
          })}
        </List>
      )}

      <div>
        <GhostButton
          type="button"
          onClick={() => openState(null)}
          disabled={!group.modules.length}
        >
          <PlusOutlined />
          {t("advantech.state.add_short")}
        </GhostButton>
      </div>

      <AdvantechStateModal
        open={open}
        group={group}
        state={editing}
        onClose={() => setOpen(false)}
        onSaved={onChanged}
      />
    </Area>
  );
};

export default AdvantechStateList;
