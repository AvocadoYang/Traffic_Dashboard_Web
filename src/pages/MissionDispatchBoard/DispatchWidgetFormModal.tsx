import client from "@/api/axiosClient";
import {
  DISPATCH_PAGE_QUERY_KEY,
  DispatchWidget,
} from "@/api/useMissionDispatchBoard";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, Input, message, Modal } from "antd";
import React, { FC, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface FormValues {
  title: string;
}

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 320;

const DispatchWidgetFormModal: FC<{
  open: boolean;
  pageId: string;
  initialValues?: DispatchWidget | null;
  onClose: () => void;
}> = ({ open, pageId, initialValues, onClose }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  const isEdit = Boolean(initialValues);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({ title: initialValues?.title ?? "" });
  }, [open, initialValues, form]);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isEdit
        ? client.patch("api/setting/dispatch-widget", {
            id: initialValues?.id,
            ...payload,
          })
        : client.post("api/setting/dispatch-widget", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void queryClient.invalidateQueries({ queryKey: DISPATCH_PAGE_QUERY_KEY });
      onClose();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleOk = async () => {
    const values = await form.validateFields();

    if (isEdit) {
      mutation.mutate({ title: values.title || null });
      return;
    }

    mutation.mutate({
      page_id: pageId,
      widget_type: "MISSION_LIST",
      title: values.title || null,
      width: initialValues?.width ?? DEFAULT_WIDTH,
      height: initialValues?.height ?? DEFAULT_HEIGHT,
    });
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={
          isEdit
            ? t("mission_dispatch_board.edit_widget_title")
            : t("mission_dispatch_board.create_widget_title")
        }
        open={open}
        onCancel={onClose}
        onOk={handleOk}
        confirmLoading={mutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label={t("mission_dispatch_board.widget_title")}
            name="title"
          >
            <Input
              maxLength={20}
              placeholder={t("mission_dispatch_board.mission_list_widget")}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default DispatchWidgetFormModal;
