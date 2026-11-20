import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import useName from "@/api/useAmrName";

/** 車輛下拉選單。模擬車會在名稱後面標註,跟 v1 一致。 */
const useAmrOptions = () => {
  const { t } = useTranslation();
  const { data } = useName();

  return useMemo(
    () =>
      data?.amrs.map((m) => ({
        label: m.isReal ? m.amrId : `${m.amrId} ${t("simulate")}`,
        value: m.amrId,
      })) ?? [],
    [data, t],
  );
};

export default useAmrOptions;
