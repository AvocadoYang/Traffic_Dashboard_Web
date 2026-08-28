import client from "@/api/axiosClient";
import useAmrName from "@/api/useAmrName";
import {
  DISPATCH_PAGE_QUERY_KEY,
  DispatchWidget,
  DispatchWidgetType,
} from "@/api/useMissionDispatchBoard";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, Input, message, Modal, Select } from "antd";
import React, { FC, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

interface FormValues {
  title: string;
  amrId?: string;
}

const DEFAULT_SIZE: Record<DispatchWidgetType, { width: number; height: number }> = {
  MISSION_LIST: { width: 420, height: 320 },
  AMR_STATUS: { width: 220, height: 180 },
};

const DispatchWidgetFormModal: FC<{
  open: boolean;
  pageId: string;
  widgetType: DispatchWidgetType;
  initialValues?: DispatchWidget | null;
  onClose: () => void;
}> = ({ open, pageId, widgetType, initialValues, onClose }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { data: amrData } = useAmrName();

  const isEdit = Boolean(initialValues);
  const effectiveType = initialValues?.widget_type ?? widgetType;

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      title: initialValues?.title ?? "",
      amrId: initialValues?.amrId ?? undefined,
    });
  }, [open, initialValues, form]);

  const amrOptions = useMemo(() => {
    if (!amrData) return [];
    const filtered = amrData.isSim
      ? amrData.amrs.filter((a) => a.isReal === false)
      : amrData.amrs.filter((a) => a.isReal === true);
    return filtered.map((a) => ({ value: a.amrId, label: a.amrId }));
  }, [amrData]);

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
      mutation.mutate({
        title: values.title || null,
        ...(effectiveType === "AMR_STATUS" ? { amrId: values.amrId } : {}),
      });
      return;
    }

    const defaultSize = DEFAULT_SIZE[effectiveType];
    mutation.mutate({
      page_id: pageId,
      widget_type: effectiveType,
      title: values.title || null,
      amrId: effectiveType === "AMR_STATUS" ? values.amrId : null,
      width: initialValues?.width ?? defaultSize.width,
      height: initialValues?.height ?? defaultSize.height,
    });
  };

  const titlePlaceholder =
    effectiveType === "AMR_STATUS"
      ? t("mission_dispatch_board.amr_status_widget")
      : t("mission_dispatch_board.mission_list_widget");

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
          {effectiveType === "AMR_STATUS" && (
            <Form.Item
              label={t("mission_dispatch_board.amr")}
              name="amrId"
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                options={amrOptions}
                optionFilterProp="label"
              />
            </Form.Item>
          )}

          <Form.Item
            label={t("mission_dispatch_board.widget_title")}
            name="title"
          >
            <Input maxLength={20} placeholder={titlePlaceholder} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default DispatchWidgetFormModal;
