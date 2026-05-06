import { YawType } from "@/api/useYaw";
import SubmitButton from "@/utils/SubmitButton";
import { FormInstance, Form, Input, Modal } from "antd";
import { Dispatch, FC, useEffect } from "react";
import { useTranslation } from "react-i18next";

const YawForm: FC<{
  formYaw: FormInstance<unknown>;
  yawDataSource: YawType;
  selectYawId: string;
  openYawModel: boolean;
  setOpenYawModel: Dispatch<React.SetStateAction<boolean>>;
  editHandler: () => void;
}> = ({
  formYaw,
  yawDataSource,
  selectYawId,
  openYawModel,
  setOpenYawModel,
  editHandler,
}) => {
  const yawData = yawDataSource?.filter((v) => v.id === selectYawId)[0];
  const { t } = useTranslation();
  useEffect(() => {
    formYaw.setFieldValue("yaw", yawData?.yaw);
  }, [formYaw, yawData?.id, yawData?.yaw]);

  return (
    <>
      <Modal
        title={t("edit_yaw.edit_yaw")}
        open={openYawModel}
        onCancel={() => setOpenYawModel(false)}
        footer={(_, { CancelBtn }) => (
          <>
            <CancelBtn />
            <SubmitButton form={formYaw} onOk={editHandler} isModel />
          </>
        )}
      >
        <Form form={formYaw} labelCol={{ span: 6 }} autoComplete="off">
          <Form.Item
            label="yaw"
            name="yaw"
            hasFeedback
            rules={[
              {
                required: true,
                message: t("utils.required"),
              },
            ]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default YawForm;
