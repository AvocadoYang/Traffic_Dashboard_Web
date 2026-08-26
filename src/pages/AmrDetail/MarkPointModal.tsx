import { useEffect } from "react";
import { Modal, Form, Input, Radio, message, Descriptions } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import useAllAreaTypes from "@/api/useAllAreaTypes";
import { locationOption } from "@/pages/Setting/utils/func";
import { openNotificationWithIcon } from "@/pages/Setting/utils/notification";
import { currentMapIdAtom } from "@/utils/mapSelection";
import { LocationType } from "@/utils/jotai";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

type Pose = { x: number; y: number; yaw: number };

const MarkPointModal: React.FC<{
  open: boolean;
  onClose: () => void;
  pose: Pose;
}> = ({ open, onClose, pose }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const { data: locGenre } = useAllAreaTypes();
  const currentMapId = useAtomValue(currentMapIdAtom);

  const saveLocationMutation = useMutation({
    mutationFn: (payload: LocationType) => {
      return client.post("api/setting/save-edit-loc", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      queryClient.refetchQueries({ queryKey: ["map"] });
      queryClient.refetchQueries({ queryKey: ["active-group-resources"] });
      queryClient.refetchQueries({ queryKey: ["all-groups-resources"] });
      queryClient.refetchQueries({ queryKey: ["loc-only"] });
      onClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const savePoint = () => {
    const { locationId, areaType } = form.getFieldsValue() as {
      locationId: string;
      areaType: string;
    };

    const isNegative = Number(locationId) <= 0;
    const hasLeadingZero = /^0\d/.test(String(locationId));

    if (!locationId) {
      openNotificationWithIcon(
        "warning",
        t("edit_location_panel.save_pose_notify.format_warn"),
        t("edit_location_panel.save_pose_notify.is_a_navigate"),
        "bottomLeft",
      );
      return;
    }

    if (isNegative) {
      openNotificationWithIcon(
        "warning",
        t("edit_location_panel.save_pose_notify.format_warn"),
        t("edit_location_panel.save_pose_notify.is_a_navigate"),
        "bottomLeft",
      );
      return;
    }

    if (hasLeadingZero) {
      openNotificationWithIcon(
        "warning",
        t("edit_location_panel.save_pose_notify.format_warn"),
        t("edit_location_panel.save_pose_notify.leading_zero"),
        "bottomLeft",
      );
      return;
    }

    if (!currentMapId) {
      void messageApi.error(t("map_manager.no_map_selected"));
      return;
    }

    saveLocationMutation.mutate({
      locationId,
      areaType,
      x: pose.x,
      y: pose.y,
      rotation: pose.yaw,
      canRotate: false,
      map_id: currentMapId,
    } as LocationType);
  };

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        onCancel={onClose}
        onOk={savePoint}
        confirmLoading={saveLocationMutation.isLoading}
        title={t("amr_detail.mark_point")}
        okText={t("edit_location_panel.save")}
      >
        <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label={t("amr_detail.current_position")}>
            X: {pose.x} | Y: {pose.y} | θ: {pose.yaw}
          </Descriptions.Item>
        </Descriptions>

        <Form layout="vertical" form={form} initialValues={{ areaType: "EXTRA" }}>
          <Form.Item
            label={t("amr_detail.location_id")}
            name="locationId"
            rules={[{ required: true, message: t("utils.required") }]}
          >
            <Input type="number" min={1} />
          </Form.Item>

          <Form.Item label={t("edit_location_panel.areaType")} name="areaType">
            <Radio.Group>
              {locGenre?.map(({ value }) => (
                <Radio key={value} value={value}>
                  {locationOption(value)}
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default MarkPointModal;
