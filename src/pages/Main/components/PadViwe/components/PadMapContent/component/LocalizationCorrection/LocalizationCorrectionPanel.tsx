import { FC } from "react";
import { createPortal } from "react-dom";
import { useSetAtom } from "jotai";
import { Button, Modal, Typography } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

import { useLocalizationCorrection } from "@/api/useLocalizationCorrection";
import { localizationCorrection } from "@/utils/gloable";

const Panel = styled.div`
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 200002;
  background: rgba(20, 20, 20, 0.88);
  color: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  min-width: 280px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  font-size: 12px;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 700;
`;

const PanelRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
  font-family: monospace;
`;

const PanelActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

/**
 * 定位校正的面板 (右上角): 幽靈車身現在的位置, 重設 / 取消 / 確認送出。
 * 2D 地圖 (LocalizationCorrectionGhost) 和 3D 地圖共用; x / y / yaw 是幽靈車身的位置
 */
const LocalizationCorrectionPanel: FC<{ amrId: string; x: number; y: number; yaw: number }> = ({ amrId, x, y, yaw }) => {
  const { t } = useTranslation();
  const setCorrection = useSetAtom(localizationCorrection);
  const { mutateAsync: submitCorrection, isLoading: isSubmitting, contextHolder } = useLocalizationCorrection();

  const reset = () => setCorrection({ amrId, dx: 0, dy: 0, dYaw: 0 });
  const cancel = () => setCorrection(null);
  const confirm = async () => {
    try {
      await submitCorrection({ amrId, x, y, yaw });
    } catch {
      return;
    }
    Modal.info({
      title: t("amr_card.localization_correction_result_title"),
      content: (
        <Typography.Paragraph copyable={{ text: `${x.toFixed(3)}, ${y.toFixed(3)}, ${yaw.toFixed(1)}` }}>
          x: {x.toFixed(3)}
          <br />
          y: {y.toFixed(3)}
          <br />
          yaw: {yaw.toFixed(1)}°
        </Typography.Paragraph>
      ),
      onOk: cancel,
    });
  };

  return (
    <>
      {createPortal(
        <Panel onClick={(e) => e.stopPropagation()} data-testid="localization-correction-panel">
          <PanelHeader>
            <span>{`${t("amr_card.localization_correction")} - ${amrId}`}</span>
            <CloseOutlined onClick={cancel} style={{ cursor: "pointer" }} />
          </PanelHeader>
          <div style={{ marginBottom: 8, opacity: 0.75 }}>{t("amr_card.localization_correction_hint")}</div>
          <PanelRow>
            <span>x: {x.toFixed(3)}</span>
            <span>y: {y.toFixed(3)}</span>
            <span>yaw: {yaw.toFixed(1)}°</span>
          </PanelRow>
          <PanelActions>
            <Button size="small" onClick={reset} disabled={isSubmitting}>
              {t("amr_card.localization_correction_reset")}
            </Button>
            <Button size="small" onClick={cancel} disabled={isSubmitting}>
              {t("amr_card.localization_correction_cancel")}
            </Button>
            <Button size="small" type="primary" onClick={confirm} loading={isSubmitting}>
              {t("amr_card.localization_correction_confirm")}
            </Button>
          </PanelActions>
        </Panel>,
        document.body,
      )}
      {contextHolder}
    </>
  );
};

export default LocalizationCorrectionPanel;
