import { Button, Modal } from 'antd';
import { FC, memo, useState } from 'react';
import SelectScript from './SelectScript';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/api/axiosClient';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';
import { message } from 'antd';

const ImportMapConfigModal: FC<{
  openImportMapConfig: boolean;
  setImportMapConfig: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ openImportMapConfig, setImportMapConfig }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: (id: string) => {
      return client.post('api/setting/import-map-config', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-scripts'] });
      queryClient.invalidateQueries({ queryKey: ['simulate-script'] });
      queryClient.invalidateQueries({ queryKey: ['script-robot'] });
      queryClient.invalidateQueries({ queryKey: ['mock-robot'] });
      queryClient.invalidateQueries({ queryKey: ['map束map'] });
      void messageApi.success(t('utils.success'), 5);
      setImportMapConfig(false);
      setSelectedScriptId(null);
    },
    onError: (e: ErrorResponse) => {
      errorHandler(e, messageApi);
    }
  });

  const handleCancel = () => {
    setImportMapConfig(false);
    setSelectedScriptId(null);
  };

  const handleImport = () => {
    if (selectedScriptId) {
      importMutation.mutate(selectedScriptId);
    }
  };

  return (
    <Modal
      title={t('import_map.title')}
      open={openImportMapConfig}
      onCancel={handleCancel}
      footer={(_, { CancelBtn }) => (
        <>
          <CancelBtn />
          <Button
            type="primary"
            onClick={handleImport}
            disabled={!selectedScriptId || importMutation.isLoading}
            loading={importMutation.isLoading}
          >
            {t('import_map.import')}
          </Button>
        </>
      )}
    >
      {contextHolder}
      <SelectScript
        onSelect={(scriptId) => setSelectedScriptId(scriptId)}
        selectedScriptId={selectedScriptId}
      />
    </Modal>
  );
};

export default memo(ImportMapConfigModal);
