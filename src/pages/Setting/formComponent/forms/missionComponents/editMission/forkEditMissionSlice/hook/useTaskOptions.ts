import {
  activeWaitRobot,
  actonList,
  forkHeightOption,
  selectLocationOption,
  waitRobotOption,
} from "../params";
import {
  Action_Type,
  Select_Active_Robot_Type,
  Select_Fork_Height_Type,
  Select_Location_Type,
  Select_Robot_Wait_Type,
} from "../types";
import useMap from "@/api/useMap";
import useName from "@/api/useAmrName";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

enum YawGenre {
  CUSTOM,
  SELECT,
  CALCULATE_BY_AGV_AND_SHELF_ANGLE,
}

const useTaskOptions = (action: Action_Type) => {
  const { data: mapData } = useMap();
  const { data: robots } = useName();
  const { t } = useTranslation();

  const actionTranslate = (type: Action_Type) => {
    let text = "";
    switch (type) {
      case "move":
        text = t("car_control_translate.move");
        break;
      case "load":
        text = t("car_control_translate.load");
        break;
      case "offload":
        text = t("car_control_translate.offload");
        break;
      case "spin":
        text = t("car_control_translate.S");
        break;
      case "fork":
        text = t("car_control_translate.fork");
        break;
      case "charge":
        text = t("car_control_translate.charge");
        break;
      case "cargo_limit":
        text = t("car_control_translate.cargo_limit");
        break;
      // case "load_from_other":
      //   text = t("car_control_translate.load_from_other");
      //   break;
      // case "offload_from_other":
      //   text = t("car_control_translate.offload_from_other");
      //   break;
      case "verity_cargo":
        text = t("car_control_translate.verity_cargo");
        break;
      default:
        text;
    }
    return text;
  };

  const robotOption: { value: null | string; label: string }[] | undefined =
    useMemo(() => {
      if (!robots) return;
      return robots.amrs
        .filter((a) => a.isReal === true)
        .map((m) => ({
          label: `${m.amrId} ${m.isReal ? "" : t("simulate")}`,
          value: m.amrId,
        }));
    }, [robots]);

  const locationsOption = useMemo(() => {
    return (
      mapData?.locations.map((v) => ({
        label: v.locationId,
        value: v.locationId,
      })) || []
    );
  }, [mapData]);

  const NormalActionListOptions: { label: string; value: Action_Type }[] =
    actonList.slice(0, 4).map((type) => ({
      label: actionTranslate(type),
      value: type,
    }));

  const SpecialActionListOptions: { label: string; value: Action_Type }[] =
    actonList.slice(4, 10).map((type) => ({
      label: actionTranslate(type),
      value: type,
    }));

  const SelectLocationOptions: {
    label: string;
    value: Select_Location_Type;
  }[] = useMemo(() => {
    return selectLocationOption
      .map((type) => {
        switch (type) {
          case "custom":
            return {
              label: t("mission.task_table.location_custom"),
              value: type,
            };
          case "select":
            return {
              label: t("mission.task_table.location_select"),
              value: type,
            };
          case "available_charge_station":
            if (action !== "move") return null;
            return {
              label: t("mission.task_table.location_charge_station"),
              value: type,
            };
          case "prepare_point":
            if (action !== "move") return null;
            return {
              label: t("mission.task_table.prepare_point"),
              value: type,
            };
          case "back_to_load_place":
            return {
              label: t("mission.task_table.back_to_load_place"),
              value: type,
            };

          default:
            return {
              label: type,
              value: type,
            };
        }
      })
      .filter(Boolean) as { label: string; value: Select_Location_Type }[];
  }, [action, t, selectLocationOption]);

  // const SelectLocationOptions: { label: string; value: Select_Location_Type }[] =
  //   selectLocationOption.map((type) => {
  //     switch (type) {
  //       case 'custom':
  //         return {
  //           label: t('mission.task_table.location_custom'), // "Custom (Enter Location ID)"
  //           value: type
  //         };
  //       case 'select':
  //         return {
  //           label: t('mission.task_table.location_select'), // "Auto (Fast-Mission Location)"
  //           value: type
  //         };
  //       case 'available_charge_station':
  //         return {
  //           label: t('mission.task_table.location_charge_station'), // "Auto (Idle Charge Station)"
  //           value: type
  //         };
  //       case 'prepare_point':
  //         return {
  //           label: t('mission.task_table.prepare_point'), // "Auto (Prepare point)"
  //           value: type
  //         };
  //       default:
  //         return {
  //           label: type,
  //           value: type
  //         };
  //     }
  //   });

  const SelectYawOptions: { label: string; value: YawGenre }[] = [0, 1, 2].map(
    (type: YawGenre) => {
      switch (type) {
        case YawGenre.CUSTOM:
          return {
            label: t("mission.task_table.yaw_custom"), // "Custom (Enter Yaw Degree)"
            value: type,
          };
        case YawGenre.SELECT:
          return {
            label: t("mission.task_table.yaw_select"), // "Auto (Fast-Mission Shelf Direction)"
            value: type,
          };
        case YawGenre.CALCULATE_BY_AGV_AND_SHELF_ANGLE:
          return {
            label: t("mission.task_table.yaw_calculate"), // "Auto (Calculate at Shelf)"
            value: type,
          };
        default:
          return {
            label: type,
            value: type,
          };
      }
    }
  );

  const SelectForkHeightOptions: {
    label: string;
    value: Select_Fork_Height_Type;
  }[] = forkHeightOption.map((type) => {
    switch (type) {
      case "custom":
        return {
          label: t("mission.task_table.fork_height_custom"),
          value: type,
        };
      case "select":
        return {
          label: t("mission.task_table.fork_height_select"),
          value: type,
        };
      case "default":
        return {
          label: t("mission.task_table.fork_height_default"),
          value: type,
        };
      case "level":
        return {
          label: t("mission.task_table.level"),
          value: type,
        };
      default:
        return {
          label: type,
          value: type,
        };
    }
  });

  const SelectActiveWaitRobotOptions: {
    label: string;
    value: Select_Active_Robot_Type;
  }[] = activeWaitRobot.map((type) => ({
    label:
      type === "enable"
        ? t("mission.task_table.active")
        : t("mission.task_table.inactive"),
    value: type,
  }));

  const SelectWaitRobotOptions: {
    label: string;
    value: Select_Robot_Wait_Type;
  }[] = waitRobotOption.map((type) => ({
    label:
      type === "execute_first"
        ? t("mission.task_table.execute_first")
        : t("mission.task_table.wait_other_finish"),
    value: type,
  }));

  return {
    robotOption,
    locationsOption,
    NormalActionListOptions,
    SpecialActionListOptions,
    SelectLocationOptions,
    SelectYawOptions,
    SelectForkHeightOptions,
    SelectActiveWaitRobotOptions,
    SelectWaitRobotOptions,
  };
};

export default useTaskOptions;
