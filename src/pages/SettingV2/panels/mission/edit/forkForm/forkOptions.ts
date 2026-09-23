import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import useMap from "@/api/useMap";
import {
  actonList,
  levelOption,
  selectLocationOption,
} from "@/pages/Setting/formComponent/forms/missionComponents/editMission/forkEditMissionSlice/params";
import {
  Action_Type,
  Select_Location_Type,
} from "@/pages/Setting/formComponent/forms/missionComponents/editMission/forkEditMissionSlice/types";

/** 後端存的是 0/1/2,不是字串 */
export enum YawGenre {
  CUSTOM,
  SELECT,
  CALCULATE_BY_AGV_AND_SHELF_ANGLE,
}

/** actonList 前四個是日常會用的,後面是特別動作 */
const NORMAL_COUNT = 4;

/**
 * Fork 步驟編輯器用到的下拉選項。
 * v1 的 useTaskOptions 還回傳了一組 robotOption / SelectForkHeightOptions /
 * SelectActiveWaitRobotOptions / SelectWaitRobotOptions,但 TaskFormFork
 * 一個都沒用到(robotOption 裡的模擬車標籤還是永遠算不出來的死碼),
 * 所以這裡只留真正會用到的。
 */
const useForkOptions = (action: Action_Type) => {
  const { t } = useTranslation();
  const { data: mapData } = useMap();

  const actionLabel = (type: Action_Type): string => {
    switch (type) {
      case "move":
        return t("car_control_translate.move");
      case "load":
        return t("car_control_translate.load");
      case "offload":
        return t("car_control_translate.offload");
      case "spin":
        return t("car_control_translate.S");
      case "fork":
        return t("car_control_translate.fork");
      case "charge":
        return t("car_control_translate.charge");
      case "cargo_limit":
        return t("car_control_translate.cargo_limit");
      case "verity_cargo":
        return t("car_control_translate.verity_cargo");
      case "peripheral_action":
        return t("car_control_translate.peripheral_action");
      default:
        return type;
    }
  };

  const locationOptions = useMemo(
    () =>
      (mapData?.locations ?? []).map((v) => ({
        label: v.locationId,
        value: v.locationId,
      })),
    [mapData],
  );

  const normalActions = useMemo(
    () =>
      actonList.slice(0, NORMAL_COUNT).map((type) => ({
        label: actionLabel(type),
        value: type,
      })),
    [t],
  );

  const specialActions = useMemo(
    () =>
      actonList.slice(NORMAL_COUNT).map((type) => ({
        label: actionLabel(type),
        value: type,
      })),
    [t],
  );

  /** 充電站與預派點只在「移動」時才有意義 */
  const locationTypeOptions = useMemo(
    () =>
      selectLocationOption
        .filter(
          (type) =>
            action === "move" ||
            (type !== "available_charge_station" && type !== "prepare_point"),
        )
        .map((type) => {
          switch (type) {
            case "custom":
              return { label: t("mission.task_table.location_custom"), value: type };
            case "select":
              return { label: t("mission.task_table.location_select"), value: type };
            case "available_charge_station":
              return {
                label: t("mission.task_table.location_charge_station"),
                value: type,
              };
            case "prepare_point":
              return { label: t("mission.task_table.prepare_point"), value: type };
            case "back_to_load_place":
              return {
                label: t("mission.task_table.back_to_load_place"),
                value: type,
              };
            default:
              return { label: type, value: type };
          }
        }) as { label: string; value: Select_Location_Type }[],
    [action, t],
  );

  const levelTypeOptions = useMemo(
    () =>
      levelOption.map((type) => ({
        label:
          type === "custom"
            ? t("mission.task_table.custom_level")
            : t("mission.task_table.level_select"),
        value: type,
      })),
    [t],
  );

  const yawTypeOptions = useMemo(
    () => [
      { label: t("mission.task_table.yaw_custom"), value: YawGenre.CUSTOM },
      { label: t("mission.task_table.yaw_select"), value: YawGenre.SELECT },
      {
        label: t("mission.task_table.yaw_calculate"),
        value: YawGenre.CALCULATE_BY_AGV_AND_SHELF_ANGLE,
      },
    ],
    [t],
  );

  return {
    locationOptions,
    normalActions,
    specialActions,
    locationTypeOptions,
    levelTypeOptions,
    yawTypeOptions,
  };
};

export default useForkOptions;
