import { FC, useEffect, useState } from "react";
import { Modal, Select, Image, Button, message, Alert } from "antd";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import styled from "styled-components";
import client from "@/api/axiosClient";
import useAllMapInfo from "@/api/useAllMapInfo";
import { useMiRStatus } from "@/sockets/useMirStatus";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { MiR_StatusColor, MIR_MAP_SWITCHABLE_STATUS } from "./Lists";

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.85em;
  padding: 4px 0;

  & + & {
    border-top: 1px dashed #e8e8e8;
  }
`;

const InfoLabel = styled.span`
  color: #8c8c8c;
`;

const PreviewWrap = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  margin-top: 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
`;

const PreviewPlaceholder = styled.span`
  color: #bfbfbf;
  font-size: 0.85em;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
`;

const MapSwitchModal: FC<{
  amrId: string;
  open: boolean;
  onClose: () => void;
}> = ({ amrId, open, onClose }) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const MiR_Status_IO = useMiRStatus(amrId);
  const { data: allMapInfo } = useAllMapInfo();
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedMapId(MiR_Status_IO.active_map_id || null);
  }, [open, MiR_Status_IO.active_map_id]);

  const groupMaps = (allMapInfo?.allMap ?? []).filter(
    (m) => m.map_group_id === MiR_Status_IO.active_groups_id,
  );
  const selectedMap = groupMaps.find((m) => m.id === selectedMapId);
  const previewSrc =
    selectedMap && allMapInfo
      ? `${client.defaults.baseURL}${allMapInfo.systemFilePath}${selectedMap.imagePath}`
      : undefined;

  const isReady = MiR_Status_IO.status === MIR_MAP_SWITCHABLE_STATUS;

  const switchMutation = useMutation({
    mutationFn: (mapId: string) =>
      client.patch("api/amr/mi/active-map", { amrId, mapId }),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      onClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  return (
    // antd Modal 是 portal, 但 React 合成事件仍沿著元件樹往上冒泡(不是 DOM 樹) ——
    // 不擋住的話, modal 內的任何點擊都會冒泡到卡片的 Popover trigger, 讓 BtnGroup 一直被觸發開啟。
    <div onClick={(e) => e.stopPropagation()}>
    <Modal
      title={t("utils.switch_map")}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      {contextHolder}

      <InfoRow>
        <InfoLabel>{t("utils.vehicle_id")}</InfoLabel>
        <span>{amrId}</span>
      </InfoRow>
      <InfoRow>
        <InfoLabel>{t("utils.status")}</InfoLabel>
        <span style={{ color: MiR_StatusColor(MiR_Status_IO.status), fontWeight: "bold" }}>
          {MiR_Status_IO.status || "--"}
        </span>
      </InfoRow>

      {!isReady && (
        <Alert
          style={{ marginTop: 12 }}
          type="warning"
          showIcon
          title={t("utils.switch_map_requires_ready")}
        />
      )}

      <Select
        style={{ width: "100%", marginTop: 12 }}
        placeholder={t("utils.select_map")}
        value={selectedMapId ?? undefined}
        onChange={setSelectedMapId}
        disabled={!isReady}
        notFoundContent={t("utils.no_map_available")}
        options={groupMaps.map((m) => ({
          label: m.floor ? `${m.fileName} (F${m.floor})` : m.fileName,
          value: m.id,
        }))}
      />

      <PreviewWrap>
        {previewSrc ? (
          <Image
            src={previewSrc}
            alt={selectedMap?.fileName}
            style={{ maxHeight: 240, objectFit: "contain" }}
            preview={false}
          />
        ) : (
          <PreviewPlaceholder>{t("utils.map_preview")}</PreviewPlaceholder>
        )}
      </PreviewWrap>

      <Footer>
        <Button onClick={onClose}>{t("utils.cancel")}</Button>
        <Button
          type="primary"
          loading={switchMutation.isPending}
          disabled={
            !isReady ||
            !selectedMapId ||
            selectedMapId === MiR_Status_IO.active_map_id
          }
          onClick={() =>
            isReady && selectedMapId && switchMutation.mutate(selectedMapId)
          }
        >
          {t("utils.confirm")}
        </Button>
      </Footer>
    </Modal>
    </div>
  );
};

export default MapSwitchModal;
