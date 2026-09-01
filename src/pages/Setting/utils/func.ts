import { t } from "i18next";

export const locationOption = (value) => {
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
    case "MIR_ROBOT_POSITION":
      return "Robot position";
    case "MIR_CHARGING_STATION":
      return "Charging station";
    case "MIR_SHELF_POSITION":
      return "Shelf position";
    default:
      return value;
  }
};
