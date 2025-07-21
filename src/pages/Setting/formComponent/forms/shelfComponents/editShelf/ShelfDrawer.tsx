import client from '@/api/axiosClient';
import useAllMissionTitles from '@/api/useMissionTitle';
import useShelfCategory from '@/api/useShelfCategory';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Flex,
  Form,
  InputNumber,
  message,
  Modal,
  Select,
  Tooltip,
  Typography
} from 'antd';
import { MinusCircleOutlined, PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Dispatch, FC, Key, SetStateAction, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useLoc, { LocWithoutArr } from '@/api/useLoc';

type FieldType = {
  shelfId?: Key[];
  category: string;
  load: string;
  offload: string;
  yaw: string;
  cargo_limit: number;
};

const ShelfDrawer: FC<{
  openDrawer: boolean;
  setOpenDrawer: Dispatch<SetStateAction<boolean>>;
  selectedRowKeys: Key[];
}> = ({ openDrawer, setOpenDrawer, selectedRowKeys }) => {
  const { data: missionTitle } = useAllMissionTitles();
  const { data: allCategory } = useShelfCategory();
  const { data: loc } = useLoc(undefined);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const relationshipTypeOption = [
    { value: 'fixed', label: t('shelf.cargo_mission.relationship_fixed') },
    { value: 'non-fixed', label: t('shelf.cargo_mission.relationship_non_fixed') }
  ];

  const relationOption = useMemo(() => {
    const info = loc as LocWithoutArr[];
    const mixData = info
      .filter((v) => v.areaType === 'Storage')
      .sort((a, b) => Number(a.locationId) - Number(b.locationId))
      .map((v) => ({
        label: v.locationId,
        value: v.locationId
      }));
    return mixData;
  }, [loc, t]);

  const misOptions = useMemo(() => {
    if (!missionTitle) return [];
    return missionTitle
      ?.filter((g) =>
        g.MissionTitleBridgeCategory.some((s) => s.Category?.tagName === 'dynamic-mission')
      )
      .map((v) => {
        return {
          value: v.id,
          label: v.name
        };
      });
  }, [missionTitle]);

  const submitMutation = useMutation({
    mutationFn: (payload: FieldType) => {
      return client.post('api/setting/edit-multi-shelf', payload);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['shelf']
      });
      await queryClient.refetchQueries({ queryKey: ['loc-only'] }),
        messageApi.success(t('utils.success'));
      setOpenDrawer(false);
    },
    onError: (e: ErrorResponse) => {
      errorHandler(e, messageApi);
    }
  });

  const onFinish = () => {
    const values = form.getFieldsValue();
    const payload: FieldType = {
      ...values,
      shelfId: selectedRowKeys
    };
    submitMutation.mutate(payload);
    form.resetFields();
  };

  return (
    <>
      {contextHolder}
      {openDrawer ? (
        <Modal
          title={t('edit_shelf_panel.edit_shelf')}
          onClose={() => setOpenDrawer(false)}
          onCancel={() => setOpenDrawer(false)}
          open={openDrawer}
          onOk={() => onFinish()}
        >
          <Card>
            <Form onFinish={onFinish} form={form} autoComplete="off">
              <Form.Item label={t('edit_shelf_panel.category')} name="category">
                <Select
                  disabled={selectedRowKeys.length === 0}
                  options={allCategory?.map((v) => {
                    return { value: v.id, label: v.name };
                  })}
                />
              </Form.Item>

              <Form.Item label={t('edit_shelf_panel.load_mission')} name="load">
                <Select disabled={selectedRowKeys.length === 0} allowClear options={misOptions} />
              </Form.Item>

              <Form.Item label={t('edit_shelf_panel.offload_mission')} name="offload">
                <Select disabled={selectedRowKeys.length === 0} allowClear options={misOptions} />
              </Form.Item>

              <Form.Item label={t('edit_shelf_panel.cargo_limit')} name="cargo_limit">
                <InputNumber disabled={selectedRowKeys.length === 0} />
              </Form.Item>

              <Form.Item
                label={
                  <>
                    <Flex align="center" justify="center">
                      <Typography.Text>{t('shelf.cargo_mission.priority')}</Typography.Text>
                      <Tooltip title={t('shelf.cargo_mission.priority_desc')}>
                        <QuestionCircleOutlined style={{ marginLeft: 8 }} />
                      </Tooltip>
                    </Flex>
                  </>
                }
                name="placement_priority"
                rules={[
                  { required: true, message: t('shelf.cargo_mission.priority_required') },
                  { type: 'number', min: 0, message: t('shelf.cargo_mission.priority_min') }
                ]}
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder={'10'} />
              </Form.Item>

              <Form.Item
                label={
                  <>
                    <Flex align="center" justify="center">
                      <Typography.Text>{t('shelf.cargo_mission.relationships')}</Typography.Text>
                      <Tooltip title={t('shelf.cargo_mission.relationships_desc')}>
                        <QuestionCircleOutlined style={{ marginLeft: 8 }} />
                      </Tooltip>
                    </Flex>
                  </>
                }
              >
                <Form.List name="relationships">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <Form.Item
                            {...restField}
                            name={[name, 'relatedLocId']}
                            rules={[
                              {
                                required: true,
                                message: t('shelf.cargo_mission.related_loc_required')
                              }
                            ]}
                            style={{ flex: 1 }}
                          >
                            <Select
                              options={relationOption}
                              placeholder={t('shelf.cargo_mission.select_location')}
                              showSearch
                            />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'relationshipType']}
                            rules={[
                              {
                                required: true,
                                message: t('shelf.cargo_mission.relationship_type_required')
                              }
                            ]}
                            style={{ flex: 1 }}
                          >
                            <Select
                              options={relationshipTypeOption}
                              placeholder={t('shelf.cargo_mission.select_relationship_type')}
                            />
                          </Form.Item>
                          <MinusCircleOutlined
                            onClick={() => remove(name)}
                            style={{ alignSelf: 'center' }}
                          />
                        </div>
                      ))}
                      <Form.Item>
                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                          {t('shelf.cargo_mission.add_relationship')}
                        </Button>
                      </Form.Item>
                    </>
                  )}
                </Form.List>
              </Form.Item>
            </Form>
          </Card>
        </Modal>
      ) : (
        []
      )}
    </>
  );
};

export default ShelfDrawer;
