import useCustomCargoFormat from '@/api/useCustomCargoFormat';
import { Button, Form, Input, message, Modal, Select, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactJsonView from '@uiw/react-json-view';
import { useMutation } from '@tanstack/react-query';
import client from '@/api/axiosClient';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';
import { useAtom, useAtomValue } from 'jotai';
import { GlobalCargoInfo, GlobalCargoInfoModal } from './jotaiState';
import { StyledJsonPreview } from './cargoDetailStyle';
import { Cargo } from '@/types/peripheral';
import styled from 'styled-components';

const Wrapper = styled.div`
  max-height: 72vh;
  overflow-y: auto;
  padding-right: 8px;
`;

const CargoDetail: FC = () => {
  const { t } = useTranslation();
  const { data } = useCustomCargoFormat();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const { dbId, locationId, level, cargo } = useAtomValue(GlobalCargoInfo);
  const [openCargoModal, setOpenCargoModal] = useAtom(GlobalCargoInfoModal);
  const [formatFieldMap, setFormatFieldMap] = useState<
    Record<number, { name: string; type: string }[]>
  >({});

  // console.log(cargo);

  const options = data?.map((v) => ({
    label: v?.custom_name,
    value: v?.id
  }));

  const editMutation = useMutation({
    mutationFn: (payload: { dbId: string; locationId: string; level: number; cargo: Cargo[] }) =>
      client.post('/api/setting/update-cargo-info', payload),
    onSuccess: () => {
      messageApi.success(t('utils.success'));
      form.resetFields();
      setOpenCargoModal(false);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  useEffect(() => {
    if (!openCargoModal || !cargo) return;

    try {
      const parsedCargo = Array.isArray(cargo)
        ? cargo.map((c) => ({
            cargoInfoId: c.cargoInfoId,
            metadata: c.metadata ? JSON.parse(c.metadata) : {},
            custom_cargo_metadata_id: c.customCargoMetadataId ?? c.customCargoMetadataId
          }))
        : [];

      const newMap: Record<number, { name: string; type: string }[]> = {};
      parsedCargo.forEach((c, index) => {
        const matched = data?.find((v) => v?.id === c.custom_cargo_metadata_id);
        if (matched?.format) {
          try {
            const fields = Object.entries(JSON.parse(matched.format)).map(([name, type]) => ({
              name,
              type: typeof type === 'string' ? type : 'string'
            }));
            newMap[index] = fields;
          } catch (err) {
            newMap[index] = [];
          }
        }
      });

      setFormatFieldMap(newMap);
      form.setFieldsValue({ cargo: parsedCargo });
    } catch (err) {
      console.error('Failed to parse cargo:', err);
    }
  }, [cargo, openCargoModal, form, data]);

  const handleCancel = () => {
    setOpenCargoModal(false);
    form.resetFields();
  };

  const handleSelectChange = (value: string, index: number) => {
    const selectedFormat = data?.find((v) => v?.id === value);
    const formatFields = selectedFormat?.format
      ? Object.entries(JSON.parse(selectedFormat.format)).map(([name, type]) => ({
          name,
          type: typeof type === 'string' ? type : 'string'
        }))
      : [];

    const existingCargo = form.getFieldValue('cargo') || [];
    existingCargo[index] = {
      ...(existingCargo[index] || {}),
      custom_cargo_metadata_id: value,
      metadata: {}
    };

    setFormatFieldMap((prev) => ({
      ...prev,
      [index]: formatFields
    }));

    form.setFieldsValue({ cargo: existingCargo });
  };

  const renderInput = (type: string, _name: string) => {
    switch (type.toLowerCase()) {
      case 'string':
        return <Input />;
      case 'number':
        return <Input type="number" />;
      case 'boolean':
        return (
          <Select>
            <Select.Option value="true">{t('utils.yes')}</Select.Option>
            <Select.Option value="false">{t('utils.no')}</Select.Option>
          </Select>
        );
      default:
        return <Input />;
    }
  };

  const handleOk = () => {
    if (!dbId || !locationId) return;

    form
      .validateFields()
      .then((values) => {
        const payload = {
          dbId,
          locationId,
          level,
          cargo: (values.cargo || []).map((entry: any) => ({
            cargoInfoId: entry.cargoInfoId,
            metadata: JSON.stringify(entry.metadata),
            customCargoMetadataId: entry.custom_cargo_metadata_id
          }))
        };

        editMutation.mutate(payload);
      })
      .catch((error) => {
        console.error('Form validation failed:', error);
      });
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={t('amr_card.update_cargo')}
        open={openCargoModal}
        onCancel={handleCancel}
        footer={<></>}
      >
        <Wrapper>
          <Form form={form} layout="vertical">
            <Form.List name="cargo">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, index) => {
                    const name = field.name;
                    const currentCargo = form.getFieldValue(['cargo', name]) || {};
                    const hasMetadataSchema = !!currentCargo.custom_cargo_metadata_id;
                    const metadata = currentCargo.metadata || {};
                    // console.log(metadata);
                    // console.log(hasMetadataSchema);
                    return (
                      <div
                        key={`${index}-form`}
                        style={{
                          marginBottom: 24,
                          padding: 12,
                          border: '1px dashed #ccc',
                          borderRadius: 4
                        }}
                      >
                        <Form.Item name={[name, 'cargoInfoId']} hidden>
                          <Input />
                        </Form.Item>

                        <Form.Item
                          label={t('customCargo.name')}
                          name={[name, 'custom_cargo_metadata_id']}
                        >
                          <Select
                            disabled={!hasMetadataSchema && Object.keys(metadata).length !== 0}
                            options={options}
                            onChange={(val) => handleSelectChange(val, name)}
                          />
                        </Form.Item>

                        {hasMetadataSchema ? (
                          (formatFieldMap[name] || []).map((field) => (
                            <Form.Item
                              key={`${name}-${field.name}`}
                              label={field.name}
                              name={[name, 'metadata', field.name]}
                            >
                              {renderInput(field.type, field.name)}
                            </Form.Item>
                          ))
                        ) : (
                          <Form.Item
                            label={
                              <>
                                {t('amr_card.metadata')}
                                <Tooltip placement="right" title={t('amr_card.metadata_desc')}>
                                  <QuestionCircleOutlined />
                                </Tooltip>
                              </>
                            }
                          >
                            <StyledJsonPreview>
                              <ReactJsonView
                                displayDataTypes={false}
                                enableClipboard={false}
                                collapsed={false}
                                value={metadata}
                                style={{ fontSize: 14 }}
                              />
                            </StyledJsonPreview>
                          </Form.Item>
                        )}

                        <Form.Item>
                          <Button danger onClick={() => remove(name)}>
                            {t('utils.delete')}
                          </Button>
                        </Form.Item>
                      </div>
                    );
                  })}

                  <Form.Item>
                    <Tooltip placement="bottom" title={t('amr_card.add_desc')}>
                      <Button type="dashed" onClick={() => add()} block>
                        + {t('amr_card.add_cargo')}
                      </Button>
                    </Tooltip>
                  </Form.Item>
                </>
              )}
            </Form.List>

            <Button onClick={handleOk}>{t('utils.save')}</Button>
          </Form>
        </Wrapper>
      </Modal>
    </>
  );
};

export default CargoDetail;
