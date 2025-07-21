import { QueryClient } from '@tanstack/react-query';
import { Modal, UploadProps } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import Dragger from 'antd/es/upload/Dragger';
import { memo } from 'react';
import { useAtom } from 'jotai';
import { isOpenUploadWarningIDModal } from '@/utils/siderGloble';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity
    }
  }
});

const text = {
  description1: 'Click or drag file to this area to upload',
  description2: `Support for a single or bulk upload. Strictly prohibited from Support for a single or bulk upload. Strictly prohibited from
  uploading company data or other banned files.`
};

const UploadWarningModal = () => {
  const [OpenUploadWarningIDModal, setOpenUploadWarningIDModal] = useAtom(
    isOpenUploadWarningIDModal
  );
  const handleCancel = () => {
    setOpenUploadWarningIDModal(false);
  };
  const props: UploadProps = {
    name: 'file',
    multiple: false,
    // eslint-disable-next-line no-restricted-globals
    action: `https://${location.host.split(':')[0]}:4000/api/test/update/warning`,
    headers: {
      authorization: localStorage.getItem('_KMT') as string
    },
    onChange(info) {
      const { status } = info.file;
      // if (status !== 'uploading') {
      // }
      if (status === 'done') {
        console.log(`${info.file.name} file uploaded successfully.`);
        queryClient.refetchQueries({ queryKey: ['warning-table'], type: 'active' }).catch((err) => {
          console.log(err);
        });
      } else if (status === 'error') {
        console.log(`${info.file.name} file upload failed.`);
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onDrop(_e) {
      // console.log('Dropped files', _e.dataTransfer.files);
    }
  };

  return (
    <Modal
      title="上傳錯誤表"
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
