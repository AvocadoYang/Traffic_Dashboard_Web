import { FC } from "react";
import { Modal } from "antd";
import ReactJsonView from "@uiw/react-json-view";
import { useTranslation } from "react-i18next";
import { font } from "../../../../ui/tokens";
import { Hint } from "../../../../ui/primitives";

type Props = {
  /** 有值就開啟。內容直接是要顯示的那一筆步驟 */
  value: object | null;
  title?: string;
  onClose: () => void;
};

/**
 * 步驟的原始設定內容。v1 是兩顆按鈕各開一個 Popover(而且塞在 Popover 的
 * title 裡所以沒有內距),手機上根本點不開;這裡合成一個 Modal,
 * operation 與 io 一起看。
 */
const StepJsonModal: FC<Props> = ({ value, title, onClose }) => {
  const { t } = useTranslation();

  return (
    <Modal
      open={!!value}
      title={title ?? t("utils.detail")}
      onCancel={onClose}
      footer={null}
      width={640}
      style={{ top: 48 }}
      destroyOnHidden
    >
      <Hint style={{ marginBottom: 12 }}>
        這是這個步驟存在後端的原始設定,只能檢視。要修改請用「編輯」。
      </Hint>
      {value ? (
        <ReactJsonView
          value={value}
          collapsed={2}
          displayDataTypes={false}
          enableClipboard
          style={{
            fontFamily: font.mono,
            fontSize: font.sm,
            maxHeight: "60vh",
            overflow: "auto",
            padding: 8,
          }}
        />
      ) : null}
    </Modal>
  );
};

export default StepJsonModal;
