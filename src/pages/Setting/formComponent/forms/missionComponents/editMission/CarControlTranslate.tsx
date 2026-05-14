import { useTranslation } from "react-i18next";
import { Action_Type } from "./forkEditMissionSlice/types";

const CarControlTranslate = ({ word }: { word: Action_Type }) => {
  const { t } = useTranslation();

  switch (word) {
    case "move":
      return <>{t("car_control_translate.move")}</>;
    case "load":
      return <>{t("car_control_translate.load")}</>;
    case "offload":
      return <>{t("car_control_translate.offload")}</>;
    case "fork":
      return t("car_control_translate.fork");
    case "spin":
      return t("car_control_translate.S");
    case "verity_cargo":
      return t("car_control_translate.verity_cargo");
    case "charge":
      return <>{t("car_control_translate.charge")}</>;
    case "cargo_limit":
      return <>{t("car_control_translate.cargo_limit")}</>;

    case "peripheral_action":
      return <>{t("car_control_translate.peripheral_action")}</>;
    default:
      return <>{word}</>;
  }
};

export default CarControlTranslate;
