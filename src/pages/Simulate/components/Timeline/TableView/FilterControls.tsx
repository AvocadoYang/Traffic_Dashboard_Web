import React from "react";
import { Checkbox, Flex, Input, TimePicker } from "antd";
import { useTranslation } from "react-i18next";
import { Dayjs } from "dayjs";

const { RangePicker } = TimePicker;

interface FilterControlsProps {
  isFilterMission: boolean;
  isFilterSpawnCargo: boolean;
  isFilterShiftCargo: boolean;
  onFilterMissionChange: (checked: boolean) => void;
  onFilterSpawnCargoChange: (checked: boolean) => void;
  onFilterShiftCargoChange: (checked: boolean) => void;
  onTimeRangeChange: (values: [Dayjs | null, Dayjs | null] | null) => void;
  onSearch: (searchText: string) => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  isFilterMission,
  isFilterSpawnCargo,
  isFilterShiftCargo,
  onFilterMissionChange,
  onFilterSpawnCargoChange,
  onFilterShiftCargoChange,
  onTimeRangeChange,
  onSearch,
}) => {
  const { t } = useTranslation();

  return (
    <Flex gap="middle" justify="flex-start" align="center">
      <RangePicker
        needConfirm={false}
        format="HH:mm"
        onChange={onTimeRangeChange}
      />

      <Flex gap="middle" align="flex-start" justify="start">
        <Checkbox
          checked={isFilterMission}
          onChange={(e) => onFilterMissionChange(e.target.checked)}
        >
          {t("sim.table_schedule.mission")}
        </Checkbox>

        <Checkbox
          checked={isFilterSpawnCargo}
          onChange={(e) => onFilterSpawnCargoChange(e.target.checked)}
        >
          {t("sim.table_schedule.spawn_cargo")}
        </Checkbox>

        <Checkbox
          checked={isFilterShiftCargo}
          onChange={(e) => onFilterShiftCargoChange(e.target.checked)}
        >
          {t("sim.table_schedule.shift_cargo")}
        </Checkbox>
      </Flex>

      <Input
        placeholder={t("sim.table_schedule.detail_search")}
        onChange={(e) => onSearch(e.target.value)}
        style={{ width: 300 }}
        allowClear
      />
    </Flex>
  );
};

export default FilterControls;
