import { FC } from "react";
import dayjs from "dayjs";
import { Popconfirm, Skeleton, Table, message } from "antd";
import type { TableColumnsType } from "antd";
import {
  DeleteOutlined,
  LoginOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useVersion from "@/api/useVersion";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import GlobalLoading from "@/utils/GlobalLoading";
import useIsNarrow from "../../ui/useIsNarrow";
import {
  PanelShell,
  Section,
  SectionTitle,
  Toolbar,
  SolidButton,
  GhostButton,
  DangerButton,
  TableWrap,
  CardList,
  ItemCard,
  CardTitleRow,
  CardFacts,
} from "../../ui/primitives";

type Backup = {
  createAt: string;
  dbPath: string;
  id: string;
};

const formatDate = (v: string) => dayjs(v).format("YYYY/MM/DD HH:mm:ss");

const BackupPanel: FC = () => {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [messageApi, contextHolder] = message.useMessage();
  const { data, isLoading, isFetching, refetch } = useVersion();

  const rows = (data ?? []).filter(Boolean) as Backup[];

  const backupMutation = useMutation({
    mutationFn: () => client.post("api/setting/backup-now"),
    onSuccess: async () => {
      void messageApi.success(t("utils.success"));
      await refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.post("api/setting/delete-backup", { id }),
    onSuccess: async () => {
      void messageApi.success(t("utils.success"));
      await refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => client.post("api/setting/restore-now", { id }),
    onSuccess: () => void messageApi.success(t("utils.success")),
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const actions = (row: Backup, withText: boolean) => (
    <Toolbar>
      <Popconfirm
        title={t("file.backup_file.restore_warn")}
        okText={t("utils.yes")}
        cancelText={t("utils.no")}
        onConfirm={() => restoreMutation.mutate(row.id)}
      >
        <GhostButton>
          <LoginOutlined />
          {withText && t("file.backup_file.restore")}
        </GhostButton>
      </Popconfirm>
      <Popconfirm
        title={t("utils.are_you_sure")}
        okText={t("utils.yes")}
        cancelText={t("utils.no")}
        onConfirm={() => deleteMutation.mutate(row.id)}
      >
        <DangerButton>
          <DeleteOutlined />
          {withText && t("utils.delete")}
        </DangerButton>
      </Popconfirm>
    </Toolbar>
  );

  const columns: TableColumnsType<Backup> = [
    {
      title: t("file.backup_file.create_at"),
      dataIndex: "createAt",
      key: "createAt",
      width: 200,
      defaultSortOrder: "descend",
      render: (v: string) => formatDate(v),
      sorter: (a, b) =>
        new Date(a.createAt).getTime() - new Date(b.createAt).getTime(),
    },
    {
      title: t("file.backup_file.backup_path"),
      dataIndex: "dbPath",
      key: "dbPath",
    },
    {
      title: "",
      key: "actions",
      width: 110,
      render: (_, row) => actions(row, false),
    },
  ];

  if (restoreMutation.isLoading) return <GlobalLoading />;
  if (isLoading) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}

      <Section>
        <SectionTitle>
          <SaveOutlined />
          {t("file.backup_file.title")}
        </SectionTitle>

        <Toolbar>
          <SolidButton
            onClick={() => backupMutation.mutate()}
            disabled={backupMutation.isLoading}
          >
            <PlusOutlined />
            {t("file.backup_file.backup_now")}
          </SolidButton>
          <GhostButton onClick={() => void refetch()} disabled={isFetching}>
            <ReloadOutlined />
            {t("utils.reload")}
          </GhostButton>
        </Toolbar>

        {isNarrow ? (
          <CardList>
            {rows.map((row) => (
              <ItemCard key={row.id}>
                <CardTitleRow>
                  <span>{formatDate(row.createAt)}</span>
                </CardTitleRow>
                <CardFacts>
                  <dt>{t("file.backup_file.backup_path")}</dt>
                  <dd>{row.dbPath}</dd>
                </CardFacts>
                {actions(row, true)}
              </ItemCard>
            ))}
          </CardList>
        ) : (
          <TableWrap>
            <Table<Backup>
              size="small"
              rowKey="id"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              scroll={{ x: "max-content" }}
              pagination={{
                pageSize: 15,
                showTotal: (total) => t("utils.total", { total }),
              }}
            />
          </TableWrap>
        )}
      </Section>
    </PanelShell>
  );
};

export default BackupPanel;
