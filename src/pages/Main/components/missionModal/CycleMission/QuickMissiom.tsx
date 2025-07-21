import { Button, Form, message, Modal, Radio, Select, Tag } from 'antd';
import { useAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { OpenQuickMission } from '../../../global/jotai';
import useName from '@/api/useAmrName';
import { useEffect, useMemo, useState } from 'react';
import useShelvesInfo from '@/api/useShelvesInfo';
import { useMutation } from '@tanstack/react-query';
import client from '@/api/axiosClient';
import { errorHandler } from '@/utils/utils';
import { ErrorResponse } from '@/utils/globalType';

enum MissionPriority {
  TRIVIAL, //沒差最後再做
  NORMAL, //普通
  PIVOTAL, //特別優先
  CRITICAL // 緊急
}
type AssignPayload = {
  missionType: 'normal' | 'load' | 'offload';
  columnName: string;
  locationId: string;
  level: number;
};

type QuickMissionType = {
  amrId: string;
  priority: number;
  task: AssignPayload[];
};

const QuickMission = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [loadShelf, setLoadShelf] = useState<{ label: string; value: string }[]>([]);
  const [offLoadShelf, setOffLoadShelf] = useState<{ label: string; value: string }[]>([]);
  const [form] = Form.useForm();
  const { data: name } = useName();
  const [, setAmrGenre] = useState<string | null>(null);
  const { data: shelves } = useShelvesInfo();
  const [openQuickMission, setOpenQuickMission] = useAtom(OpenQuickMission);

  useEffect(() => {
    if (!shelves || !shelves.length) {
      return;
    }

    const loadShelves = shelves
      .filter((shelf) => shelf.hasCargo)
      .map((shelf) => {
        const columnName = shelf.columnName || 'X';
        const label = `${columnName}-${shelf.locationId}-${shelf.level}`;
        return {
          value: label,
          label
        };
      });

    setLoadShelf(loadShelves);
    const offLoadShelves = shelves
      .filter((shelf) => !shelf.hasCargo)
      .map((shelf) => {
        const columnName = shelf.columnName || 'X';
        const label = `${columnName}-${shelf.locationId}-${shelf.level}`;
        return {
          value: label,
          label
        };
      });

    setOffLoadShelf(offLoadShelves);
  }, [shelves]);

  const AmrOption: { value: null | string; label: string }[] = useMemo(() => {
    return (
      name?.amrs
        .filter((a) => a.isReal === true)
        .map((m) => ({
          label: `${m.amrId} ${m.isReal ? [] : <Tag>{`${t('simulate')}`}</Tag>}`,
          value: m.amrId
        })) || []
    );
  }, [name]);

  AmrOption.unshift({ value: '*', label: t('utils.random') });

  const submitMutation = useMutation({
    mutationFn: (data: QuickMissionType) => {
      return client.post('api/missions/fast-mission', data, {
        headers: { authorization: `Bearer ${localStorage.getItem('_KMT')}` }
      });
    },
    onSuccess: () => {
      form.resetFields();
      void messageApi.open({
        type: 'success',
        content: t('utils.success')
      });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const handleCancel = () => {
    setOpenQuickMission(false);
  };

  const submit = () => {
    const { load, offload, amrId, priority } = form.getFieldsValue();
    if (!load || !offload || !amrId || !priority) {
      void messageApi.warning('欄位尚未填寫完整');
      return;
    }
    const loadInfo = (load as string).split('-');
    const loadShelf = {
      missionType: 'load',
      columnName: loadInfo[0] == 'X' ? '' : loadInfo[0],
      locationId: loadInfo[1],
      level: Number(loadInfo[2])
    };

    const offloadInfo = (offload as string).split('-');
    const offloadShelf = {
      missionType: 'offload',
      columnName: offloadInfo[0] == 'X' ? '' : offloadInfo[0],
      locationId: offloadInfo[1],
      level: Number(offloadInfo[2])
    };

    const quickMission = {
      amrId,
      priority,
      task: [loadShelf, offloadShelf] as AssignPayload[]
    };
    submitMutation.mutate(quickMission);
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={t('main.card_name.quick_mission')}
        open={openQuickMission}
        onClose={handleCancel}
        footer={[
          <Button key="submit" color="primary" variant="filled" onClick={submit}>
            {t('utils.submit')}
          </Button>
        ]}
        onCancel={handleCancel}
        style={{ fontWeight: 'bold' }}
      >
        <Form form={form}>
          <Form.Item label={`${t('mission.cycle_mission.car')} `} name="amrId">
            <Select
              options={AmrOption}
              onChange={(v: string) => setAmrGenre(v)}
              placeholder={'Select an AMR'}
              onMouseDown={(e) => e.preventDefault()}
              onPopupScroll={(e) => {
                e.stopPropagation();
              }}
              onDropdownVisibleChange={(open) => {
                if (open) {
                  document.body.style.overflow = 'hidden';
                } else {
                  document.body.style.overflow = 'auto';
                }
              }}
            />
          </Form.Item>
          <Form.Item
            label={`${t('main.mission_modal.dialog_mission.task_priority')} `}
            name="priority"
            shouldUpdate
          >
            <Radio.Group>
              <Radio.Button value={MissionPriority.CRITICAL}>
                {t('main.mission_modal.dialog_mission.priority.CRITICAL')}
              </Radio.Button>
              <Radio.Button value={MissionPriority.PIVOTAL}>
                {t('main.mission_modal.dialog_mission.priority.PIVOTAL')}
              </Radio.Button>
              <Radio.Button value={MissionPriority.NORMAL}>
                {t('main.mission_modal.dialog_mission.priority.NORMAL')}
              </Radio.Button>
              <Radio.Button value={MissionPriority.TRIVIAL}>
                {t('main.mission_modal.dialog_mission.priority.TRIVIAL')}
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item label={t('car_control_translate.load')} name={'load'}>
            <Select
              placeholder={'Select a load shelf'}
              style={{ width: '100%' }}
              options={loadShelf}
              onMouseDown={(e) => e.preventDefault()}
              onDropdownVisibleChange={(open) => {
                if (open) {
                  document.body.style.overflow = 'hidden';
                } else {
                  document.body.style.overflow = 'auto';
                }
              }}
              onPopupScroll={(e) => {
                e.stopPropagation();
              }}
            />
          </Form.Item>

          <Form.Item label={t('car_control_translate.offload')} name={'offload'}>
            <Select
              placeholder={'Select a offload shelf'}
              style={{ width: '100%' }}
              options={offLoadShelf}
              onMouseDown={(e) => e.preventDefault()}
              onDropdownVisibleChange={(open) => {
                if (open) {
                  document.body.style.overflow = 'hidden';
                } else {
                  document.body.style.overflow = 'auto';
                }
              }}
              onPopupScroll={(e) => {
                e.stopPropagation();
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default QuickMission;
