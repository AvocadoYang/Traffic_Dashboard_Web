import { FC, useRef, useState } from "react";
import { Modal, message } from "antd";
import { RedoOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { errorHandler } from "@/utils/utils";
import {
  Section,
  SectionTitle,
  Toolbar,
  DangerButton,
  Hint,
  WarnNote,
} from "@/pages/SettingV3/ui/primitives";

type SystemInfo = {
  restartMode: "loop" | "supervisor" | "dev" | "self";
  backendStartedAt: string;
  activeMissions: number;
  pendingMissions: number;
};

const INFO_KEY = ["setting-system-info"];
const POLL_MS = 2000;
// 等後端回來最久等多久: 自己重啟要先等 4 秒才開始, 載入設定和連線還要一段時間
const GIVE_UP_MS = 3 * 60_000;

/**
 * 重新啟動後端。重啟的方式看後端是被誰啟動的 (pm2 / Docker 由它們拉起來, 開發用 ts-node-dev 自己重開,
 * 現場終端機視窗裡執行的由後端自己再啟動一個)。按下去後這頁一直問後端, 看到啟動時間變了就重新整理。
 */
const RestartSection: FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, modalHolder] = Modal.useModal();
  const [restarting, setRestarting] = useState(false);
  const startedAtBefore = useRef<string | null>(null);

  const { data } = useQuery({
    queryKey: INFO_KEY,
    queryFn: async () =>
      (await client.get<SystemInfo>("api/setting/system-info")).data,
    // 重啟中不要讓畫面一直閃錯誤
    enabled: !restarting,
  });

  const waitForBackend = async (before: string) => {
    const deadline = Date.now() + GIVE_UP_MS;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      try {
        const res = await client.get<SystemInfo>("api/setting/system-info", {
          timeout: 3000,
        });
        if (res.data.backendStartedAt !== before) {
          window.location.reload();
          return;
        }
      } catch {
        // 還沒起來
      }
    }
    setRestarting(false);
    void messageApi.error(t("restart_section.timeout"), 10);
  };

  const confirmRestart = () => {
    modal.confirm({
      title: t("restart_section.confirm_title"),
      content: (
        <div>
          {data && data.activeMissions > 0 && (
            <WarnNote>
              {t("restart_section.active_warning", { count: data.activeMissions })}
            </WarnNote>
          )}
          <div>{t("restart_section.confirm_body")}</div>
        </div>
      ),
      okText: t("restart_section.restart"),
      okButtonProps: { danger: true },
      cancelText: t("utils.cancel"),
      onOk: async () => {
        try {
          const before = data?.backendStartedAt ?? "";
          startedAtBefore.current = before;
          await client.post("api/setting/restart");
          setRestarting(true);
          void waitForBackend(before);
        } catch (e) {
          errorHandler(e as any, messageApi);
        }
      },
    });
  };

  return (
    <Section data-testid="restart-section">
      {contextHolder}
      {modalHolder}
      <SectionTitle>
        <RedoOutlined />
        {t("restart_section.title")}
      </SectionTitle>

      <Hint>{t("restart_section.hint")}</Hint>
      {data && <Hint>{t(`restart_section.mode_${data.restartMode}`)}</Hint>}
      {data && data.activeMissions > 0 && (
        <WarnNote>
          {t("restart_section.active_warning", { count: data.activeMissions })}
        </WarnNote>
      )}

      {restarting ? (
        <Hint data-testid="restart-waiting">{t("restart_section.waiting")}</Hint>
      ) : (
        <Toolbar>
          <DangerButton
            onClick={confirmRestart}
            disabled={!data}
            data-testid="restart-button"
          >
            <RedoOutlined />
            {t("restart_section.restart")}
          </DangerButton>
        </Toolbar>
      )}
    </Section>
  );
};

export default RestartSection;
