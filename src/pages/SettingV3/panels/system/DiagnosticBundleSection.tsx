import { FC, useState } from "react";
import { Select, message } from "antd";
import { DownloadOutlined, MedicineBoxOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import {
  Section,
  SectionTitle,
  Toolbar,
  SolidButton,
  Hint,
  Field,
  FieldLabel,
} from "@/pages/SettingV3/ui/primitives";


/** 錯誤回應因為 responseType 是 blob 會變成 Blob, 要先讀出文字才看得到後端的訊息 */
const errorMessageOf = async (e: any): Promise<string | undefined> => {
  const data = e?.response?.data;
  try {
    if (data instanceof Blob) return JSON.parse(await data.text())?.message;
    return data?.message;
  } catch {
    return undefined;
  }
};

/**
 * 診斷包: 後端把 log、任務、告警、斷線、設定變更紀錄、版本與健康狀況打包成 zip。
 * 用 POST (要登入, 也要有系統設定的修改權限, 下載會留在設定變更紀錄)。
 */
const DiagnosticBundleSection: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    const hide = messageApi.loading(t("diagnostic_bundle.preparing"), 0);
    try {
      const res = await client.post(
        "api/setting/diagnostic-bundle",
        { hours },
        // 打包大的 log 可能超過預設逾時
        { responseType: "blob", timeout: 0 },
      );
      const disposition: string = res.headers["content-disposition"] ?? "";
      const name =
        /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? "diagnostic.zip";
      const url = URL.createObjectURL(res.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
      void messageApi.success(t("diagnostic_bundle.done"));
    } catch (e) {
      const text = await errorMessageOf(e);
      void messageApi.error(text || t("diagnostic_bundle.failed"));
    } finally {
      hide();
      setBusy(false);
    }
  };

  return (
    <Section data-testid="diagnostic-bundle-section">
      {contextHolder}
      <SectionTitle>
        <MedicineBoxOutlined />
        {t("diagnostic_bundle.title")}
      </SectionTitle>

      <Hint>{t("diagnostic_bundle.hint")}</Hint>

      <Field>
        <FieldLabel>{t("diagnostic_bundle.range")}</FieldLabel>
        <Select
          style={{ width: 200 }}
          value={hours}
          onChange={setHours}
          disabled={busy}
          id="diagnostic-hours"
          options={[
            { value: 1, label: t("diagnostic_bundle.range_options.1") },
            { value: 24, label: t("diagnostic_bundle.range_options.24") },
            { value: 72, label: t("diagnostic_bundle.range_options.72") },
            { value: 168, label: t("diagnostic_bundle.range_options.168") },
          ]}
        />
      </Field>

      <Toolbar>
        <SolidButton
          onClick={() => void download()}
          disabled={busy}
          data-testid="diagnostic-download"
        >
          <DownloadOutlined />
          {t("diagnostic_bundle.download")}
        </SolidButton>
      </Toolbar>
    </Section>
  );
};

export default DiagnosticBundleSection;
