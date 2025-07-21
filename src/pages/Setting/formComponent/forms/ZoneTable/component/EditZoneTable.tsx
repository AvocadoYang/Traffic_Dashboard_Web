import {
  Badge,
  Button,
  Checkbox,
  ColorPicker,
  ConfigProvider,
  Flex,
  Form,
  Input,
  Select,
  SelectProps,
  Space,
  Tag,
  message,
  InputNumber
} from 'antd';
import '../../form.css';
import { CloseOutlined } from '@ant-design/icons';
import { FC, memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ZoneTableData } from '../../antd';
import useAmrName from '@/api/useAmrName';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/api/axiosClient';
import { ErrorResponse } from '@/utils/globalType';
import { errorHandler } from '@/utils/utils';
import useMap from '@/api/useMap';
import useLoc, { LocWithoutArr } from '@/api/useLoc';

type FormType = {
  id?: string;
  name: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  category: string[] | undefined;

  hight_limit: number | undefined;
  speed_limit: number | undefined;
  limitNum: number | undefined;
  all_forbidden: boolean | undefined;
  not_forbidden: boolean | undefined;
  view_available: string | undefined;
  forbidden: string[] | undefined;
  color: string;
};

type TagSetting = {
  allVehicleForbidden: boolean;
  notVehicleForbidden: boolean;
  forbidden: string[];
  speed_limit: number | undefined;
  hight_limit: number | undefined;
  limitNum: number | undefined;
  view_available: string | undefined;
};

const tagInit = {
  allVehicleForbidden: false,
  notVehicleForbidden: false,
  forbidden: [],
  speed_limit: undefined,
  hight_limit: undefined,
  limitNum: undefined,
  view_available: undefined
};

type TagRender = SelectProps['tagRender'];
const tagRender: TagRender = (props) => {
  const { label, closable, onClose } = props;
  const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  return (
    <Tag
      color={'cyan'}
      onMouseDown={onPreventMouseDown}
      closable={closable}
      onClose={onClose}
      style={{ marginInlineEnd: 4 }}
    >
      {label}
    </Tag>
  );
};

