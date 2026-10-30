import { FC, useEffect, useMemo } from "react";
import { ColorPicker, Form, InputNumber, Modal, message } from "antd";
import type { MessageInstance } from "antd/es/message/interface";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import useAllGroupsResources from "@/api/useAllGroupsResources";
import client from "@/api/axiosClient";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { ErrorResponse } from "@/utils/globalType";
import { editErrorHandler } from "@/utils/utils";
import ZoneFields, { zoneColorFromPicker } from "../../ui/zoneFields";
import { LinkMap } from "../../ui/zoneLinks";
import { FieldGrid, Field, FieldLabel } from "../../ui/primitives";

export type ZoneRow = {
  id: string;
  name: string;
  backgroundColor: string;
  category: string[];
  layer: string;
  lidar_front: boolean;
  lidar_back: boolean;
  disabled?: boolean;
  tagSetting?: {
    speed_limit?: number | null;
    hight_limit?: number | null;
    forbidden_car?: string[];
    limitNum?: number | null;
    view_available?: number | null;
    elevator_id?: string | null;
    splice_id?: string | null;
  };
  startPoint: { startX: number; startY: number };
  endPoint: { endX: number; endY: number };
  rev?: string;
  mapId: string;
  mapFileName: string;
  groupId: string;
  groupName: string;
};

/** 區域 -> 編輯表單的欄位值 */
export const zoneFormValues = (zone: ZoneRow) => {
  const forbiddenCar = zone.tagSetting?.forbidden_car ?? [];
  // forbidden_car 存 ["*"] 代表當初勾的是「禁止所有車輛」,不是一台叫 "*" 的車
  const isAll = forbiddenCar.includes("*");
  return {
    name: zone.name,
    category: zone.category ?? [],
    layer: zone.layer === "none" ? undefined : zone.layer,
    lidar_front: zone.lidar_front,
    lidar_back: zone.lidar_back,
    startX: zone.startPoint.startX,
    startY: zone.startPoint.startY,
    endX: zone.endPoint.endX,
    endY: zone.endPoint.endY,
    speed_limit: zone.tagSetting?.speed_limit ?? undefined,
    hight_limit: zone.tagSetting?.hight_limit ?? undefined,
    limitNum: zone.tagSetting?.limitNum ?? undefined,
    view_available: zone.tagSetting?.view_available ?? undefined,
    elevator_id: zone.tagSetting?.elevator_id ?? undefined,
    splice_id: zone.tagSetting?.splice_id ?? undefined,
    all_forbidden: isAll,
    forbidden: isAll ? [] : forbiddenCar,
    color: zone.backgroundColor,
  };
};

/** 編輯表單的欄位值 -> 送給 edit-edit-zone 的內容 */
export const zoneEditPayload = (
  zone: ZoneRow,
  v: Record<string, unknown>,
  currentMapId: string | null,
) => ({
  ...v,
  id: zone.id,
  rev: zone.rev,
  layer: v.layer ? v.layer : "none",
  lidar_back: v.layer ? v.lidar_back : false,
  lidar_front: v.layer ? v.lidar_front : false,
  forbidden: v.all_forbidden ? ["*"] : ((v.forbidden as string[]) ?? []),
  map_id: currentMapId,
});

/**
 * 存區域編輯。成功或資料被別人改過 (rev 對不上) 都會重抓地圖資料再呼叫 onDone。
 * 編輯視窗、地圖上重畫邊界都用這個。
 */
export const useZoneEditMutation = (
  messageApi: MessageInstance,
  onDone: () => void,
) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.refetchQueries({ queryKey: ["map"] });
    queryClient.refetchQueries({ queryKey: ["active-group-resources"] });
    queryClient.refetchQueries({ queryKey: ["all-groups-resources"] });
  };
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      client.post("api/setting/edit-edit-zone", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      invalidate();
      onDone();
    },
    onError: (e: ErrorResponse) =>
      editErrorHandler(e, messageApi, () => {
        invalidate();
        onDone();
      }),
  });
};

type Props = {
  /** 要編輯的區域; null 就是關著 */
  zone: ZoneRow | null;
  onClose: () => void;
};

/**
 * 編輯區域的視窗。區域表的編輯鈕、設定頁地圖上區域資訊卡的編輯鈕都開這一個,
 * 兩邊改出來的結果才會一樣。
 */
const ZoneEditModal: FC<Props> = ({ zone, onClose }) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [editForm] = Form.useForm();

  const { data: resources } = useAllGroupsResources();
  const currentMapId = useAtomValue(currentMapIdAtom);

  // 編輯中區域所在群組的地圖, 給電梯 / 拼接 ID 找同組區域 (帶顏色、擋跨地圖拼接)
  const editingGroupMaps = useMemo(
    () =>
      resources?.groups.find((g) => g.groupId === zone?.groupId)?.maps as
        | LinkMap[]
        | undefined,
    [resources, zone?.groupId],
  );

  useEffect(() => {
    if (!zone) return;
    editForm.setFieldsValue(zoneFormValues(zone));
  }, [zone, editForm]);

  const editMutation = useZoneEditMutation(messageApi, onClose);

  const submitEdit = async () => {
    if (!zone) return;
    try {
      await editForm.validateFields();
    } catch (e) {
      // 欄位都是 noStyle 不會顯示錯誤, 至少把第一個原因講出來
      const reason = (e as { errorFields?: { errors: string[] }[] }).errorFields?.[0]
        ?.errors[0];
      if (reason) void messageApi.warning(reason);
      return;
    }
    const v = editForm.getFieldsValue() as Record<string, unknown>;
    editMutation.mutate(zoneEditPayload(zone, v, currentMapId));
  };

  return (
    <>
      {contextHolder}
      <Modal
        open={!!zone}
        title={`${t("utils.edit")} — ${zone?.name ?? ""}`}
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
              <FieldLabel>{t("edit_zone_panel.start_x")}</FieldLabel>
              <Form.Item name="startX" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("edit_zone_panel.start_y")}</FieldLabel>
              <Form.Item name="startY" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("edit_zone_panel.end_x")}</FieldLabel>
              <Form.Item name="endX" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
            <Field>
              <FieldLabel>{t("edit_zone_panel.end_y")}</FieldLabel>
              <Form.Item name="endY" noStyle>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Field>
          </FieldGrid>

          <Field>
            <FieldLabel>{t("zone_table_form.zone_color")}</FieldLabel>
            <Form.Item name="color" noStyle getValueFromEvent={zoneColorFromPicker}>
              <ColorPicker />
            </Form.Item>
          </Field>

          <ZoneFields
            form={editForm}
            groupMaps={editingGroupMaps}
            mapId={zone?.mapId}
            zoneId={zone?.id}
          />
        </Form>
      </Modal>
    </>
  );
};

export default ZoneEditModal;
