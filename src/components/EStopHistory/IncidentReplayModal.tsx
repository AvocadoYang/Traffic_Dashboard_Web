import { FC, lazy } from "react";
import { Empty, Modal, Spin } from "antd";
import { useTranslation } from "react-i18next";
import { useIncidentReplay } from "@/api/useEStopHistory";
import Fleet3DBoundary from "@/components/Fleet3D/Fleet3DBoundary";

// three.js 很大, 打開回放才載
const IncidentReplay3D = lazy(() => import("@/components/Fleet3D/IncidentReplay3D"));

/**
 * 急停紀錄的「3D 回放」: 讀後端急停時存的現場 (前後各台車的位置), 用 3D 播。
 * 急停後 20 秒內還在錄, 顯示還要多久 (時間到自己再讀一次)
 */
const IncidentReplayModal: FC<{ id: string | null; amrId?: string; onClose: () => void }> = ({ id, amrId, onClose }) => {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useIncidentReplay(id);
  const center = (node: React.ReactNode) => <div style={{ display: "grid", placeItems: "center", height: "100%" }}>{node}</div>;
  return (
    <Modal
      open={!!id}
      onCancel={onClose}
      footer={null}
      width="min(1200px, 94vw)"
      destroyOnHidden
      title={t("fleet3d.incident.title", { amrId: amrId ?? "" })}
      styles={{ body: { height: "70vh" } }}
    >
      {isLoading
        ? center(<Spin />)
        : isError || !data
          ? center(<Empty description={t("fleet3d.incident.missing")} />)
          : "pending" in data
            ? center(<Empty description={t("fleet3d.incident.pending", { sec: Math.ceil(data.pending / 1000) })} />)
            : (
                <div style={{ position: "relative", height: "100%" }}>
                  <Fleet3DBoundary>
                    <IncidentReplay3D replay={data.replay} />
                  </Fleet3DBoundary>
                </div>
              )}
    </Modal>
  );
};

export default IncidentReplayModal;
