import React, { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Form, Input, Modal, message } from "antd";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { MapGroupName } from "@/api/useMapGroup";

interface AddModalProps {
  isOpenModal: boolean;
  isEdit: boolean;
  editValue: MapGroupName | null;
  resetEdit: () => void;
}

const AddModal: React.FC<AddModalProps> = ({
  isOpenModal,
  isEdit,
  editValue,
  resetEdit,
}) => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const addMutation = useMutation({
    mutationFn: (payload: { group_name: string }) => {
      return client.post("/api/setting/map-group", payload);
    },
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      queryClient.invalidateQueries({ queryKey: ["map-group"] });
      queryClient.invalidateQueries({ queryKey: ["all-map-Info"] });
      handleCancel();
    },
    onError: (e: ErrorResponse) => {
      errorHandler(e, messageApi);
    },
  });

  const editMutation = useMutation({
    mutationFn: (payload: { id: string; group_name: string }) => {
      return client.patch("/api/setting/map-group", payload);
    },
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      queryClient.invalidateQueries({ queryKey: ["map-group"] });
      queryClient.invalidateQueries({ queryKey: ["all-map-Info"] });
      handleCancel();
    },
    onError: (e: ErrorResponse) => {
      errorHandler(e, messageApi);
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (isEdit && editValue?.id) {
        editMutation.mutate({
          id: editValue.id,
          group_name: values.group_name,
        });
      } else {
        addMutation.mutate({ group_name: values.group_name });
      }
    } catch (errInfo) {
      console.log("Submit Failed:", errInfo);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    resetEdit();
  };

  useEffect(() => {
    if (!isEdit || !editValue) {
      form.resetFields();
      return;
    }

    form.setFieldsValue({
      group_name: editValue.group_name,
    });
  }, [form, isEdit, editValue]);

  if (!isOpenModal) return null;

  return (
    <>
      {contextHolder}
      <Modal
        open={isOpenModal}
        title={
          isEdit
            ? t("map_group_table.edit_title")
            : t("map_group_table.add_title")
        }
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            {t("utils.cancel")}
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleSubmit}
            loading={addMutation.isPending || editMutation.isPending}
          >
            {t("utils.confirm")}
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="group_name"
            label={t("map_group_table.name")}
            rules={[
              {
                required: true,
                message: t("utils.required"),
              },
            ]}
          >
            <Input placeholder={t("map_group_table.name")} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AddModal;
