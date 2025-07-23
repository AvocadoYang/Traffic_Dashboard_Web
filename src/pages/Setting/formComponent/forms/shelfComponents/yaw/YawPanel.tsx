import { FC, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, Row, Col, Button, Modal, message, InputNumber } from "antd";
import { useTranslation } from "react-i18next";
import useYaw, { YawTypeWithoutList } from "@/api/useYaw";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import YawTable from "./YawTable";
import YawForm from "./YawForm";
import FormHr from "../../../../utils/FormHr";
import { PlusOutlined } from "@ant-design/icons";
import SubmitButton from "@/utils/SubmitButton";
type FieldType = {
  yaw?: string;
};

const YawPanel: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const [openYawModel, setOpenYawModel] = useState(false);
  const [openNewYawModal, setOpenNewYawModal] = useState(false);
  const [selectYawId, setSelectYawId] = useState("");
  const queryClient = useQueryClient();
  const [formYaw] = Form.useForm();
  const [NewYawForm] = Form.useForm();
  const { data: yawDataSource } = useYaw();
  const { t } = useTranslation();
  const [messageApi, contextHolders] = message.useMessage();

  const addYawMutation = useMutation({
    mutationFn: (newYawPayload: FieldType) => {
      return client.post("api/setting/add-yaw", newYawPayload);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["yaw"],
      });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const editYawMutation = useMutation({
    mutationFn: (payload: YawTypeWithoutList) => {
      return client.post("api/setting/edit-yaw", {
        id: payload.id,
        yaw: payload.yaw,
      });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["yaw"],
      });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const addHandler = () => {
    setOpenNewYawModal(true);
  };

  const submitNewYaw = () => {
    const newYawPayload = NewYawForm.getFieldsValue() as FieldType;
    addYawMutation.mutate(newYawPayload);
    setOpenNewYawModal(false);
    NewYawForm.resetFields();
  };

  const handleCancel = () => {
    setOpenNewYawModal(false);
    NewYawForm.resetFields();
  };

  const editHandler = () => {
    const values = formYaw.getFieldsValue() as YawTypeWithoutList;
    const payload = {
      ...values,
      id: selectYawId,
    };
    editYawMutation.mutate(payload);
    setSelectYawId("");
    setOpenYawModel(false);
  };

  return (
    <>
      {contextHolders}
      <div style={{ width: "23em" }}>
        <h3 className="drop_button_style" {...listeners} {...attributes}>
          {t("edit_yaw.edit_yaw")}
        </h3>
        <FormHr></FormHr>
        <Row gutter={16}>
          <Col span={16}>
            {" "}
            <Button
              icon={<PlusOutlined />}
              color="primary"
              variant="filled"
              onClick={addHandler}
              type="primary"
              style={{ marginBottom: 16 }}
            >
              {t("edit_yaw.add")}
            </Button>
          </Col>
        </Row>
        <YawTable
          setOpenYawModel={setOpenYawModel}
          setSelectYawId={setSelectYawId}
          yawDataSource={yawDataSource}
        />

        <YawForm
          formYaw={formYaw}
          yawDataSource={yawDataSource}
          selectYawId={selectYawId}
          openYawModel={openYawModel}
          setOpenYawModel={setOpenYawModel}
          editHandler={editHandler}
        />

        <Modal
          title={t("edit_yaw.add")}
          open={openNewYawModal}
          onCancel={handleCancel}
          footer={() => (
            <>
              <SubmitButton form={NewYawForm} onOk={submitNewYaw} isModel />
            </>
          )}
        >
          <Form
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
            style={{ maxWidth: 600 }}
            form={NewYawForm}
            autoComplete="off"
          >
            <Form.Item<FieldType>
              label="yaw"
              name="yaw"
              hasFeedback
              rules={[{ required: true, message: t("edit_yaw.input_warning") }]}
            >
              <InputNumber />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </>
  );
};

export default YawPanel;
