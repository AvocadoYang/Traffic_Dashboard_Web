import React, { FC, useState } from "react";
import { Modal, Upload, Button, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd/es/upload/interface";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import client from "@/api/axiosClient";

const IntroText = styled.p`
  color: #475467;
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 20px 0;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
`;

interface CreateSoundModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreateSoundModal: FC<CreateSoundModalProps> = ({
  open,
  onClose,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      // field name "sound" must match multer's upload.single("sound") on
      // the backend (see configRouter.ts)
      formData.append("sound", file);
      formData.append("name", file.name.replace(/\.[^/.]+$/, ""));
      return client.post("api/setting/upload-sound", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      message.success("已建立聲音");
      queryClient.invalidateQueries({ queryKey: ["all-sound"] });
      handleClose();
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message ?? "上傳失敗");
    },
  });

  const handleClose = () => {
    setFileList([]);
    onClose();
  };

  const handleCreate = () => {
    const file = fileList[0]?.originFileObj as File | undefined;
    if (!file) {
      message.warning("請先選擇一個聲音檔案");
      return;
    }
    createMutation.mutate(file);
  };

  return (
    <Modal
      title="Create sound"
      open={open}
      onCancel={createMutation.isPending ? undefined : handleClose}
      closable={!createMutation.isPending}
      maskClosable={!createMutation.isPending}
      footer={null}
      width={480}
    >
      <IntroText>
        Create a sound, upload a sound file, enter a name for the sound, and
        select at which volume it should play. Then select <strong>Save</strong>{" "}
        to continue. 100% volume is approximately 80 dB.
      </IntroText>

      <Upload
        beforeUpload={() => false}
        fileList={fileList}
        onChange={({ fileList: fl }) => setFileList(fl.slice(-1))}
        onRemove={() => setFileList([])}
        maxCount={1}
        accept="audio/*"
      >
        <Button icon={<UploadOutlined />}>Upload sound</Button>
      </Upload>

      <ModalFooter>
        <Button
          type="primary"
          loading={createMutation.isPending}
          onClick={handleCreate}
        >
          Create
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CreateSoundModal;