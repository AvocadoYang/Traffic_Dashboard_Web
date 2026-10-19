import { FC } from "react";
import { Button, Result, Spin } from "antd";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useUiConfig from "@/api/useUiConfig";
import SimulateV2 from "./SimulateV2";

/** 後端 YAML SHOW_SIMULATE_V2: false 時, 直接打 /simulate-v2 也進不去 */
const SimulateV2Gate: FC = () => {
  const { isLoading, showSimulateV2 } = useUiConfig();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (isLoading) {
    return <Spin style={{ display: "block", margin: "20vh auto" }} />;
  }
  if (!showSimulateV2) {
    return (
      <Result
        status="403"
        title={t("page_disabled.title")}
        subTitle={t("page_disabled.desc")}
        extra={
          <Button type="primary" onClick={() => navigate("/", { replace: true })}>
            {t("page_disabled.back_home")}
          </Button>
        }
      />
    );
  }
  return <SimulateV2 />;
};

export default SimulateV2Gate;
