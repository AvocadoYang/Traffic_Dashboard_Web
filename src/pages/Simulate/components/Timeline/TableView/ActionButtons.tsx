import React from "react";
import { Button, Flex, Tooltip } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

interface ActionButtonsProps {
  selectedRowKeys: React.Key[];
  onDeleteMulti: () => void;
  onAddFixedSchedule: () => void;
  onAddRangeGroupSpawnSchedule: () => void;
  onAddRangeGroupShiftSchedule: () => void;
  onAddSchedule: () => void;
  onAddShiftSchedule: () => void;
  onAddSpawnCargoSchedule: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  selectedRowKeys,
  onDeleteMulti,
  onAddFixedSchedule,
  onAddRangeGroupSpawnSchedule,
  onAddRangeGroupShiftSchedule,
  onAddSchedule,
  onAddShiftSchedule,
  onAddSpawnCargoSchedule,
}) => {
  const { t } = useTranslation();

  return (
    <Flex gap="middle">
      <Button
        onClick={onDeleteMulti}
        disabled={selectedRowKeys.length === 0}
        danger
      >
        {t("utils.delete")}
      </Button>
      <Flex vertical gap="middle">
        <Flex gap="middle">
          <Tooltip title="add mission fix event">
            <Button onClick={onAddFixedSchedule}>
              <PlusOutlined />
              {t("sim.table_schedule.add_range_event")}
            </Button>
          </Tooltip>

          <Tooltip title="add spawn event">
            <Button onClick={onAddRangeGroupSpawnSchedule}>
              <PlusOutlined />
              {t("sim.spawn_cargo_group.add")}
            </Button>
          </Tooltip>

          <Tooltip title="add shift cargo event">
            <Button onClick={onAddRangeGroupShiftSchedule}>
              <PlusOutlined />
              {t("sim.shift_cargo_group.add")}
            </Button>
          </Tooltip>
        </Flex>

        <Flex gap="middle">
          <Tooltip title="add mission event">
            <Button onClick={onAddSchedule}>
              <PlusOutlined />
              {t("sim.timeline.add_mission")}
            </Button>
          </Tooltip>

          <Tooltip title="add shift cargo event">
            <Button onClick={onAddShiftSchedule}>
              <PlusOutlined />
              {t("sim.timeline.add_shift_cargo")}
            </Button>
          </Tooltip>

          <Tooltip title="add spawn cargo event">
            <Button onClick={onAddSpawnCargoSchedule}>
              <PlusOutlined />
              {t("sim.timeline.add_spawn_cargo")}
            </Button>
          </Tooltip>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default ActionButtons;
