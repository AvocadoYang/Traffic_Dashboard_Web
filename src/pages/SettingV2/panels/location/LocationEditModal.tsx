import { FC, useEffect } from "react";
import { Form, Input, InputNumber, Modal, Select, Switch, message } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import useAllAreaTypes from "@/api/useAllAreaTypes";
import { WORK_AREA_CONFIG_KEY } from "@/api/useWorkAreas";
import client from "@/api/axiosClient";
import { locationOption } from "@/pages/Setting/utils/func";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { ErrorResponse } from "@/utils/globalType";
import { editErrorHandler } from "@/utils/utils";
import { Field, FieldLabel, FieldGrid, Hint } from "../../ui/primitives";
import WaitPointFields, { waitPointPayload } from "../../ui/waitPointFields";

/** 有設備設定 (名稱、群組、規則…) 的點位類型; 從這些類型換走, 設定會被清掉 */
const DEVICE_AREA_TYPES = [
  "STORAGE",
  "CONVEYOR",
  "STACK",
  "ELEVATOR",
  "CHARGING",
  "LIFT_GATE",
  "GATE_WAIT_POINT",
  "PACKAGE",
  "PACKAGE_IN",
  "PACKAGE_OUT",
];

export type LocationRow = {
  id: string;
  locationId: string;
  x: string;
  y: string;
  offset_x?: number;
  offset_y?: number;
  rotate?: number;
  canRotate?: boolean;
  areaType: string;
  ip?: string | null;
  wait_area_id?: string | null;
  wait_order?: number;
  rev?: string;
  mapFileName: string;
  groupName: string;
  isActiveGroup: boolean;
};

type Props = {
  /** 要編輯的點位; null 就是關著 */
  location: LocationRow | null;
  onClose: () => void;
};

/**
 * 編輯點位的視窗。地點表的編輯鈕、設定頁地圖上點位的下拉選單都開這一個,
 * 兩邊改出來的結果才會一樣。
 */
const LocationEditModal: FC<Props> = ({ location, onClose }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  // 用 hook 版的 confirm, 確認視窗才會跟著設定頁的主題
  const [modal, modalHolder] = Modal.useModal();
  const [editForm] = Form.useForm();

  const { data: areaTypes } = useAllAreaTypes();
  const currentMapId = useAtomValue(currentMapIdAtom);

  // 編輯視窗裡現在選的類型; 跟原本不一樣就是要換類型
  const pickedAreaType = Form.useWatch("areaType", editForm) as
    | string
    | undefined;
  const editingAreaType = pickedAreaType ?? location?.areaType;
  const losesDeviceSetting =
    !!location &&
    editingAreaType !== location.areaType &&
    DEVICE_AREA_TYPES.includes(location.areaType);

  useEffect(() => {
    if (!location) return;
    editForm.setFieldsValue({
      locationId: location.locationId,
      x: Number(location.x),
      y: Number(location.y),
      offset_x: location.offset_x ?? 0,
      offset_y: location.offset_y ?? 0,
      rotate: location.rotate ?? 0,
      canRotate: location.canRotate ?? false,
      areaType: location.areaType,
      ip: location.ip ?? "",
      wait_area_id: location.wait_area_id ?? undefined,
      wait_order: location.wait_order ?? 0,
    });
  }, [location, editForm]);

  const invalidate = () => {
    queryClient.refetchQueries({ queryKey: ["map"] });
    queryClient.refetchQueries({ queryKey: ["active-group-resources"] });
    queryClient.refetchQueries({ queryKey: ["all-groups-resources"] });
    void queryClient.invalidateQueries({ queryKey: WORK_AREA_CONFIG_KEY });
  };

  const editMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      client.post("api/setting/edit-edit-loc", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      invalidate();
      onClose();
    },
    onError: (e: ErrorResponse) =>
      editErrorHandler(e, messageApi, () => {
        invalidate();
        onClose();
      }),
  });

  const submitEdit = () => {
    if (!location) return;
    const values = editForm.getFieldsValue() as Record<string, unknown>;
    const areaType =
      (values.areaType as string | undefined) ?? location.areaType;
    const save = () =>
      editMutation.mutate({
        ...values,
        areaType,
        id: location.id,
        rev: location.rev,
        oldLocationId: location.locationId,
        newLocationId: values.locationId,
        map_id: currentMapId,
        currentMapId,
        // 能不能當等待點看的是換完之後的類型
        ...waitPointPayload(areaType, values),
      });

    // 原本的類型沒有設備設定 (路徑點、待命區…), 換類型不會丟東西, 直接存
    if (!losesDeviceSetting) {
      save();
      return;
    }
    modal.confirm({
      title: t("edit_location_panel.change_type.title", {
        id: location.locationId,
        from: locationOption(location.areaType),
        to: locationOption(areaType),
      }),
      content: t("edit_location_panel.change_type.content"),
      okText: t("utils.confirm"),
      cancelText: t("utils.cancel"),
      onOk: save,
    });
  };

  return (
    <>
      {contextHolder}
      {modalHolder}
      <Modal
        open={!!location}
        title={`${t("utils.edit")} — ${location?.locationId ?? ""}`}
        onCancel={onClose}
        onOk={submitEdit}
        confirmLoading={editMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical">
          <FieldGrid $cols={2}>
            <Field>
              <FieldLabel>{t("utils.location")} ID</FieldLabel>
              <Form.Item name="locationId" noStyle>
                <Input />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("utils.point_type")}</FieldLabel>
              <Form.Item name="areaType" noStyle>
                <Select
                  options={areaTypes?.map((a) => ({
                    value: a.value,
                    label: locationOption(a.value),
                  }))}
                />
              </Form.Item>
              {losesDeviceSetting ? (
                <Hint>{t("edit_location_panel.change_type.hint")}</Hint>
              ) : null}
            </Field>
            <Field>
              <FieldLabel>X</FieldLabel>
              <Form.Item name="x" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>Y</FieldLabel>
              <Form.Item name="y" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("setting_v2.location.offset_x")}</FieldLabel>
              <Form.Item name="offset_x" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("setting_v2.location.offset_y")}</FieldLabel>
              <Form.Item name="offset_y" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>θ</FieldLabel>
              <Form.Item name="rotate" noStyle>
                <InputNumber min={-360} max={360} style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("edit_location_panel.can_rotate")}</FieldLabel>
              <Form.Item name="canRotate" valuePropName="checked" noStyle>
                <Switch size="small" />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>IP</FieldLabel>
              <Form.Item name="ip" noStyle>
                <Input />
              </Form.Item>
            </Field>
          </FieldGrid>
          <FieldGrid $cols={2} style={{ marginTop: 16 }}>
            <WaitPointFields areaType={editingAreaType} />
          </FieldGrid>
        </Form>
      </Modal>
    </>
  );
};

export default LocationEditModal;
