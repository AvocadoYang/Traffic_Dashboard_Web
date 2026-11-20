import { QueryClient } from "@tanstack/react-query";
import { Modal, UploadProps } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import Dragger from "antd/es/upload/Dragger";
import { memo } from "react";
import { useAtom } from "jotai";
import { isOpenUploadWarningIDModal } from "@/utils/siderGloble";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { getToken } from "@/utils/session";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
    },
  },
});

const text = {
  description1: "Click or drag file to this area to upload",
  description2: `Support for a single or bulk upload. Strictly prohibited from Support for a single or bulk upload. Strictly prohibited from
  uploading company data or other banned files.`,
};

const UploadWarningModal = () => {
  const { t } = useTranslation();
  const [OpenUploadWarningIDModal, setOpenUploadWarningIDModal] = useAtom(
    isOpenUploadWarningIDModal,
  );
  const handleCancel = () => {
    setOpenUploadWarningIDModal(false);
  };
  const props: UploadProps = {
    name: "file",
    multiple: false,
    // 跟其他 API 一樣的位址 (http / https 跟著網頁) 和登入 token; 後端要登入時才不會被擋
    action: `${client.defaults.baseURL}/api/test/update/warning`,
    headers: {
      Authorization: `Bearer ${getToken() ?? ""}`,
    },
    onChange(info) {
      const { status } = info.file;
      // if (status !== 'uploading') {
      // }
      if (status === "done") {
        console.log(`${info.file.name} file uploaded successfully.`);
        queryClient
          .refetchQueries({ queryKey: ["warning-table"], type: "active" })
          .catch((err) => {
            console.log(err);
          });
      } else if (status === "error") {
        console.log(`${info.file.name} file upload failed.`);
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onDrop(_e) {
      // console.log('Dropped files', _e.dataTransfer.files);
    },
  };

  return (
    <Modal
      title={t("toolbar.file_setting.upload_warning_file")}
      open={OpenUploadWarningIDModal}
      onCancel={handleCancel}
      footer={(_, { CancelBtn }) => (
        <>
          <CancelBtn />
        </>
      )}
    >
      <Dragger {...props}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">{text.description1}</p>
        <p className="ant-upload-hint">{text.description2}</p>
      </Dragger>
    </Modal>
  );
};

export default memo(UploadWarningModal);
