import { useTimelineScheduleSocket } from "@/sockets/useTimelineScheduleSocket";
import {
  Button,
  Card,
  Flex,
  message,
  Modal,
  Popconfirm,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import React, { FC } from "react";
import { Mission_Schedule } from "@/sockets/useTimelineScheduleSocket";
import { useAtom, useSetAtom } from "jotai";
import {
  EditTask,
  IsEditSchedule,
  OpenEditModal,
  OpenEditShiftCargoModal,
  OpenEditSpawnCargoModal,
  OpenScheduleTable,
  SelectTime,
} from "../../utils/mapStatus";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import dayjs from "dayjs";

const { Text } = Typography;

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%);
  transition: all 0.3s ease;
  min-height: 70vh;

  .ant-card-head {
    background: #f0f2f5;
    border-bottom: 1px solid #e8e8e8;
    border-radius: 12px 12px 0 0;
    padding: 12px 24px;
    font-size: 16px;
    font-weight: 500;
    color: #1890ff;
  }

  .ant-card-body {
    padding: 16px 24px;
  }

  &:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  }
`;

const StyledModal = styled(Modal)`
  .ant-modal-content {
    border-radius: 12px;
    overflow: hidden;
  }

  .ant-modal-header {
    background: #1890ff;
    border-bottom: 1px solid #d9d9d9;
    border-radius: 12px 12px 0 0;
    padding: 16px 24px;
  }

  .ant-modal-title {
    color: #fff;
    font-size: 18px;
    font-weight: 500;
  }

  .ant-modal-body {
    padding: 24px;
  }

  .ant-modal-close-x {
    color: #fff;
    &:hover {
      color: #fff;
      opacity: 0.8;
    }
  }
`;

const StyledTable = styled(Table)`
  .ant-table-thead > tr > th {
    background: #f0f2f5;
    font-weight: 500;
    color: #333;
    border-bottom: 2px solid #e8e8e8;
  }

  .ant-table-tbody > tr:hover > td {
    background: #fafafa;
  }

  .ant-table-cell {
    padding: 12px;
    font-size: 14px;
  }
