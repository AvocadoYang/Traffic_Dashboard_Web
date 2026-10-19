import { useQuery } from "@tanstack/react-query";
import { boolean, object } from "yup";
import client from "./axiosClient";

const schema = object({
  showSimulationUi: boolean().required(),
  showSimulateV2: boolean().required(),
}).required();

/**
 * 後端 YAML 決定的畫面開關, 實際案場會設 false:
 * - SHOW_SIMULATION_UI: 首頁「模擬車輛」、Header「模擬」
 * - SHOW_SIMULATE_V2: 「任務模擬 v2」頁 (選單 + 網址)
 * 還沒拿到 (或拿失敗) 時一律當成不顯示, 案場畫面不會先閃出按鈕。
 */
const useUiConfig = () => {
  const { data, isLoading } = useQuery(["ui-config"], {
    queryFn: async () => {
      const res = await client.get<unknown>("api/simulate/ui-config");
      return schema.validate(res.data, { stripUnknown: true });
    },
    staleTime: Infinity,
  });
  return {
    isLoading,
    showSimulationUi: data?.showSimulationUi ?? false,
    showSimulateV2: data?.showSimulateV2 ?? false,
  };
};

export default useUiConfig;
