import { FC, useMemo, useState } from "react";
import { Popconfirm, message } from "antd";
import { StarFilled } from "@ant-design/icons";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import useAllMissionTitles from "@/api/useMissionTitle";
import { FavoriteMission, useMyProfile } from "@/api/useProfile";
import { dispatchFavorite, FavoriteDispatchError } from "@/utils/dispatchFavorite";

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: var(--space-sm);
`;

const Title = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: var(--space-xs);
  font-size: var(--font-sm);
  color: var(--c-text-secondary);

  .anticon {
    color: #d4a017;
  }
`;

const Chip = styled.button`
  all: unset;
  box-sizing: border-box;
  max-width: 14rem;
  min-height: 2.25rem;
  padding: 0 var(--space-md);
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--c-header-border);
  border-radius: 999px;
  background: var(--c-bg);
  color: var(--c-text);
  font-size: var(--font-md);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;

  &:hover,
  &:active {
    border-color: var(--c-header-accent);
    color: var(--c-header-accent);
  }
  &:focus-visible {
    outline: 2px solid var(--c-header-accent);
    outline-offset: 2px;
  }
  &[aria-busy="true"] {
    opacity: 0.6;
    cursor: progress;
  }
`;

/**
 * 常用任務的資料和派發 (首頁下方的任務派發面板、大螢幕 header 的任務派發列共用)。
 * 任務被刪掉的常用任務不列出來。
 */
export const useFavoriteMissions = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: profile } = useMyProfile();
  const { data: titles } = useAllMissionTitles();
  const [busy, setBusy] = useState<string | null>(null);
  const titleName = useMemo(() => new Map((titles ?? []).map((x) => [x.id, x.name])), [titles]);
  const favorites = (profile?.preferences.favorites ?? [])
    .map((fav) => ({ fav, name: fav.label || titleName.get(fav.titleId) || "", title: titleName.get(fav.titleId) }))
    .filter((x) => x.name && x.title);

  const run = async (fav: FavoriteMission) => {
    setBusy(fav.id);
    try {
      await dispatchFavorite(fav);
      void messageApi.success(t("profile.favorites.dispatched"));
      void qc.invalidateQueries({ queryKey: ["profile", "my-missions"] });
    } catch (e) {
      const kind = e instanceof FavoriteDispatchError ? e.kind : "failed";
      const detail = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      void messageApi.error(
        kind === "failed" ? `${t("profile.favorites.failed")}${detail ? `: ${detail}` : ""}` : t(`profile.favorites.${kind}`),
      );
    } finally {
      setBusy(null);
    }
  };

  return { favorites, run, busy, contextHolder };
};

/** 首頁「任務派發」上的常用任務: 個人設定 > 常用任務釘的, 確認後一鍵派 */
const FavoriteMissionBar: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { favorites, run, busy, contextHolder } = useFavoriteMissions();

  if (favorites.length === 0) return null;

  return (
    <Bar>
      {contextHolder}
      <Title>
        <StarFilled /> {t("profile.tab.favorites")}
      </Title>
      {favorites.map(({ fav, name, title }) => (
        <Popconfirm
          key={fav.id}
          title={t("profile.favorites.confirm", { name })}
          description={fav.amrId ? `${t("utils.amr_id")}: ${fav.amrId}` : t("utils.random")}
          onConfirm={() => void run(fav)}
        >
          <Chip type="button" aria-busy={busy === fav.id} title={title}>
            {name}
          </Chip>
        </Popconfirm>
      ))}
      <Chip
        type="button"
        style={{ borderStyle: "dashed", fontWeight: 400 }}
        onClick={() => navigate("/profile?tab=favorites")}
      >
        {t("profile.favorites.manage")}
      </Chip>
    </Bar>
  );
};

export default FavoriteMissionBar;
