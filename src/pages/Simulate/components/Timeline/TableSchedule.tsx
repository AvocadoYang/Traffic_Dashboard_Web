import { useTimelineScheduleSocket } from "@/sockets/useTimelineScheduleSocket";
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Flex,
  Input,
  message,
  Modal,
  Popconfirm,
  Switch,
  Table,
  Tag,
  TimePicker,
  Typography,
} from "antd";
import React, { FC, useEffect, useState } from "react";
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
import dayjs, { Dayjs } from "dayjs";
const { RangePicker } = TimePicker;
const { Text } = Typography;

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%);
  transition: all 0.3s ease;
  min-height: 65vh;
  max-height: 65vh;
  overflow-y: scroll;

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

type Local_Table_Value = {
  id: string;
  time: string;
  type: string;
  detail: string;
};

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
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isFilterMission, setIsFilterMission] = useState(true);
  const [isFilterSpawnCargo, setIsFilterSpawnCargo] = useState(true);
  const [isFilterShiftCargo, setIsFilterShiftCargo] = useState(true);
  const [timeRange, setTimeRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [localTableValue, setLocalTableValue] = useState<Local_Table_Value[]>();
  const handleCancel = () => {
    setIsOpenScheduleTable(false);
  };

  const handleEdit = (id: string) => {
    const taskIndex = scheduleData.findIndex((v) => v.id === id);

    setSelectTime(scheduleData[taskIndex].time);
    setEditTask(scheduleData[taskIndex]);
    setIsEdit(true);
    console.log(scheduleData[taskIndex], "at table");
    if (scheduleData[taskIndex].type === "MISSION") {
      setIsModalOpen(true);
      return;
    }

    if (scheduleData[taskIndex].type === "SPAWN_CARGO") {
      setIsSpawnCargoModalOpen(true);
      return;
    }

    if (scheduleData[taskIndex].type === "SHIFT_CARGO") {
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

  const removeMultiMutation = useMutation({
    mutationFn: (payload: { id: string[] }) => {
      return client.post("api/simulate/remove-multi-timeline-mission", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      setSelectedRowKeys([]);
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
          return `${task.timelineMission.amrId} | ${dynamicMissions}`;
        case "NOTIFY":
          return `${task.timelineMission.amrId} | ${task.timelineMission.notifyMissionSourcePointName || ""}`;
        case "NORMAL":
          return `${task.timelineMission.amrId} | ${task.timelineMission.normalMissionName || ""}`;
      }
    }

    if (task.type === "SPAWN_CARGO") {
      const text = `spawn at ${task.timelineSpawnCargo?.peripheralType} ${task.timelineSpawnCargo?.peripheralName}`;
      return text;
    }

    if (task.type === "SHIFT_CARGO") {
      const text = `shift to ${task.timelineShiftCargo?.peripheralType} ${task.timelineShiftCargo?.shiftPeripheralName}`;
      return text;
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
      defaultSortOrder: "ascend", // ✅ set default ascending order
    },
    {
      title: t("sim.insert_modal.type"),
      dataIndex: "type",
      sorter: (a: Mission_Schedule, b: Mission_Schedule) =>
        a.type.localeCompare(b.type),
      key: "type",
      render: (type: string) => {
        let label = type;
        let tagColor = "default";
        switch (type) {
          case "MISSION":
            label = t("sim.insert_modal.mission");
            tagColor = "blue";
            break;
          case "SPAWN_CARGO":
            label = t("sim.insert_modal.spawn_cargo");
            tagColor = "green";
            break;
          case "SHIFT_CARGO":
            label = t("sim.insert_modal.shift_cargo");
            break;
        }
        return (
          <Tag color={tagColor} style={{ borderRadius: "12px" }}>
            {label}
          </Tag>
        );
      },
    },
    {
      title: t("sim.table_schedule.detail"),
      dataIndex: "detail",
      sorter: (a: Mission_Schedule, b: Mission_Schedule) =>
        a.type.localeCompare(b.type),
      key: "detail",
    },
    {
      title: t("utils.action"),
      key: "actions",
      render: (_: any, record: Mission_Schedule) => (
        <Flex gap="middle">
          <Button size="small" onClick={() => handleEdit(record.id)}>
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

  const deleteMulti = () => {
    removeMultiMutation.mutate({ id: selectedRowKeys as string[] });
  };

  const onSelectChange = (newSelectedRowKeys: string[]) => {
    console.log("selectedRowKeys changed: ", newSelectedRowKeys);
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const handleSearch = (searchText: string) => {
    if (!scheduleData) return;

    if (searchText.trim() === "") {
      setLocalTableValue(
        scheduleData.map((v) => ({
          id: v.id,
          time: v.time,
          type: v.type,
          detail: detail(v),
        })),
      );
      return;
    }

    const filtered = scheduleData
      .map((v) => ({
        id: v.id,
        time: v.time,
        type: v.type,
        detail: detail(v),
      }))
      .filter(
        (v) =>
          v.time.includes(searchText) ||
          v.type.includes(searchText) ||
          v.detail.includes(searchText),
      );

    setLocalTableValue(filtered);
  };

  useEffect(() => {
    if (!scheduleData) return;

    let filtered = scheduleData.map((v) => ({
      id: v.id,
      time: v.time, // e.g. "14:35"
      type: v.type,
      detail: detail(v),
    }));

    filtered = filtered.filter((v) => {
      if (v.type === "MISSION" && !isFilterMission) return false;
      if (v.type === "SPAWN_CARGO" && !isFilterSpawnCargo) return false;
      if (v.type === "SHIFT_CARGO" && !isFilterShiftCargo) return false;
      return true;
    });

    if (timeRange && timeRange[0] && timeRange[1]) {
      filtered = filtered.filter((v) => {
        const t = dayjs(v.time, "HH:mm");
        return t.isAfter(timeRange[0]) && t.isBefore(timeRange[1]);
      });
    }

    setLocalTableValue(filtered);
  }, [
    scheduleData,
    isFilterMission,
    isFilterSpawnCargo,
    isFilterShiftCargo,
    timeRange,
  ]);

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
        <Flex gap="small" justify="space-between">
          <Button
            onClick={deleteMulti}
            disabled={selectedRowKeys.length === 0}
            danger
          >
            {t("utils.delete")}
          </Button>

          <Flex gap="middle">
            <RangePicker
              format="HH:mm"
              onChange={(values) => setTimeRange(values)}
            />

            <Flex gap="middle" align="center">
              <Checkbox
                checked={isFilterMission}
                onChange={(e) => setIsFilterMission(e.target.checked)}
              >
                {t("sim.table_schedule.mission")}
              </Checkbox>

              <Checkbox
                checked={isFilterSpawnCargo}
                onChange={(e) => setIsFilterSpawnCargo(e.target.checked)}
              >
                {t("sim.table_schedule.spawn_cargo")}
              </Checkbox>

              <Checkbox
                checked={isFilterShiftCargo}
                onChange={(e) => setIsFilterShiftCargo(e.target.checked)}
              >
                {t("sim.table_schedule.shift_cargo")}
              </Checkbox>
            </Flex>

            <Input
              placeholder={t("sim.table_schedule.detail_search")}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          </Flex>
        </Flex>

        <Divider />

        <StyledCard>
          <StyledTable
            rowSelection={{ type: "checkbox", ...rowSelection }}
            columns={columns as []}
            dataSource={localTableValue}
            rowKey={(record: any) =>
              record.id ?? `${record.time}-${record.detail}`
            }
            scroll={{ x: 1000 }}
            pagination={false}
          />
        </StyledCard>
      </StyledModal>
    </>
  );
};

export default TableSchedule;
