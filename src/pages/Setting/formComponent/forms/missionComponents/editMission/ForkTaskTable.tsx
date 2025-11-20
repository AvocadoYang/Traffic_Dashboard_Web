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
  Descriptions,
  Popover,
  Col,
  Row,
  Space,
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
import client from "@/api/axiosClient";
import useTaskFork from "../../../../../../api/useTaskFork";
import ImportMissionForm from "./ImportMissionForm";
import CarControlTranslate from "./CarControlTranslate";
import { Fork_mission_Slice } from "./mission";
import { Err } from "@/utils/responseErr";
import "./style/index.css";

interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  "data-row-key": string;
  children: React.ReactNode;
}

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
                style={{ touchAction: "none", cursor: "move" }}
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

  const NineByNineGrid: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(9, 1fr)",
          gridTemplateRows: "repeat(9, auto)",
          gap: 6,
          width: 240,
        }}
      >
        {children}
      </div>
    );
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
    },
    {
      title: t("mission.task_table.status"),
      dataIndex: "disable",
      width: 100,
      render: (disable: boolean) => (
        <Flex align="center" gap="small">
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: disable ? "#979797" : "#2bea00",
            }}
          />
          {disable
            ? t("mission.task_table.inactive")
            : t("mission.task_table.active")}
        </Flex>
      ),
    },
    {
      title: t("mission.task_table.action"),
      dataIndex: "operation",
      width: 150,
      render: (operation) =>
        operation.type ? <CarControlTranslate word={operation.type} /> : "-",
    },
    {
      title: t("mission.task_table.location"),
      dataIndex: ["operation", "id"],
      width: 120,
      render: (_, record) => {
        return record.operation.locationId;
      },
    },
    {
      title: "",
      key: "actions",
      width: 260,
      render: (_, record) => {
        const prefix1 = {
          operation: {
            ...record.operation,
          },
        };

        const prefix2 = {
          ...record.io,
        };
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gridTemplateRows: "repeat(2, auto)",
              gap: 8,
              width: "100%",
            }}
          >
            {/* Row 1 */}
            <div style={{ textAlign: "center" }}>
              <Popconfirm
                title={t("utils.delete_warn")}
                onConfirm={() => deleteTask(record.id)}
              >
                <Button
                  type="link"
                  danger
                  icon={<DeleteTwoTone twoToneColor="#f30303" />}
                >
                  {t("utils.delete")}
                </Button>
              </Popconfirm>
            </div>

            <div style={{ textAlign: "center" }}>
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => showModal(record.id)}
              >
                {t("utils.edit")}
              </Button>
            </div>

            <div style={{ textAlign: "center" }}>
              <Button
                type="link"
                icon={<ImportOutlined />}
                onClick={() => showImportMissionModal(record.process_order)}
              >
                {t("mission.task_table.import_mission")}
              </Button>
            </div>

            {/* Row 2 */}
            <div style={{ textAlign: "center" }}>
              <Popover
                title={
                  <ReactJsonView
                    displayDataTypes={false}
                    value={prefix1}
                    collapsed={false}
                    enableClipboard={false}
                    style={{ fontSize: 14 }}
                  />
                }
              >
                <Button type="link" icon={<CodeOutlined />}>
                  {t("mission.task_table.task_operation")}
                </Button>
              </Popover>
            </div>

            <div style={{ textAlign: "center" }}>
              <Popover
                title={
                  <ReactJsonView
                    displayDataTypes={false}
                    value={prefix2}
                    collapsed={false}
                    enableClipboard={false}
                    style={{ fontSize: 14 }}
                  />
                }
              >
                <Button type="link" icon={<CodeOutlined />}>
                  {t("mission.task_table.task_fork_movement")}
                </Button>
              </Popover>
            </div>

            <div style={{ textAlign: "center" }}>
              <Tooltip
                title={
                  record.disable
                    ? t("mission.task_table.in_use")
                    : t("mission.task_table.stop_this_process")
                }
              >
                <Button
                  type="link"
                  icon={
                    record.disable ? <EyeInvisibleOutlined /> : <EyeOutlined />
                  }
                  onClick={() => disableTask(record.id, !record.disable)}
                />
              </Tooltip>
            </div>
          </div>
        );
      },
    },
  ];

  const getLocationModeLabel = (isDefineId: string | undefined): string => {
    const locationModeMap: Record<string, string> = {
      custom: t("mission.task_table.custom"),
      auto: t("mission.task_table.select"),
      select: t("mission.task_table.is_selectable"),
      available_charge_station: t(
        "mission.task_table.available_charge_station"
      ),
      prepare_point: t("mission.task_table.prepare_point"),
      back_to_load_place: t("mission.task_table.back_to_load_place_desc"),
    };
    return isDefineId && locationModeMap[isDefineId]
      ? locationModeMap[isDefineId]
      : "-";
  };

  if (!taskDataSource) return null;

  return (
    <>
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
    </>
  );
};

export default ForkTaskTable;
