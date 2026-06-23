
import client from "@/api/axiosClient";
import { Err } from "@/utils/responseErr";
import { DatabaseOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Form, InputNumber, message, Modal, Spin } from "antd";
import React, { Dispatch, FC, SetStateAction, useEffect } from "react";
import styled from "styled-components";

const IndustrialCard = styled.div`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  margin-bottom: 20px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

  &:hover {
    border-color: #bfbfbf;
  }
`;

const FieldLabel = styled.span`
  color: #595959;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: "Roboto Mono", monospace;
`;

const SectionHeader = styled.div`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-left: 3px solid #fa8c16;
  padding: 10px 16px;
  margin-bottom: 16px;
  font-family: "Roboto Mono", monospace;
  color: #fa8c16;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
`;

// 定義後端回傳與發送的資料格式
interface ConfigPayload {
  max_retries: { move_safety: number; detect_shelf: number };
  retry_wait_s: { move_safety: number; detect_shelf: number };
}

interface AndyConfigModelProps {
  editAndyConfig: boolean;
  setEditAndyConfig: Dispatch<SetStateAction<boolean>>;
  editAndyConfigAmrId: string
  setEditAndyConfigAmrId: Dispatch<SetStateAction<string>>
}

const AndyConfigModel: FC<AndyConfigModelProps> = ({
  editAndyConfig,
  setEditAndyConfig,
  editAndyConfigAmrId,
  setEditAndyConfigAmrId
}) => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // 1. 透過 React Query 取得後端現有設定   
  const { data: configData, isLoading, refetch } = useQuery({
    queryKey: ["crdAmrConfig", editAndyConfigAmrId],
    queryFn: async () => {
      const response = await client.get<ConfigPayload>(
        `api/setting/crd-amr-config`, // 請確認你的基礎路徑是否有包含前綴，若沒有則補上完整路徑
        { params: { amrId:editAndyConfigAmrId } }
      );
      return response.data;
    },
    enabled: editAndyConfig && !!editAndyConfigAmrId, // 只有在打開 Modal 且有 amrId 時才發送請求
  });

  // 當後端資料回來時，同步塞入 Antd 表單中
  useEffect(() => {
    if (configData) {
      form.setFieldsValue(configData);
    }
  }, [configData, form]);

  // 2. 更新資料的 Mutation
  const updateMutation = useMutation({
    mutationFn: (payload: ConfigPayload & { amrId: string }) => {
      return client.post("api/setting/update_crd_movement_config", payload);
    },
    onSuccess: () => {
      messageApi.success("更新成功"); // 若無 t 函數，先用字串代替
      refetch();
      handleCloseAndy();
    },
    onError(error: Err) {
      const errorMsg = error.response?.data?.message || "更新失敗";
      messageApi.error(errorMsg);
    },
  });

  const handleCloseAndy = () => {
    form.resetFields();
    setEditAndyConfig(false);
  };

  // 3. 處理表單送出
  const handleSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        // 將表單內容加上後端必要的 amrId 一併送出
        updateMutation.mutate({
          amrId: editAndyConfigAmrId,
          ...values,
        });
      })
      .catch((info) => {
        console.log("表單驗證失敗:", info);
      });
  };

  return (
    <>
      {contextHolder}
      <Modal
        closable={{ "aria-label": "Custom Close Button" }}
        open={editAndyConfig}
        onCancel={handleCloseAndy}
        onOk={handleSubmit} // 點擊確認時觸發送出
        confirmLoading={updateMutation.isPending} // 送出時顯示 Loading 狀態
        destroyOnClose // 關閉時銷毀，確保下次打開能重新渲染
      >
        <SectionHeader>
          <DatabaseOutlined />
          ANDY 哥的設定 
        </SectionHeader>

        <Spin spinning={isLoading}>
          <Form form={form} layout="vertical">
            <IndustrialCard>
              <div style={{ fontWeight: "bold", marginBottom: 8 }}>max_retries</div>
              {/* 注意：巢狀欄位 name 必須改為陣列格式 */}
              <Form.Item
                label={<FieldLabel>move_safety</FieldLabel>}
                name={["max_retries", "move_safety"]}
                rules={[{ required: true, message: "必填" }]}
              >
                {/* 數字欄位建議用 InputNumber */}
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                label={<FieldLabel>detect_shelf</FieldLabel>}
                name={["max_retries", "detect_shelf"]}
                rules={[{ required: true, message: "必填" }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </IndustrialCard>

            <IndustrialCard>
              <div style={{ fontWeight: "bold", marginBottom: 8 }}>retry_wait_s</div>
              <Form.Item
                label={<FieldLabel>move_safety</FieldLabel>}
                name={["retry_wait_s", "move_safety"]}
                rules={[{ required: true, message: "必填" }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                label={<FieldLabel>detect_shelf</FieldLabel>}
                name={["retry_wait_s", "detect_shelf"]}
                rules={[{ required: true, message: "必填" }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </IndustrialCard>
          </Form>
        </Spin>
      </Modal>
    </>
  );
};

export default AndyConfigModel;