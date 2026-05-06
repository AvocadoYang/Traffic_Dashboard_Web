import React, { FC, useState } from "react";
import {
  CodeOutlined,
  DeleteTwoTone,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  ImportOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import ReactJsonView from "@uiw/react-json-view";
import {
  Button,
  Flex,
  Popconfirm,
  Table,
  Tooltip,
  message,
  Popover,
} from "antd";
import { ColumnsType } from "antd/es/table";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import client from "@/api/axiosClient";
import useTaskFork from "../../../../../../api/useTaskFork";
import ImportMissionForm from "./ImportMissionForm";
import CarControlTranslate from "./CarControlTranslate";
import { Fork_mission_Slice } from "./mission";
import { Err } from "@/utils/responseErr";

interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  "data-row-key": string;
  children: React.ReactNode;
}

// Industrial Styled Components
const IndustrialTableContainer = styled.div`
  font-family: "Roboto Mono", monospace;
  width: 100%;

  .ant-table {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .ant-table-thead > tr > th {
    background: #fafafa;
    color: #262626;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 1px;
    border-bottom: 2px solid #d9d9d9;
    font-family: "Roboto Mono", monospace;
  }

  .ant-table-tbody > tr {
    background: #ffffff;
    transition: all 0.2s ease;

    &:hover {
      background: #f0f5ff !important;
      box-shadow: 0 2px 4px rgba(24, 144, 255, 0.1);
    }
  }

  .ant-table-tbody > tr > td {
    border-bottom: 1px solid #f0f0f0;
    font-family: "Roboto Mono", monospace;
    font-size: 12px;
    color: #595959;
  }

  .ant-pagination {
    font-family: "Roboto Mono", monospace;
  }
`;

const StatusIndicator = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
  color: ${({ active }) => (active ? "#52c41a" : "#8c8c8c")};

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ active }) => (active ? "#52c41a" : "#8c8c8c")};
    box-shadow: ${({ active }) =>
      active ? "0 0 8px rgba(82, 196, 26, 0.6)" : "none"};
  }
`;

const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, auto);
  gap: 8px;
  width: 100%;
`;

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.5px;
  height: 28px;
  padding: 0 12px;

  &.ant-btn-link {
    color: #1890ff;

    &:hover {
      color: #40a9ff;
    }
  }

  &.ant-btn-link.ant-btn-dangerous {
    color: #ff4d4f;

    &:hover {
      color: #ff7875;
    }
  }
`;

const LocationBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background: #e6f7ff;
  border: 1px solid #1890ff;
  border-radius: 4px;
  color: #1890ff;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 600;
`;

const ActionTypeBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  background: #fff7e6;
  border: 1px solid #ffa940;
  border-radius: 4px;
  color: #fa8c16;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const DataRow = ({ children, ...props }: RowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props["data-row-key"] });

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(
      transform && { ...transform, scaleY: 1 }
    )?.replace(/translate3d\(([^,]+),/, "translate3d(0,"),
    transition,
    ...(isDragging ? { position: "relative", zIndex: 9999 } : {}),
  };

  return (
    <tr {...props} ref={setNodeRef} style={style} {...attributes}>
      {React.Children.map(children, (child) => {
        if ((child as React.ReactElement).key === "sort") {
          return React.cloneElement(child as React.ReactElement, {
            children: (
              <MenuOutlined
                ref={setActivatorNodeRef}
                style={{ touchAction: "none", cursor: "move", color: "#8c8c8c" }}
                {...listeners}
              />
            ),
          });
        }
        return child;
      })}
    </tr>
  );
};

