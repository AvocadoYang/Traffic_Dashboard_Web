import i18next from "i18next";

// 全域 t 的 key 型別跟 useTranslation 不同 (見 i18n 的坑), 這裡只要字串進字串出
const t = i18next.t as (key: string) => string;

export const locationOption = (value: string) => {
  switch (value) {
    case "ELEVATOR":
      return t("edit_location_panel.elevator");
    // case "RoboticArm":
    //   return t("edit_location_panel.roboticArm");
    case "CONVEYOR":
      return t("edit_location_panel.conveyor");
    case "LiftGate":
      return t("edit_location_panel.liftGate");
    // case "Palletizer":
    //   return t("edit_location_panel.palletizer");
    case "CHARGING":
      return t("edit_location_panel.Charging");

    case "STANDBY":
      return t("edit_location_panel.Standby");
    case "STORAGE":
      return t("edit_location_panel.Storage");
    case "GATE_WAIT_POINT":
      return t("edit_location_panel.GATE_WAIT_POINT");
    case "STACK":
      return t("edit_location_panel.STACK");
    case "PACKAGE":
      return t("edit_location_panel.PACKAGE");
    case "PACKAGE_IN":
      return t("edit_location_panel.PACKAGE_IN");
    case "PACKAGE_OUT":
      return t("edit_location_panel.PACKAGE_OUT");
    case "MIR_ROBOT_POSITION":
      return "Robot position";
    case "MIR_CHARGING_STATION":
      return "Charging station";
    case "MIR_SHELF_POSITION":
      return "Shelf position";
    case "MIR_VL_MARKER":
      return "VL marker";
    case "MIR_STRIPE_MARKER":
      return "Robot stripe marker";
    default:
      return value;
  }
};