const EditZoneTable: FC<{
  setEditingKey: React.Dispatch<React.SetStateAction<string | null>>;
  editingKey: string;
  oldData: ZoneTableData | null;
  sortableId: string;
}> = ({ setEditingKey, editingKey, oldData }) => {
  const [editZoneForm] = Form.useForm();
  const [showTagSetting, setShowTagSetting] = useState(false);
  const [isHint, setIsHint] = useState(false);
  const [tagsSetting, setTagSetting] = useState<TagSetting>(tagInit);
  const [zoneTags, setZoneTags] = useState<string[]>([]);
  const [messageApi, contextHolders] = message.useMessage();
  const { data: loc } = useLoc(undefined);
  const { data: allAmr } = useAmrName();
  const { data: mapData } = useMap();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const viewAvailableOption = useMemo(() => {
    const info = loc as LocWithoutArr[];
    const mixData = info
      .filter((v) => v.areaType !== 'Storage')
      .sort((a, b) => Number(a.locationId) - Number(b.locationId))
      .map((v) => ({
        label: v.locationId,
        value: v.locationId
      }));
    return mixData;
  }, [loc, t]);

  const zoneType: SelectProps['options'] = [
    { label: `${t('edit_zone_panel.deceleration_zone')}`, value: '減速區' },
    { label: `${t('edit_zone_panel.height_limit_zone')}`, value: '限高區' },
    { label: `${t('edit_zone_panel.restricted_zone')}`, value: '禁止區' },
    { label: `${t('edit_zone_panel.controlled_zone')}`, value: '限制區' },
    { label: `${t('edit_zone_panel.view_available_zone')}`, value: '查看區' }
  ];

  const AmrsID: SelectProps['options'] = allAmr?.amrs.map((amr) => {
    return { value: amr.amrId };
  });

  const saveMutation = useMutation({
    mutationFn: (payload: FormType) => {
      return client.post('api/setting/edit-edit-zone', payload);
    },
    onSuccess: () => {
      void messageApi.success('success');
      queryClient.refetchQueries({ queryKey: ['map'] });
      // setEditingKey(null);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi)
  });

  const save = () => {
    if (isHint) {
      messageApi.warning(t('edit_zone_panel.waring.tag_not_yet_setting'));
      return;
    }
    const data = editZoneForm.getFieldsValue() as FormType;
    const { name, startX, startY, endX, endY, color } = data;
    if (!name || name.trim() === '') {
      messageApi.warning(t('edit_zone_panel.waring.name_empty_error'));
      return;
    }
    if (!startX || !startY || !endX || !endY) {
      messageApi.warning(t('edit_zone_panel.waring.invalid_frame'));
      return;
    }
    if (!color) {
      messageApi.warning(t('edit_zone_panel.waring.color_error'));
      return;
    }
    const exists = mapData!.zones.some((zone) => {
      return zone.name.trim() === name.trim() && oldData?.id !== zone.id;
    });
    if (exists) {
      messageApi.warning(t('edit_zone_panel.waring.name_duplicated_error'));
      return;
    }

    let forbiddenCars: string[] = [];

    if (
      data.category?.includes('禁止區') &&
      !data.all_forbidden &&
      !data.not_forbidden &&
      !data.forbidden?.length
    ) {
      messageApi.warning(t('edit_zone_panel.waring.tag_not_yet_setting'));
      return;
    }

    if (data.all_forbidden) {
      forbiddenCars = ['*'];
    } else if (data.not_forbidden) {
      forbiddenCars = [];
    } else {
      forbiddenCars = data.forbidden as string[];
    }

    const payload: FormType = {
      ...data,
      speed_limit: data.speed_limit
        ? data.speed_limit
        : (oldData?.tagSetting.speed_limit as number),
      hight_limit: data.hight_limit
        ? data.hight_limit
        : (oldData?.tagSetting.hight_limit as number),
      limitNum: data.limitNum ? data.limitNum : (oldData?.tagSetting.limitNum as number),
      forbidden: forbiddenCars,
      view_available: data.view_available
        ? data.view_available
        : (oldData?.tagSetting.view_available as string),
      id: editingKey,
      color: data.color
    };
    saveMutation.mutate(payload);
  };

  // 將資料庫資料寫入各個 input. 另外將資料複製一份到即將修改的表單中
  useEffect(() => {
    if (!oldData) return;

    setZoneTags(oldData.category);
    const forbiddenCar = oldData.tagSetting.forbidden_car;

    const tagSetting: TagSetting = {
      allVehicleForbidden: false,
      notVehicleForbidden: false,
      forbidden: [],
      limitNum: undefined,
      hight_limit: undefined,
      speed_limit: undefined,
      view_available: undefined
    };

    if (forbiddenCar.length) {
      tagSetting.allVehicleForbidden = false;
      tagSetting.notVehicleForbidden = false;
      editZoneForm.setFieldValue('forbidden', oldData.tagSetting.forbidden_car);
      tagSetting.forbidden = forbiddenCar;
    } else {
      if (!oldData.category.includes('限制區')) {
        tagSetting.allVehicleForbidden = false;
        tagSetting.notVehicleForbidden = false;
        editZoneForm.setFieldValue('not_forbidden', false);
        editZoneForm.setFieldValue('all_forbidden', false);
      } else if (oldData.tagSetting.forbidden_car.includes('*')) {
        tagSetting.allVehicleForbidden = true;
        tagSetting.notVehicleForbidden = false;
        editZoneForm.setFieldValue('not_forbidden', false);
        editZoneForm.setFieldValue('all_forbidden', true);
      } else {
        tagSetting.allVehicleForbidden = false;
        tagSetting.notVehicleForbidden = true;
        editZoneForm.setFieldValue('not_forbidden', true);
        editZoneForm.setFieldValue('all_forbidden', false);
      }
      editZoneForm.setFieldValue('forbidden', []);
    }

    editZoneForm.setFieldValue('name', oldData.name);
    editZoneForm.setFieldValue('startX', oldData.startPoint.startX);
    editZoneForm.setFieldValue('startY', oldData.startPoint.startY);
    editZoneForm.setFieldValue('endX', oldData.endPoint.endX);
    editZoneForm.setFieldValue('endY', oldData.endPoint.endY);
    editZoneForm.setFieldValue('category', oldData.category);
    editZoneForm.setFieldValue('hight_limit', oldData.tagSetting.hight_limit);
    editZoneForm.setFieldValue('speed_limit', oldData.tagSetting.speed_limit);
    editZoneForm.setFieldValue('limitNum', oldData.tagSetting.limitNum);
    editZoneForm.setFieldValue('color', oldData.backgroundColor);
    editZoneForm.setFieldValue('view_available', oldData.tagSetting.view_available);

    tagSetting.limitNum = oldData.tagSetting.limitNum as number | undefined;
    tagSetting.hight_limit = oldData.tagSetting.hight_limit as number | undefined;
    tagSetting.speed_limit = oldData.tagSetting.speed_limit as number | undefined;
    tagSetting.view_available = oldData.tagSetting.view_available as string | undefined;

    setTagSetting(tagSetting);
  }, [oldData, editZoneForm]);

  useEffect(() => {
    if (!tagsSetting) return;
    const {
      limitNum,
      hight_limit,
      speed_limit,
      allVehicleForbidden,
      notVehicleForbidden,
      view_available
    } = tagsSetting;

    if (zoneTags.length === 0) return setIsHint(false);

    if (
      zoneTags.includes('禁止區') &&
      !(
        allVehicleForbidden ||
        notVehicleForbidden ||
        (editZoneForm.getFieldValue('forbidden') && editZoneForm.getFieldValue('forbidden').length)
      )
    ) {
      setIsHint(true);
      return;
    }

    if (zoneTags.includes('減速區') && speed_limit == null) {
      setIsHint(true);
      return;
    }

    if (zoneTags.includes('限高區') && hight_limit == null) {
      setIsHint(true);
      return;
    }

    if (zoneTags.includes('限制區') && limitNum == null) {
      setIsHint(true);
      return;
    }

    if (zoneTags.includes('查看區') && view_available == null) {
      setIsHint(true);
      return;
    }

    setIsHint(false);
  }, [tagsSetting, zoneTags, editZoneForm, t]);

  const tagChangeFn = useCallback(
    (tags) => {
      setZoneTags((pre) => {
        pre.forEach((tag) => {
          if (!tags.includes(tag)) {
            switch (tag) {
              case '減速區':
                setTagSetting((pre) => ({ ...pre, speed_limit: undefined }));
                editZoneForm.setFieldValue('speed_limit', undefined);
                break;
              case '限高區':
                setTagSetting((pre) => ({ ...pre, hight_limit: undefined }));
                editZoneForm.setFieldValue('hight_limit', undefined);
                break;
              case '禁止區':
                setTagSetting((pre) => ({
                  ...pre,
                  allVehicleForbidden: false,
                  notVehicleForbidden: false
                }));
                editZoneForm.setFieldValue('forbidden', []);
                editZoneForm.setFieldValue('all_forbidden', false);
                editZoneForm.setFieldValue('not_forbidden', false);
                break;
              case '限制區':
                setTagSetting((pre) => ({ ...pre, limitNum: undefined }));
                editZoneForm.setFieldValue('limitNum', undefined);
                break;
              case '查看區':
                setTagSetting((pre) => ({ ...pre, view_available: undefined }));
                editZoneForm.setFieldValue('view_available', undefined);
                break;
            }
          }
        });
        return tags;
      });
    },
    [zoneTags, editZoneForm]
  );

  if (!oldData) return;
  return (
    <>
      {contextHolders}
      <Flex gap="middle" justify="flex-start" align="start" vertical>
        <Space size={'middle'}>
          <Button color="danger" variant="filled" onClick={() => setEditingKey(null)}>
            {t('utils.cancel')}
          </Button>
          <Button color="primary" variant="filled" onClick={() => save()}>
            {t('utils.save')}
          </Button>
        </Space>
        <Form layout="vertical" form={editZoneForm} style={{ fontWeight: 'bold' }}>
          <Form.Item label={t('edit_zone_panel.name')} name="name" style={{ marginBottom: 16 }}>
            <Input
              // value={oldData.name}
              type="string"
              style={{ width: 150 }}
              placeholder="請輸入區域名稱"
            />
          </Form.Item>
          <Space size={'large'} style={{ marginBottom: '15px', overflow: 'hidden' }}>
            <div>
              <Form.Item
                label={
                  <Badge key={'geekblue1'} color={'geekblue'} text={t('edit_zone_panel.start_x')} />
                }
                name="startX"
                style={{ marginBottom: 16 }}
              >
                <Input type="number" disabled />
              </Form.Item>
              <Form.Item
                label={<Badge key={'red1'} color={'red'} text={t('edit_zone_panel.end_x')} />}
                name="endX"
                style={{ marginBottom: 16 }}
              >
                <Input type="number" disabled />
              </Form.Item>
            </div>
            <div>
              <Form.Item
                label={
                  <Badge key={'geekblue2'} color={'geekblue'} text={t('edit_zone_panel.start_y')} />
                }
                name="startY"
                style={{ marginBottom: 16 }}
              >
                <Input type="number" disabled />
              </Form.Item>

              <Form.Item
                label={<Badge key={'red2'} color={'red'} text={t('edit_zone_panel.end_y')} />}
                name="endY"
                style={{ marginBottom: 16 }}
              >
                <Input type="number" disabled />
              </Form.Item>
            </div>
          </Space>
          <Form.Item
            label={t('edit_zone_panel.category')}
            name="category"
            style={{ marginBottom: `${zoneTags?.length ? '5px' : '20px'}` }}
          >
            <Select
              // value={oldData.category}
              placeholder={'請選擇區域屬性'}
              mode="multiple"
              tagRender={tagRender}
              style={{ width: '100%' }}
              options={zoneType}
              onChange={(tags) => {
                tagChangeFn(tags);
              }}
            />
          </Form.Item>
          {zoneTags?.length ? (
            <Form.Item style={{ textAlign: 'left', marginBottom: '8px' }}>
              <Space>
                {isHint ? <p style={{ color: 'red' }}>{t('edit_zone_panel.hint')}</p> : <p>✅</p>}
                <ConfigProvider
                  theme={{
                    components: {
                      Button: {
                        defaultBorderColor: 'orange'
                      }
                    }
                  }}
                >
                  <Button onClick={() => setShowTagSetting(!showTagSetting)} size="small">
                    {t('edit_zone_panel.tag_setting')}
                  </Button>
                </ConfigProvider>
              </Space>
            </Form.Item>
          ) : (
            []
          )}
          <Form.Item
            getValueFromEvent={(color) => {
              if (color && color.toRgb) {
                const { r, g, b } = color.toRgb();
                return `rgba(${r}, ${g}, ${b}, 0.05)`;
              }
              return color;
            }}
            label={t('edit_zone_panel.color')}
            name="color"
          >
            <ColorPicker
              showText
              // onChange={(e) => {
              //   const { r, g, b } = e.toRgb();
              // }}
            />
          </Form.Item>

          <div
            className={`tag-setting-wrap ${showTagSetting && zoneTags.length ? 'tag-setting-wrap-show' : ''}`}
            style={{ borderTop: `5px solid #315E7D` }}
          >
            <CloseOutlined
              onClick={() => setShowTagSetting(false)}
              className="form-close-btn"
              style={{ position: 'absolute', right: '1em', top: '1em' }}
            />
            <h3 style={{ width: '100%', textAlign: 'left', marginBottom: '12px' }}>
              {t('edit_zone_panel.tag_setting')}
            </h3>

            <Form.Item
              name="speed_limit"
              label={`${t('edit_zone_panel.highest_speed')}: (${t('edit_zone_panel.necessary')}) `}
              style={{
                display: `${zoneTags?.includes('減速區') ? '' : 'none'}`,
                boxShadow: '3px 3px 15px rgba(0, 0, 0, 0.05)',
                borderLeft: '4px solid #8491ea',
                padding: '10px',
                borderRadius: '5px'
              }}
              rules={[{ required: true }]}
            >
              <InputNumber
                addonAfter="m/s"
                onChange={(e) => {
                  setTagSetting((pre) => {
                    if (!e) return { ...pre, speed_limit: undefined };
                    return { ...pre, speed_limit: e as number };
                  });
                }}
                type="number"
                min={0.8}
                max={1.5}
                placeholder="0.8~1.5"
                style={{ width: '50%' }}
              />
            </Form.Item>

            <Form.Item
              name="hight_limit"
              label={`${t('edit_zone_panel.hight_limit')}: (${t('edit_zone_panel.necessary')})`}
              style={{
                display: `${zoneTags?.includes('限高區') ? '' : 'none'}`,
                boxShadow: '3px 3px 15px rgba(0, 0, 0, 0.05)',
                borderLeft: '4px solid #8491ea',
                padding: '10px',
                borderRadius: '5px'
              }}
              rules={[{ required: true }]}
            >
              <InputNumber
                addonAfter="mm"
                onChange={(e) => {
                  setTagSetting((pre) => {
                    if (!e) return { ...pre, hight_limit: undefined };
                    return { ...pre, hight_limit: e as number };
                  });
                }}
                type="number"
                placeholder="請輸入高度限制"
                style={{ width: '50%' }}
              />
            </Form.Item>

            <Form.Item
              name="limitNum"
              label={`${t('edit_zone_panel.limit_count')}: `}
              style={{
                display: `${zoneTags?.includes('限制區') ? '' : 'none'}`,
                boxShadow: '3px 3px 15px rgba(0, 0, 0, 0.05)',
                borderLeft: '4px solid #8491ea',
                padding: '10px',
                borderRadius: '5px',
                marginBottom: '10px'
              }}
              rules={[{ required: true }]}
            >
              <InputNumber
                onChange={(e) => {
                  setTagSetting((pre) => {
                    if (!e) return { ...pre, limitNum: undefined };
                    return { ...pre, limitNum: e as number };
                  });
                }}
                type="number"
                placeholder={t('edit_zone_panel.placeholder.limit')}
                style={{ width: '50%' }}
              />
            </Form.Item>

            <Form.Item
              name="view_available"
              label={`${t('edit_zone_panel.view_available')}: (${t('edit_zone_panel.necessary')})`}
              style={{
                display: `${zoneTags?.includes('查看區') ? '' : 'none'}`,
                boxShadow: '3px 3px 15px rgba(0, 0, 0, 0.05)',
                borderLeft: '4px solid #8491ea',
                padding: '10px',
                borderRadius: '5px',
                marginBottom: '10px'
              }}
              rules={[
                { required: zoneTags?.includes('查看區'), message: t('edit_zone_panel.necessary') }
              ]}
            >
              <Select
                placeholder={t('edit_zone_panel.placeholder.view_available')}
                style={{ width: '50%' }}
                options={viewAvailableOption}
                onChange={(value) => {
                  setTagSetting((pre) => ({
                    ...pre,
                    view_available: value || undefined
                  }));
                  editZoneForm.setFieldValue('view_available', value || undefined);
                }}
              />
            </Form.Item>

            <div
              style={{
                boxShadow: '3px 3px 15px rgba(0, 0, 0, 0.05)',
                borderLeft: '4px solid #8491ea',
                padding: '10px',
                borderRadius: '5px',
                margin: '10px 0 20px 0',
                display: `${zoneTags?.includes('禁止區') ? '' : 'none'}`
              }}
            >
              <Space>
                <Form.Item valuePropName="checked" name="not_forbidden" style={{ margin: '0' }}>
                  <Checkbox
                    checked={tagsSetting.notVehicleForbidden}
                    disabled={tagsSetting.allVehicleForbidden}
                    onChange={(e) => {
                      setTagSetting((pre) => {
                        return { ...pre, notVehicleForbidden: e.target.checked };
                      });
                      editZoneForm.setFieldValue('forbidden', []);
                    }}
                  >{`${t('edit_zone_panel.not_vehicle_forbidden')}`}</Checkbox>
                </Form.Item>
                <Form.Item valuePropName="checked" name="all_forbidden" style={{ margin: '0' }}>
                  <Checkbox
                    checked={tagsSetting.allVehicleForbidden}
                    disabled={tagsSetting.notVehicleForbidden}
                    onChange={(e) => {
                      setTagSetting((pre) => {
                        return { ...pre, allVehicleForbidden: e.target.checked };
                      });
                      editZoneForm.setFieldValue('forbidden', []);
                    }}
                  >{`${t('edit_zone_panel.all_vehicle_forbidden')}`}</Checkbox>
                </Form.Item>
              </Space>
              <Form.Item name="forbidden" label={`${t('edit_zone_panel.forbidden_vehicle')}: `}>
                <Select
                  placeholder={'請選擇限制進入車輛'}
                  disabled={tagsSetting.allVehicleForbidden || tagsSetting.notVehicleForbidden}
                  mode={'multiple'}
                  tagRender={tagRender}
                  style={{ width: '100%' }}
                  onChange={(e) => {
                    editZoneForm.setFieldValue('forbidden', e);
                    setTagSetting((pre) => {
                      return { ...pre, forbidden: e };
                    });
                  }}
                  options={AmrsID}
                />
              </Form.Item>
            </div>
          </div>
        </Form>
      </Flex>
    </>
  );
};

export default memo(EditZoneTable);
