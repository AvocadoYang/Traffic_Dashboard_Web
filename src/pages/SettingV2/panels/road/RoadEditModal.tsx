import { FC, useEffect } from "react";
import { Form, Modal, message } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { editErrorHandler } from "@/utils/utils";
import RoadCommonFields from "../../ui/roadFields";

export type RoadRow = {
  id: string;
  roadId: string;
  roadType: "oneWayRoad" | "twoWayRoad";
  spot1Id: string;
  spot2Id: string;
  disabled: boolean;
  limit: boolean;
  priority: number;
  validYawList: number[] | string;
  rev?: string;
  mapFileName: string;
  groupName: string;
  isActiveGroup: boolean;
};

type Props = {
  /** 要編輯的路徑; null 就是關著 */
  road: RoadRow | null;
  onClose: () => void;
};

/**
 * 編輯路徑參數的視窗。路徑表的編輯鈕、設定頁地圖上點路徑都開這一個,
 * 兩邊改出來的結果才會一樣 (同 LocationEditModal)。
 */
const RoadEditModal: FC<Props> = ({ road, onClose }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [editForm] = Form.useForm();

  // 每次打開都用這條路徑的值重填
  useEffect(() => {
    if (!road) return;
    editForm.setFieldsValue({
      roadType: road.roadType,
      priority: road.priority,
      validYawList: Array.isArray(road.validYawList)
        ? road.validYawList.map(String)
        : [String(road.validYawList)],
      disabled: road.disabled,
      limit: road.limit,
    });
  }, [road, editForm]);

  const invalidate = () => {
    queryClient.refetchQueries({ queryKey: ["map"] });
    queryClient.refetchQueries({ queryKey: ["active-group-resources"] });
    queryClient.refetchQueries({ queryKey: ["all-groups-resources"] });
  };

  const editMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      client.post("api/setting/edit-edit-road", payload),
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

  const submit = () => {
    if (!road) return;
    const v = editForm.getFieldsValue() as Record<string, unknown>;
    editMutation.mutate({
      ...v,
      id: road.id,
      rev: road.rev,
      spot1Id: Number(road.spot1Id),
      spot2Id: Number(road.spot2Id),
    });
  };

  return (
    <>
      {contextHolder}
      <Modal
        open={!!road}
        title={`${t("utils.edit")} — ${road?.spot1Id ?? ""} → ${road?.spot2Id ?? ""}`}
        onCancel={onClose}
        onOk={submit}
        confirmLoading={editMutation.isLoading}
        okText={t("utils.save")}
        cancelText={t("utils.cancel")}
        // 表單一直掛著, 打開前 setFieldsValue 才接得上
        forceRender
      >
        <Form form={editForm} layout="vertical">
          <RoadCommonFields />
        </Form>
      </Modal>
    </>
  );
};

export default RoadEditModal;