const ForkTaskTable: FC<{
  showModal: (key: string) => void;
  selectedMissionKey: string;
  selectedMissionCar: string;
}> = ({ showModal, selectedMissionKey, selectedMissionCar }) => {
  const { data: taskDataSource } = useTaskFork(selectedMissionKey);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [importConfig, setImportConfig] = useState<{
    order: number;
    key: string;
  } | null>(null);
  const [showImportMission, setShowImportMission] = useState(false);

  const sortTaskMutation = useMutation({
    mutationFn: (data: {
      keyAndSort: { key: string; order: number }[];
      missionTitleId: string;
    }) => client.post("api/setting/update-task-order", data),
    onSuccess: () =>
      queryClient.refetchQueries({
        queryKey: ["all-relate-task-fork", selectedMissionKey],
      }),
    onError: (error: Err) => messageApi.error(error.response.data.message),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (payload: {
      key: string;
      keyAndOrder: { key: string; order: number }[];
    }) =>
      client.post("api/setting/delete-task", {
        missionTitleId: selectedMissionKey,
        targetKey: payload.key,
        newOrder: payload.keyAndOrder,
      }),
    onSuccess: () =>
      queryClient.refetchQueries({ queryKey: ["all-relate-task-fork"] }),
    onError: (error: Err) => messageApi.error(error.response.data.message),
  });

  const disableMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      disable: boolean;
      missionTitleId: string;
    }) => client.post("api/setting/disable-task", payload),
    onSuccess: async () => {
      messageApi.success(t("utils.success"));
      await queryClient.refetchQueries({ queryKey: ["all-relate-task-fork"] });
    },
    onError: (error: Err) => messageApi.error(error.response.data.message),
  });

  const deleteTask = (key: string) => {
    if (!taskDataSource) return;
    const updatedDataSource = taskDataSource.filter((v) => v?.id !== key);
    const keyAndOrder = updatedDataSource.map((v, i) => ({
      key: v?.id as string,
      order: i,
    }));
    deleteTaskMutation.mutate({ key, keyAndOrder });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!taskDataSource || active.id === over?.id) return;
    const activeIndex = taskDataSource.findIndex((i) => i?.id === active.id);
    const overIndex = taskDataSource.findIndex((i) => i?.id === over?.id);
    const newData = arrayMove(taskDataSource, activeIndex, overIndex);
    const keyAndSort = newData.map((v, i) => ({
      key: v?.id as string,
      order: i,
    }));
    sortTaskMutation.mutate({
      keyAndSort,
      missionTitleId: selectedMissionKey,
    });
    queryClient.setQueryData(
      ["all-relate-task-fork", selectedMissionKey],
      newData
    );
  };

  const disableTask = (id: string, disable: boolean) =>
    disableMutation.mutate({ id, disable, missionTitleId: selectedMissionKey });

  const showImportMissionModal = (order: number) => {
    setShowImportMission(true);
    setImportConfig({ key: selectedMissionKey, order: order + 1 });
  };

  const columns: ColumnsType<Fork_mission_Slice> = [
    {
      title: "",
      key: "sort",
      width: 50,
      render: () => <MenuOutlined style={{ cursor: "move" }} />,
    },
    {
      title: t("mission.task_table.sort"),
      dataIndex: "process_order",
      width: 80,
      render: (order: number) => (
        <span style={{ fontWeight: 600, color: "#262626" }}>#{order}</span>
      ),
    },
    {
      title: t("mission.task_table.status"),
      dataIndex: "disable",
      width: 120,
      render: (disable: boolean) => (
        <StatusIndicator active={!disable}>
          {disable
            ? t("mission.task_table.inactive")
            : t("mission.task_table.active")}
        </StatusIndicator>
      ),
    },
    {
      title: t("mission.task_table.action"),
      dataIndex: "operation",
      width: 150,
      render: (operation) =>
        operation.type ? (
          <ActionTypeBadge>
            <CarControlTranslate word={operation.type} />
          </ActionTypeBadge>
        ) : (
          "-"
        ),
    },
    {
      title: t("mission.task_table.location"),
      dataIndex: ["operation", "id"],
      width: 120,
      render: (_, record) =>
        record.operation.locationId ? (
          <LocationBadge>{record.operation.locationId}</LocationBadge>
        ) : (
          <span style={{ color: "#8c8c8c" }}>-</span>
        ),
    },
    {
      title: "ACTIONS",
      key: "actions",
      width: 280,
      render: (_, record) => {
        const prefix1 = { operation: { ...record.operation } };
        const prefix2 = { ...record.io };
        
        return (
          <ActionGrid>
            {/* Row 1 */}
            <Popconfirm
              title={t("utils.delete_warn")}
              onConfirm={() => deleteTask(record.id)}
            >
              <IndustrialButton
                type="link"
                danger
                icon={<DeleteTwoTone twoToneColor="#ff4d4f" />}
                size="small"
              >
                {t("utils.delete")}
              </IndustrialButton>
            </Popconfirm>

            <IndustrialButton
              type="link"
              icon={<EditOutlined />}
              onClick={() => showModal(record.id)}
              size="small"
            >
              {t("utils.edit")}
            </IndustrialButton>

            <IndustrialButton
              type="link"
              icon={<ImportOutlined />}
              onClick={() => showImportMissionModal(record.process_order)}
              size="small"
            >
              IMPORT
            </IndustrialButton>

            {/* Row 2 */}
            <Popover
              title={
                <ReactJsonView
                  displayDataTypes={false}
                  value={prefix1}
                  collapsed={false}
                  enableClipboard={false}
                  style={{ fontSize: 12 }}
                />
              }
            >
              <IndustrialButton type="link" icon={<CodeOutlined />} size="small">
                OPERATION
              </IndustrialButton>
            </Popover>

            <Popover
              title={
                <ReactJsonView
                  displayDataTypes={false}
                  value={prefix2}
                  collapsed={false}
                  enableClipboard={false}
                  style={{ fontSize: 12 }}
                />
              }
            >
              <IndustrialButton type="link" icon={<CodeOutlined />} size="small">
                MOVEMENT
              </IndustrialButton>
            </Popover>

            <Tooltip
              title={
                record.disable
                  ? t("mission.task_table.in_use")
                  : t("mission.task_table.stop_this_process")
              }
            >
              <IndustrialButton
                type="link"
                icon={
                  record.disable ? <EyeInvisibleOutlined /> : <EyeOutlined />
                }
                onClick={() => disableTask(record.id, !record.disable)}
                size="small"
              >
                {record.disable ? "ENABLE" : "DISABLE"}
              </IndustrialButton>
            </Tooltip>
          </ActionGrid>
        );
      },
    },
  ];

  if (!taskDataSource) return null;

  return (
    <IndustrialTableContainer>
      {contextHolder}
      <DndContext onDragEnd={onDragEnd}>
        <SortableContext
          items={taskDataSource.map((i) => i?.id || "")}
          strategy={verticalListSortingStrategy}
        >
          <Table
            components={{ body: { row: DataRow } }}
            rowKey="id"
            columns={columns}
            dataSource={taskDataSource as []}
            bordered
            pagination={{ pageSize: 50 }}
          />
        </SortableContext>
      </DndContext>
      <ImportMissionForm
        showImportMission={showImportMission}
        setShowImportMission={setShowImportMission}
        importConfig={importConfig}
        selectedMissionCar={selectedMissionCar}
      />
    </IndustrialTableContainer>
  );
};

export default ForkTaskTable;