`;

const TableSchedule: FC = () => {
  const { t } = useTranslation();
  const scheduleData = useTimelineScheduleSocket();
  const [isOpenScheduleTable, setIsOpenScheduleTable] =
    useAtom(OpenScheduleTable);
  const setSelectTime = useSetAtom(SelectTime);
  const setIsModalOpen = useSetAtom(OpenEditModal);
  const setIsShiftCargoModalOpen = useSetAtom(OpenEditShiftCargoModal); // 編輯任務或是新增任務的
  const setIsSpawnCargoModalOpen = useSetAtom(OpenEditSpawnCargoModal); // 編輯任務或是新增任務的
  const setEditTask = useSetAtom(EditTask);
  const setIsEdit = useSetAtom(IsEditSchedule);
  const [messageApi, contextHolder] = message.useMessage();

  const handleCancel = () => {
    setIsOpenScheduleTable(false);
  };

  const handleEdit = (task: Mission_Schedule) => {
    setSelectTime(task.time);
    setIsEdit(true);
    setEditTask(task);
    if (task.type === "MISSION") {
      setIsModalOpen(true);
      return;
    }

    if (task.type === "SPAWN_CARGO") {
      setIsSpawnCargoModalOpen(true);
      return;
    }

    if (task.type === "SHIFT_CARGO") {
      setIsShiftCargoModalOpen(true);
      return;
    }
  };

  const editMutation = useMutation({
    mutationFn: (payload: { id: string; isEnable: boolean }) => {
      return client.post("api/simulate/enable-timeline-mission", payload);
    },
    onSuccess: () => {
      void messageApi.success("success");
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const removeMutation = useMutation({
    mutationFn: (payload: { id: string; time: string }) => {
      return client.post("api/simulate/remove-timeline-mission", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const removeSchedule = (id: string, time: string) => {
    removeMutation.mutate({ id, time });
  };

  const handleEnable = (id: string, isEnable: boolean) => {
    editMutation.mutate({ id, isEnable });
  };

  const detail = (task: Mission_Schedule) => {
    if (task.type === "MISSION") {
      switch (task.timelineMission?.type) {
        case "DYNAMIC":
          const dynamicMissions =
            task.timelineMission.dynamicMission
              ?.map((e) => `${e.loadFrom} -> ${e.offloadTo}`)
              .join(", ") || "";
          return dynamicMissions.length > 20
            ? `${dynamicMissions.slice(0, 20)}...`
            : dynamicMissions;
        case "NOTIFY":
          return task.timelineMission.notifyMissionSourcePointName || "";
        case "NORMAL":
          return task.timelineMission.normalMissionName || "";
      }
    }

    if (task.type === "SPAWN_CARGO") {
      const text = `spawn at ${task.timelineSpawnCargo?.peripheralType} ${task.timelineSpawnCargo?.peripheralName}`;
      return text.length > 20 ? `${text.slice(0, 20)}...` : text;
    }

    if (task.type === "SHIFT_CARGO") {
      const text = `shift to ${task.timelineShiftCargo?.peripheralType} ${task.timelineShiftCargo?.shiftPeripheralName}`;
      return text.length > 20 ? `${text.slice(0, 20)}...` : text;
    }
    return "";
  };

  const columns = [
    {
      title: t("sim.insert_modal.time"),
      dataIndex: "time",
      key: "time",
      render: (time: string) => (
        <Text code style={{ color: "#1890ff" }}>
          {time}
        </Text>
      ),
      sorter: (a: Mission_Schedule, b: Mission_Schedule) =>
        dayjs(a.time, "HH:mm").unix() - dayjs(b.time, "HH:mm").unix(),
    },
    {
      title: t("sim.insert_modal.type"),
      dataIndex: "type",
      sorter: (a: Mission_Schedule, b: Mission_Schedule) =>
        a.type.localeCompare(b.type),
      key: "type",
      render: (type: string) => {
        let label = type;
        switch (type) {
          case "NORMAL":
            label = t("sim.insert_modal.type_normal");
            break;
          case "DYNAMIC":
            label = t("sim.insert_modal.type_dynamic");
            break;
          case "NOTIFY":
            label = t("sim.insert_modal.type_notify");
            break;
        }
        return (
          <Tag color="geekblue" style={{ borderRadius: "12px" }}>
            {label}
          </Tag>
        );
      },
    },
    {
      title: t("sim.table_schedule.detail"),
      dataIndex: "type",
      sorter: (a: Mission_Schedule, b: Mission_Schedule) =>
        a.type.localeCompare(b.type),
      key: "type",
      render: (_: unknown, record: Mission_Schedule) => {
        return detail(record);
      },
    },
    {
      title: t("utils.action"),
      key: "actions",
      render: (_: any, record: Mission_Schedule) => (
        <Flex gap="middle">
          <Button size="small" onClick={() => handleEdit(record)}>
            {t("utils.edit")}
          </Button>

          <Switch
            checkedChildren="ON"
            unCheckedChildren="OFF"
            onClick={() => handleEnable(record.id, !record.isEnable)}
            checked={record.isEnable}
          />

          <Popconfirm
            title="are you sure?"
            onConfirm={() => removeSchedule(record.id, record.time)}
          >
            <Button size="small" danger>
              {t("utils.delete")}
            </Button>
          </Popconfirm>
        </Flex>
      ),
    },
  ];

  if (!isOpenScheduleTable) return null;

  return (
    <>
      {contextHolder}
      <StyledModal
        open={isOpenScheduleTable}
        onCancel={handleCancel}
        footer={null}
        width={2400}
        zIndex={9}
        title={t("sim.table_schedule.title")}
      >
        <StyledCard>
          <StyledTable
            columns={columns as []}
            dataSource={scheduleData}
            rowKey="id"
            pagination={false}
            scroll={{ x: 1000 }}
          />
        </StyledCard>
      </StyledModal>
    </>
  );
};

export default TableSchedule;
