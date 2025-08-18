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
    case "charge":
      return <>{t("car_control_translate.charge")}</>;
    case "cargo_limit":
      return <>{t("car_control_translate.cargo_limit")}</>;
    case "load_from_other":
      return t("car_control_translate.load_from_other");

    case "offload_from_other":
      return t("car_control_translate.offload_from_other");

    default:
      return <>{word}</>;
  }
};

export default CarControlTranslate;
