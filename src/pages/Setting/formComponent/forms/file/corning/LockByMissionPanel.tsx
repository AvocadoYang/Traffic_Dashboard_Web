import client from "@/api/axiosClient";
import FormHr from "@/pages/Setting/utils/FormHr";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Flex, Form, Checkbox, Input, message, Spin } from "antd";
import React, { FC, useEffect } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

// 1. 更新後端 GET 回傳的資料型別定義
interface ConfigItem {
  id: string | null; // 來自 prisma 的 id，可能為 null
  locationId: string;
  hasLockByMissionConfig: boolean;
  areaType: "STORAGE" | "ELEVATOR";
  name: string; // 樓層名稱或電梯名稱
}

const IndustrialButton = styled(Button)`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #595959;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;
  font-weight: 600;

  &:hover {
    background: #fafafa;
    border-color: #8c8c8c;
    color: #262626;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &.primary {
    background: #1890ff;
    border-color: #1890ff;
    color: #ffffff;

    &:hover {
      background: #40a9ff;
      border-color: #40a9ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  }
`;

const FieldLabel = styled.span`
  color: #262626; /* 稍微調深顏色，讓它看起來更有份量 */
  font-size: 16px; /* 特大 */
  font-weight: bold; /* 特粗 */
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: "Roboto Mono", monospace;
`;

// 新增一個副標籤樣式，用來放 locationId，避免全部擠在一起太大
const SubLabel = styled.span`
  color: #8c8c8c;
  font-size: 12px;
  margin-left: 8px;
  font-family: "Roboto Mono", monospace;
`;

const LockByMissionPanel: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [ForkForm] = Form.useForm();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // 獲取後端資料
  const { data: responseData, isLoading } = useQuery({
    queryKey: ["locByMissionConfig"],
    queryFn: async () => {
      const response = await client.get<{ data: ConfigItem[] }>(
        "api/corning/loc-by-mission-config",
      );
      return response.data;
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const configList = responseData?.data || [];

  // 2. 當資料載入後，對應新結構塞入表單
  useEffect(() => {
    if (configList.length > 0) {
      // 過濾掉 id 為 null 的項目，避免 POST 過去時 Yup 驗證失敗 (schema 要求 string.required)
      const validConfigs = configList
        .filter((item) => item.id !== null)
        .map((item) => ({
          id: item.id, // 使用資料庫真實的 id
          location: item.locationId, // 對應後端要求的 location 欄位
          hasLock: item.hasLockByMissionConfig,
          areaType: item.areaType,
          name: item.name, // 供前端畫面顯示用
        }));

      ForkForm.setFieldsValue({ configs: validConfigs });
    }
  }, [configList, ForkForm]);

  // 儲存的 Mutation
  const saveMutation = useMutation({
    mutationFn: (payload: {
      values: { id: string; hasLock: boolean; location: string }[];
    }) => {
      return client.post("api/corning/setting-loc-by-mission-config", payload);
    },
    onSuccess: () => {
      void messageApi.success("success");
      queryClient.invalidateQueries({ queryKey: ["locByMissionConfig"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  // 3. 送出表單
  const onSaveValue = async () => {
    try {
      const formValues = await ForkForm.validateFields();

      const payload = {
        values: formValues.configs.map((item: any) => ({
          id: item.id, // 資料庫產生的 id
          hasLock: !!item.hasLock,
          location: item.location, // locationId
        })),
      };

      saveMutation.mutate(payload);
    } catch (error) {
      console.error("表單驗證失敗:", error);
    }
  };

  return (
    <>
      {contextHolder}
      <div>
        <h3 className="drop_button_style" {...listeners} {...attributes}>
          任務卡住設定
        </h3>
        <FormHr />

        <Spin spinning={isLoading}>
          <Flex
            gap="middle"
            justify="flex-start"
            align="start"
            vertical
            style={{ width: "100%" }}
          >
            <Form
              form={ForkForm}
              autoComplete="off"
              size="large"
              variant="outlined"
              layout="vertical"
              style={{ width: "100%" }}
            >
              <Form.List name="configs">
                {(fields) => (
                  <Flex vertical gap="middle" style={{ width: "100%" }}>
                    {" "}
                    {/* 稍微拉大每一行的間距 */}
                    {fields.map(({ key, name, ...restField }) => {
                      const areaType = ForkForm.getFieldValue([
                        "configs",
                        name,
                        "areaType",
                      ]);
                      const locationId = ForkForm.getFieldValue([
                        "configs",
                        name,
                        "location",
                      ]);
                      const displayName = ForkForm.getFieldValue([
                        "configs",
                        name,
                        "name",
                      ]);

                      return (
                        <Flex
                          key={key}
                          align="center"
                          gap="large"
                          style={{
                            padding: "8px 0",
                            borderBottom: "1px solid #f0f0f0",
                          }}
                        >
                          {/* 隱藏欄位 */}
                          <Form.Item {...restField} name={[name, "id"]} hidden>
                            <Input />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, "location"]}
                            hidden
                          >
                            <Input />
                          </Form.Item>

                          {/* 顯示名稱與類型 */}
                          <div style={{ width: 380 }}>
                            <Flex align="baseline">
                              {/* 1. 特粗特大的 Name */}
                              <FieldLabel>
                                {displayName || locationId}
                              </FieldLabel>

                              {/* 2. 旁邊輔助的小字 (類型與 ID) */}
                              <SubLabel>
                                [{areaType}] {displayName ? locationId : ""}
                              </SubLabel>
                            </Flex>
                          </div>

                          {/* 勾選狀態 */}
                          <Form.Item
                            {...restField}
                            name={[name, "hasLock"]}
                            valuePropName="checked"
                            style={{ margin: 0 }}
                          >
                            <Checkbox>
                              <span style={{ fontSize: "14px" }}>卡住鎖定</span>
                            </Checkbox>
                          </Form.Item>
                        </Flex>
                      );
                    })}
                  </Flex>
                )}
              </Form.List>

              {/* 儲存按鈕 */}
              <Form.Item style={{ marginTop: 24 }}>
                <IndustrialButton
                  className="primary"
                  loading={saveMutation.isPending}
                  onClick={onSaveValue}
                  disabled={isLoading}
                >
                  儲存設定
                </IndustrialButton>
              </Form.Item>
            </Form>
          </Flex>
        </Spin>
      </div>
    </>
  );
};

export default LockByMissionPanel;
