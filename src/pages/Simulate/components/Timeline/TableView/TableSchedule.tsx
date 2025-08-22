// components/TableSchedule/index.tsx
import React, { useState } from "react";
import { Card, Divider, Flex, message, Splitter, Tabs, TabsProps } from "antd";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { useAtom, useSetAtom } from "jotai";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useTimelineScheduleSocket } from "@/sockets/useTimelineScheduleSocket";
import {
  EditTask,
  IsEditSchedule,
  OpenEditModal,
  OpenEditShiftCargoModal,
  OpenEditSpawnCargoModal,
  OpenFixedEventMissionEditModal,
  OpenRangeShiftModal,
  OpenRangeSpawnModal,
  OpenScheduleTable,
  SelectTime,
} from "@/pages/Simulate/utils/mapStatus";
import ActionButtons from "./ActionButtons";
import FilterControls from "./FilterControls";
import { StyledModal, StyledCard } from "./type";
import useScheduleData from "./useScheduleData";
import FixedEventTable from "./FixedEventTable";
import RangeEventTable from "./RangeEventTable";

const TableSchedule: React.FC = () => {
  const { t } = useTranslation();
  const scheduleData = useTimelineScheduleSocket();
  const [isOpenScheduleTable, setIsOpenScheduleTable] =
    useAtom(OpenScheduleTable);
  const setSelectTime = useSetAtom(SelectTime);
  const setIsModalOpen = useSetAtom(OpenEditModal);
  const setIsFixMissionModalOpen = useSetAtom(OpenFixedEventMissionEditModal);
  const setIsRangeSpawnModalOpen = useSetAtom(OpenRangeSpawnModal);
  const setIsRangeShiftModalOpen = useSetAtom(OpenRangeShiftModal);
  const setIsShiftCargoModalOpen = useSetAtom(OpenEditShiftCargoModal);
  const setIsSpawnCargoModalOpen = useSetAtom(OpenEditSpawnCargoModal);
  const setEditTask = useSetAtom(EditTask);
  const setIsEdit = useSetAtom(IsEditSchedule);
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const {
    localFixEvent,
    localRangeEvent,
    isFilterMission,
    isFilterSpawnCargo,
    isFilterShiftCargo,
    setIsFilterMission,
    setIsFilterSpawnCargo,
    setIsFilterShiftCargo,
    setTimeRange,
    setSearchText,
  } = useScheduleData(scheduleData || []);

  // Mutations
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

  // Event handlers
  const handleCancel = () => {
    setIsOpenScheduleTable(false);
  };

  const handleEdit = (id: string) => {
    const taskIndex = scheduleData?.findIndex((v) => v.id === id);
    if (taskIndex === undefined || taskIndex === -1 || !scheduleData) return;

    const task = scheduleData[taskIndex];
    setSelectTime(task.time);
    setEditTask(task);
    setIsEdit(true);

    switch (task.type) {
      case "MISSION":
        setIsModalOpen(true);
        break;
      case "SPAWN_CARGO":
        setIsSpawnCargoModalOpen(true);
        break;
      case "SHIFT_CARGO":
        setIsShiftCargoModalOpen(true);
        break;
    }
  };

  const handleEnable = (id: string, isEnable: boolean) => {
    editMutation.mutate({ id, isEnable });
  };

  const removeSchedule = (id: string, time: string) => {
    removeMutation.mutate({ id, time });
  };

  const deleteMulti = () => {
    removeMultiMutation.mutate({ id: selectedRowKeys as string[] });
  };

  const onSelectChange = (newSelectedRowKeys: string[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  // Add handlers
  const directAddFixedSchedule = () => {
    setIsEdit(false);
    setIsFixMissionModalOpen(true);
    setSelectTime("08:00");
  };

  const directAddRangeGroupSpawnSchedule = () => {
    setIsEdit(false);
    setIsRangeSpawnModalOpen(true);
    setSelectTime("08:00");
  };

  const directAddRangeGroupShiftSchedule = () => {
    setIsEdit(false);
    setIsRangeShiftModalOpen(true);
    setSelectTime("08:00");
  };

  const directAddSchedule = () => {
    setIsEdit(false);
    setIsModalOpen(true);
    setSelectTime("08:00");
  };

  const directSpawnCargoSchedule = () => {
    setIsEdit(false);
    setIsSpawnCargoModalOpen(true);
    setSelectTime("08:00");
  };

  const directShiftSchedule = () => {
    setIsEdit(false);
    setIsShiftCargoModalOpen(true);
    setSelectTime("08:00");
  };

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: t("sim.table_schedule.range_time_event"),
      children: (
        <Card title={t("sim.table_schedule.range_time_event")}>
          <RangeEventTable
            rowSelection={rowSelection}
            dataSource={localRangeEvent}
            onRemove={removeSchedule}
            scheduleData={scheduleData || []}
            onEnable={handleEnable}
          />
        </Card>
      ),
    },
    {
      key: "2",
      label: t("sim.table_schedule.fixed_event"),
      children: (
        <Card title={t("sim.table_schedule.fixed_event")}>
          <FixedEventTable
            dataSource={localFixEvent}
            onEdit={handleEdit}
            onEnable={handleEnable}
            onRemove={removeSchedule}
            rowSelection={rowSelection}
            scheduleData={scheduleData || []}
          />
        </Card>
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
        <Flex gap="small" justify="space-between">
          <ActionButtons
            selectedRowKeys={selectedRowKeys}
            onDeleteMulti={deleteMulti}
            onAddFixedSchedule={directAddFixedSchedule}
            onAddRangeGroupSpawnSchedule={directAddRangeGroupSpawnSchedule}
            onAddRangeGroupShiftSchedule={directAddRangeGroupShiftSchedule}
            onAddSchedule={directAddSchedule}
            onAddShiftSchedule={directShiftSchedule}
            onAddSpawnCargoSchedule={directSpawnCargoSchedule}
          />

          <FilterControls
            isFilterMission={isFilterMission}
            isFilterSpawnCargo={isFilterSpawnCargo}
            isFilterShiftCargo={isFilterShiftCargo}
            onFilterMissionChange={setIsFilterMission}
            onFilterSpawnCargoChange={setIsFilterSpawnCargo}
            onFilterShiftCargoChange={setIsFilterShiftCargo}
            onTimeRangeChange={setTimeRange}
            onSearch={setSearchText}
          />
        </Flex>

        <Divider />

        <StyledCard>
          <Tabs defaultActiveKey="1" type="card" items={items} />
        </StyledCard>
      </StyledModal>
    </>
  );
};

export default TableSchedule;
