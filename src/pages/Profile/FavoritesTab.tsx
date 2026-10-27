import { FC, useMemo, useState } from "react";
import { Button, Empty, Input, Select, Space, Table, Tag, message } from "antd";
import type { TableColumnsType } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import styled from "styled-components";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import useAllMissionTitles from "@/api/useMissionTitle";
import useName from "@/api/useAmrName";
import useConfigFlags from "@/api/useConfigFlags";
import { FavoriteMission, MyMission, useMyMissions, useMyProfile, useSaveProfile } from "@/api/useProfile";
import { MissionPriority, MissionStatus } from "@/types/mission";
import { Section } from "./parts";

export const FAVORITES_MAX = 30;

export const PRIORITY_KEYS = ["TRIVIAL", "NORMAL", "PIVOTAL", "CRITICAL"] as const;

const STATUS_KEY: Record<number, string> = {
  [MissionStatus.PENDING]: "mission_history.pending",
  [MissionStatus.ASSIGNED]: "mission_history.assigned",
  [MissionStatus.EXECUTING]: "mission_history.executing",
  [MissionStatus.COMPLETED]: "mission_history.completed",
  [MissionStatus.ABORTING]: "mission_history.aborting",
  [MissionStatus.CANCELED]: "mission_history.canceled",
  [MissionStatus.WAITING]: "mission_history.waiting",
};

const AddRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);

  .title-select {
    flex: 2 1 240px;
    min-width: 0;
  }
  .amr-select {
    flex: 1 1 160px;
    min-width: 0;
  }
  .priority-select {
    flex: 1 1 140px;
    min-width: 0;
  }
  .label-input {
    flex: 1 1 160px;
    min-width: 0;
  }
`;

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** 常用任務: 釘在首頁「任務派發」上一鍵派; 下面是今天我派的任務 */
const FavoritesTab: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: profile } = useMyProfile();
  const save = useSaveProfile();
  const { data: titles } = useAllMissionTitles();
  const { data: names } = useName();
  // MiR 案場派任務一定要指定車 (後端擋「隨機」)
  const { data: configFlags } = useConfigFlags();
  const needsVehicle = configFlags?.hasMir ?? false;
  const favorites = profile?.preferences.favorites ?? [];

  const [titleId, setTitleId] = useState<string>();
  const [amrId, setAmrId] = useState<string | null>(null);
  const [priority, setPriority] = useState<number>(MissionPriority.PIVOTAL);
  const [label, setLabel] = useState("");

  const titleName = useMemo(() => new Map((titles ?? []).map((x) => [x.id, x.name])), [titles]);
  const amrOptions = useMemo(() => {
    const amrs = (names?.amrs ?? []).filter((a) => (names?.isSim ? !a.isReal : a.isReal));
    return [
      ...(needsVehicle ? [] : [{ value: "__random", label: t("utils.random") }]),
      ...amrs.map((a) => ({ value: a.amrId, label: a.amrId })),
    ];
  }, [names, t, needsVehicle]);
  const priorityOptions = PRIORITY_KEYS.map((k, i) => ({
    value: i,
    label: t(`main.mission_modal.dialog_mission.priority.${k}` as never),
  }));

  const store = (next: FavoriteMission[]) =>
    save.mutate(
      { preferences: { favorites: next } },
      {
        onSuccess: () => void messageApi.success(t("profile.saved")),
        onError: () => void messageApi.error(t("profile.save_failed")),
      },
    );

  const add = () => {
    if (!titleId) return;
    store([
      ...favorites,
      { id: newId(), titleId, amrId, priority, ...(label.trim() ? { label: label.trim() } : {}) },
    ]);
    setTitleId(undefined);
    setLabel("");
  };

  const move = (index: number, delta: number) => {
    const next = [...favorites];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    store(next);
  };

  const columns: TableColumnsType<FavoriteMission> = [
    {
      title: t("profile.favorites.button"),
      render: (_, f) => <strong>{f.label || titleName.get(f.titleId) || "—"}</strong>,
    },
    {
      title: t("profile.favorites.mission"),
      render: (_, f) =>
        titleName.has(f.titleId) ? titleName.get(f.titleId) : <Tag color="red">{t("profile.favorites.missing")}</Tag>,
    },
    { title: t("utils.amr_id"), render: (_, f) => f.amrId ?? t("utils.random") },
    {
      title: t("profile.favorites.priority"),
      render: (_, f) =>
        t(`main.mission_modal.dialog_mission.priority.${PRIORITY_KEYS[f.priority ?? MissionPriority.PIVOTAL]}` as never),
    },
    {
      title: "",
      width: 130,
      render: (_, f, i) => (
        <Space size={0}>
          <Button
            type="text"
            size="small"
            icon={<ArrowUpOutlined />}
            disabled={i === 0}
            aria-label={t("profile.favorites.up")}
            onClick={() => move(i, -1)}
          />
          <Button
            type="text"
            size="small"
            icon={<ArrowDownOutlined />}
            disabled={i === favorites.length - 1}
            aria-label={t("profile.favorites.down")}
            onClick={() => move(i, 1)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            aria-label={t("utils.delete")}
            onClick={() => store(favorites.filter((x) => x.id !== f.id))}
          />
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Section title={t("profile.favorites.title")} hint={t("profile.favorites.hint")}>
        <AddRow>
          <Select
            className="title-select"
            showSearch
            optionFilterProp="label"
            placeholder={t("profile.favorites.pick_mission")}
            value={titleId}
            onChange={setTitleId}
            options={(titles ?? []).map((x) => ({ value: x.id, label: x.name }))}
          />
          <Select
            className="amr-select"
            placeholder={t("utils.amr_id")}
            value={amrId ?? (needsVehicle ? undefined : "__random")}
            onChange={(v: string) => setAmrId(v === "__random" ? null : v)}
            options={amrOptions}
          />
          <Select className="priority-select" value={priority} onChange={setPriority} options={priorityOptions} />
          <Input
            className="label-input"
            maxLength={40}
            placeholder={t("profile.favorites.label_placeholder")}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!titleId || (needsVehicle && !amrId) || favorites.length >= FAVORITES_MAX}
            onClick={add}
          >
            {t("utils.add")}
          </Button>
        </AddRow>
        {favorites.length === 0 ? (
          <Empty description={t("profile.favorites.empty")} />
        ) : (
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={favorites}
            columns={columns}
            scroll={{ x: "max-content" }}
          />
        )}
      </Section>

      <MyMissions />
    </>
  );
};

const MyMissions: FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useMyMissions();
  const columns: TableColumnsType<MyMission> = [
    {
      title: t("profile.my_missions.time"),
      dataIndex: "createdAt",
      width: 90,
      render: (v: string | null) => (v ? dayjs(v).format("HH:mm:ss") : "—"),
    },
    { title: t("profile.my_missions.name"), dataIndex: "name", render: (v: string) => v || "—" },
    { title: t("utils.amr_id"), dataIndex: "amrId" },
    {
      title: t("utils.status"),
      dataIndex: "status",
      render: (v: number) => (STATUS_KEY[v] ? t(STATUS_KEY[v] as never) : v),
    },
    { title: t("client_name.title"), dataIndex: "clientName", render: (v: string | null) => v ?? "—" },
  ];
  return (
    <Section title={t("profile.my_missions.title")} hint={t("profile.my_missions.hint")}>
      <Table
        size="small"
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        columns={columns}
        pagination={{ pageSize: 10, size: "small" }}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: t("profile.my_missions.empty") }}
      />
    </Section>
  );
};

export default FavoritesTab;
