import useAMRsample from '@/api/useAMRsample';
import useCategory from '@/api/useCategory';
import useMissionTitleById from '@/api/useMissionTitleById';
import { Flex, Form, FormInstance, Input, message, Modal, Select, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Dispatch, FC, SetStateAction, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MissionListType } from './mission';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/api/axiosClient';

const MissionForm: FC<{
  openMissionModel: boolean;
  setOpenMissionModel: Dispatch<SetStateAction<boolean>>;
  editMissionKey: string;
  formMission: FormInstance<unknown>;
}> = ({ editMissionKey, formMission, openMissionModel, setOpenMissionModel }) => {
  const { data: cat } = useCategory();
  const { data: amrs } = useAMRsample();
  const { data: mission } = useMissionTitleById(editMissionKey);
  const [canBeCreate, setCanBeCreate] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const [tag, setTag] = useState<string[]>([]);
  const newCarList = amrs?.map((v) => ({ label: v.name, value: v.id })) || [];

  const catOption = cat?.map((v) => ({ value: v.id, label: v.tagName })) || [];

  const { t } = useTranslation();

  const editMutation = useMutation(
    (editValue: MissionListType) => client.post('api/setting/update-mission-title', editValue),
    {
      onSuccess: async () => {
        await queryClient.refetchQueries({ queryKey: ['all-mission-title-detail'] });
        await queryClient.refetchQueries({ queryKey: ['all-mission-title'] });
        setOpenMissionModel(false);
        messageApi.success(t('utils.success'));
      }
    }
  );

  useEffect(() => {
    if (!mission) return;
    const tags = mission.MissionTitleBridgeCategory?.map((v) => v.Category?.id) || [];
    setTag(tags);
    formMission.setFieldsValue({
      name: mission?.name,
      robot_type_id: mission?.Robot_types?.id,
      category: tags
    });
  }, [mission, formMission]);

  useEffect(() => {
    const getName = tag.map((v) => {
      const c = catOption.find((f) => f.value === v);
      return c?.label || '';
    });

    const hasNormal = getName.includes('normal-mission');
    const hasDynamic = getName.includes('dynamic-mission');

    if ((hasNormal || hasDynamic) && !(hasNormal && hasDynamic)) {
      setCanBeCreate(true);
    } else {
      setCanBeCreate(false);
    }
  }, [tag]);

  const handleOk = () => {
    if (!canBeCreate) {
      messageApi.warning(t('mission.add_mission.tag_warn'));
      return;
    }

    const editData = formMission.getFieldsValue() as MissionListType;

    if (!editData.name || editData.name.trim() === '') {
      messageApi.warning(t('mission.add_mission.name_warn'));
      return;
    }
    if (!editData.robot_type_id || editData.robot_type_id.trim() === '') {
      messageApi.warning(t('mission.add_mission.car_warn'));
      return;
    }

    editMutation.mutate({ ...editData, key: editMissionKey });
  };

  return (
    <>
      {contextHolder}

      <Modal
        title={t('mission.add_mission.title')}
        open={openMissionModel}
        onOk={handleOk}
        onCancel={() => setOpenMissionModel(false)}
      >
        <Form form={formMission} autoComplete="off">
          <Form.Item
            rules={[{ required: true, message: t('mission.add_mission.name_warn') }]}
            label={t('mission.add_mission.name')}
            name="name"
            hasFeedback
          >
            <Input />
          </Form.Item>

          <Form.Item
            hasFeedback
            rules={[{ required: true, message: t('mission.add_mission.car_warn') }]}
            label={t('mission.add_mission.car')}
            name="robot_type_id"
          >
            <Select options={newCarList} />
          </Form.Item>

          <Flex gap="middle" align="center">
            <Form.Item
              label={t('mission.add_mission.tag')}
              name="category"
              style={{ marginBottom: 0, flex: 1 }}
            >
              <Select mode="multiple" options={catOption} onChange={(v) => setTag(v)} />
            </Form.Item>
            <Tooltip title={t('mission.add_mission.tag_info')}>
              <InfoCircleOutlined />
            </Tooltip>
          </Flex>
        </Form>
      </Modal>
    </>
  );
};

export default MissionForm;
