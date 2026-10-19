import { useQuery } from "@tanstack/react-query";
import { boolean, object } from "yup";
import client from "./axiosClient";

const schema = object({ showSimulationUi: boolean().required() }).required();

/**
 * 後端 YAML 的 SHOW_SIMULATION_UI: 實際案場會設 false, 把模擬相關按鈕藏起來。
 * 還沒拿到 (或拿失敗) 時當成不顯示, 案場畫面不會先閃出按鈕。
 */
const useSimulationUi = () => {
  const { data } = useQuery(["simulation-ui-config"], {
    queryFn: async () => {
      const res = await client.get<unknown>("api/simulate/ui-config");
      return schema.validate(res.data, { stripUnknown: true });
    },
    staleTime: Infinity,
  });
  return data?.showSimulationUi ?? false;
};

export default useSimulationUi;
