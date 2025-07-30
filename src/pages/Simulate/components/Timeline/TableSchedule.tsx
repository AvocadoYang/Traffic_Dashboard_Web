import { useTimelineScheduleSocket } from "@/sockets/useTimelineScheduleSocket";
import {
  Button,
  Card,
  message,
  Modal,
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
  OpenScheduleTable,
  SelectTime,
} from "../../utils/mapStatus";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

const { Text } = Typography;

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%);
  transition: all 0.3s ease;

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
  const setEditTask = useSetAtom(EditTask);
  const setIsEdit = useSetAtom(IsEditSchedule);
  const [messageApi, contextHolder] = message.useMessage();

  const handleCancel = () => {
    setIsOpenScheduleTable(false);
  };

  const handleEdit = (task: Mission_Schedule) => {
    setSelectTime(task.time);
    setIsModalOpen(true);
    setEditTask(task);
    setIsEdit(true);
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

  const handleEnable = (id: string, isEnable: boolean) => {
    editMutation.mutate({ id, isEnable });
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
    },
    {
      title: t("sim.insert_modal.amr"),
      dataIndex: "amrId",
      key: "amrId",
      render: (_: string, record: Mission_Schedule) => (
        <Text style={{ color: "#52c41a" }}>
          {record.timelineMission?.amrId}
        </Text>
      ),
    },
    {
      title: t("sim.insert_modal.priority"),
      dataIndex: "priority",
      key: "priority",
      render: (p: number) => {
        const color = p === 1 ? "red" : p === 2 ? "orange" : "blue";
        return (
          <Tag color={color} style={{ borderRadius: "12px" }}>
            P{p}
          </Tag>
        );
      },
    },
    {
      title: t("sim.insert_modal.type"),
      dataIndex: "type",
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
      title: t("utils.action"),
      key: "actions",
      render: (_: any, record: Mission_Schedule) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="small" onClick={() => handleEdit(record)}>
            {t("utils.edit")}
          </Button>

          <Switch
            checkedChildren="ON"
            unCheckedChildren="OFF"
            onClick={() => handleEnable(record.id, !record.isEnable)}
            checked={record.isEnable}
          />
        </div>
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
        footer={null} // Use null instead of empty array for Ant Design Modal
        width={2400}
        zIndex={9}
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
