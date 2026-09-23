import { FC, useMemo, useState } from "react";
import { Input, Popconfirm, Select, Skeleton, Table, message } from "antd";
import type { TableColumnsType } from "antd";
import {
  ControlOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  PlusOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useAllMissionTitlesDetail from "@/api/useMissionTitleDetail";
import useMissionFolder from "@/api/useMissionFolder";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { Err } from "@/utils/responseErr";
import { Mission_Title } from "@/pages/Setting/formComponent/forms/missionComponents/editMission/mission";
import UpgradeTaskFormat from "@/pages/Setting/formComponent/forms/missionComponents/editMission/UpgradeTaskFormat";
import useIsNarrow from "../../../ui/useIsNarrow";
import FolderChips from "./FolderChips";
import FolderEditorModal from "./FolderEditorModal";
import MissionMetaModal from "./MissionMetaModal";
import MissionTaskView from "./MissionTaskView";
import {
  PanelShell,
  Section,
  SectionTitle,
  Toolbar,
  SolidButton,
  GhostButton,
  DangerButton,
  EmptyState,
  TableWrap,
  CardList,
  ItemCard,
  CardTitleRow,
  CardFacts,
  Tag,
} from "../../../ui/primitives";

/** 選到某個任務之後要記住的資訊,步驟畫面需要車種來決定用哪一套編輯器 */
type OpenMission = {
  id: string;
  name: string;
  robotValue: string;
};

const EditMissionPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const {
    data: missions,
    isLoading,
    isFetching,
    refetch,
  } = useAllMissionTitlesDetail();
  const { data: folders } = useMissionFolder();
  const currentMapId = useAtomValue(currentMapIdAtom);

  const [search, setSearch] = useState("");
  const [folderId, setFolderId] = useState("");
  const [openMission, setOpenMission] = useState<OpenMission | null>(null);
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaMissionId, setMetaMissionId] = useState<string | null>(null);
  const [folderEditorOpen, setFolderEditorOpen] = useState(false);

  const folderOptions = useMemo(
    () => folders?.map((f) => ({ label: f.name, value: f.id })) ?? [],
    [folders],
  );

  const rows = useMemo(() => {
    const all = (missions ?? []) as unknown as Mission_Title[];
    const keyword = search.trim().toLowerCase();
    return all
      .filter((m) => m.name.toLowerCase().includes(keyword))
      .filter((m) => (folderId ? m.mission_folder?.id === folderId : true));
  }, [missions, search, folderId]);

  const existingNames = useMemo(
    () => ((missions ?? []) as unknown as Mission_Title[]).map((m) => m.name),
    [missions],
  );

  const onError = (error: Err) =>
    void messageApi.error(error?.response?.data?.message || t("utils.error"));

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client.post(
        "api/setting/delete-mission-title",
        { id, currentMapId },
        {
          headers: { authorization: `Bearer ${localStorage.getItem("_KMT")}` },
        },
      ),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["all-mission-title-detail"],
      });
      await queryClient.refetchQueries({ queryKey: ["all-relate-task"] });
      void messageApi.success(t("utils.success"));
    },
    onError,
  });

  const changeFolderMutation = useMutation({
    mutationFn: (payload: { folderId: string; missionId: string }) =>
      client.post("api/setting/change-mission-folder", payload),
    onSuccess: async () => {
      void messageApi.success(t("utils.success"));
      await queryClient.refetchQueries({ queryKey: ["mission-folder"] });
      await queryClient.refetchQueries({
        queryKey: ["all-mission-title-detail"],
      });
    },
    onError,
  });

  const openTasks = async (row: Mission_Title) => {
    setOpenMission({
      id: row.id,
      name: row.name,
      robotValue: row.Robot_types?.value ?? "",
    });
    await queryClient.refetchQueries({ queryKey: ["all-relate-task"] });
  };

  const openMeta = (id: string | null) => {
    setMetaMissionId(id);
    setMetaOpen(true);
  };

  const tagCells = (row: Mission_Title) =>
    row.MissionTitleBridgeCategory?.length
      ? row.MissionTitleBridgeCategory.map((c, i) => (
          <Tag key={c.Category?.id ?? i}>{c.Category?.tagName}</Tag>
        ))
      : "—";

  const columns: TableColumnsType<Mission_Title> = [
    {
      title: t("mission.add_mission.name"),
      dataIndex: "name",
      key: "name",
      width: 220,
      fixed: "left",
      defaultSortOrder: "ascend",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: t("mission.add_mission.car"),
      key: "car",
      width: 130,
      render: (_, r) => r.Robot_types?.name || "—",
    },
    {
      title: t("mission.add_mission.folder"),
      key: "folder",
      width: 200,
      render: (_, r) => (
        <Select
          size="small"
          style={{ width: "100%" }}
          value={r.mission_folder?.id ?? null}
          options={folderOptions}
          placeholder={t("mission.add_mission.folder")}
          onChange={(v: string) =>
            changeFolderMutation.mutate({ folderId: v, missionId: r.id })
          }
        />
      ),
    },
    {
      title: t("mission.add_mission.tag"),
      key: "tag",
      width: 200,
      render: (_, r) => tagCells(r),
    },
    {
      title: "",
      key: "actions",
      width: 160,
      fixed: "right",
      render: (_, row) => (
        <Toolbar>
          <GhostButton onClick={() => void openTasks(row)}>
            <ControlOutlined />
          </GhostButton>
          <GhostButton onClick={() => openMeta(row.id)}>
            <EditOutlined />
          </GhostButton>
          <Popconfirm
            title={t("utils.delete_warn")}
            okText={t("utils.confirm")}
            cancelText={t("utils.cancel")}
            onConfirm={() => deleteMutation.mutate(row.id)}
          >
            <DangerButton>
              <DeleteOutlined />
            </DangerButton>
          </Popconfirm>
        </Toolbar>
      ),
    },
  ];

  if (isLoading) return <Skeleton active />;

  // 選了任務就整個面板換成步驟畫面,由它自己負責返回
  if (openMission) {
    return (
      <MissionTaskView
        missionId={openMission.id}
        missionName={openMission.name}
        robotValue={openMission.robotValue}
        onBack={() => setOpenMission(null)}
      />
    );
  }

  return (
    <PanelShell>
      {contextHolder}

      <Section>
        <SectionTitle>
          <ScheduleOutlined />
          {t("mission.add_mission.title")}
        </SectionTitle>

        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t("mission.add_mission.search_mission")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <FolderChips selected={folderId} onSelect={setFolderId} />

        <Toolbar>
          <SolidButton onClick={() => openMeta(null)}>
            <PlusOutlined />
            {t("mission.add_mission.create_mission")}
          </SolidButton>
          <GhostButton onClick={() => setFolderEditorOpen(true)}>
            <FolderOutlined />
            {t("folder_editor.title")}
          </GhostButton>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
          <UpgradeTaskFormat />
        </Toolbar>

        {rows.length === 0 ? (
          <EmptyState>NO MISSIONS</EmptyState>
        ) : isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id}>
                <CardTitleRow>
                  <span>{row.name}</span>
                  <Tag>{row.Robot_types?.name || "—"}</Tag>
                </CardTitleRow>

                <CardFacts>
                  <dt>{t("mission.add_mission.folder")}</dt>
                  <dd>{row.mission_folder?.name || "—"}</dd>
                  <dt>{t("mission.add_mission.tag")}</dt>
                  <dd>{tagCells(row)}</dd>
                </CardFacts>

                <Toolbar>
                  <SolidButton onClick={() => void openTasks(row)}>
                    <ControlOutlined />
                    {t("mission.add_mission.edit_detail")}
                  </SolidButton>
                  <GhostButton onClick={() => openMeta(row.id)}>
                    <EditOutlined />
                    {t("mission.add_mission.edit_info")}
                  </GhostButton>
                  <Popconfirm
                    title={t("utils.delete_warn")}
                    okText={t("utils.confirm")}
                    cancelText={t("utils.cancel")}
                    onConfirm={() => deleteMutation.mutate(row.id)}
                  >
                    <DangerButton>
                      <DeleteOutlined />
                      {t("utils.delete")}
                    </DangerButton>
                  </Popconfirm>
                </Toolbar>
              </ItemCard>
            ))}
          </CardList>
        ) : (
          <TableWrap>
            <Table<Mission_Title>
              size="small"
              rowKey="id"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              scroll={{ x: "max-content" }}
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
                showTotal: (total) => `TOTAL ${total}`,
              }}
            />
          </TableWrap>
        )}
      </Section>

      <MissionMetaModal
        open={metaOpen}
        onClose={() => setMetaOpen(false)}
        missionId={metaMissionId}
        existingNames={existingNames}
      />

      <FolderEditorModal
        open={folderEditorOpen}
        onClose={() => setFolderEditorOpen(false)}
      />
    </PanelShell>
  );
};

export default EditMissionPanel;
