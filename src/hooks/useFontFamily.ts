import { useTranslation } from "react-i18next";
import { font } from "@/styles/variables";

export const useFontFamily = () => {
  const { i18n } = useTranslation();
  return i18n.language === "tw"
    ? font.fontFamily.zh
    : font.fontFamily.en;
};