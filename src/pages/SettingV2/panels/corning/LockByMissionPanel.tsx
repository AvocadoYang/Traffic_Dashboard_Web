import { FC, useEffect } from "react";
import { Form, Switch, Skeleton, message } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import client from "@/api/axiosClient";
import { errorHandler } from "@/utils/utils";
import { ErrorResponse } from "@/utils/globalType";
import {
  PanelShell,
  Section,
  SectionTitle,
  Toolbar,
  SolidButton,
  EmptyState,
  CardList,
  ItemCard,
  CardTitleRow,
  Tag,
  Hint,
  CountNote,
} from "../../ui/primitives";

type ConfigItem = {
  /** prisma 的 id。後端有可能回 null,那種項目不能送回去(schema 要求 string) */
  id: string | null;
  locationId: string;
  hasLockByMissionConfig: boolean;
  areaType: "STORAGE" | "ELEVATOR";
  /** 樓層名稱或電梯名稱 */
  name: string;
};

type FormConfig = {
  id: string;
  location: string;
  hasLock: boolean;
  areaType: string;
  name: string;
};

/**
 * 康寧專用:哪些儲位/電梯在任務卡住時要被鎖定。
 * v1 對應 formComponent/forms/file/corning/LockByMissionPanel。
 */
const LockByMissionPanel: FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm<{ configs: FormConfig[] }>();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["locByMissionConfig"],
    queryFn: async () => {
      const res = await client.get<{ data: ConfigItem[] }>(
        "api/corning/loc-by-mission-config",
      );
      return res.data;
    },
  });

  const configList = data?.data ?? [];

  useEffect(() => {
    if (configList.length === 0) return;
    form.setFieldsValue({
      // id 是 null 的項目送回去會被後端的 yup 擋掉,直接排除
      configs: configList
        .filter((item): item is ConfigItem & { id: string } => item.id !== null)
        .map((item) => ({
          id: item.id,
          location: item.locationId,
          hasLock: item.hasLockByMissionConfig,
          areaType: item.areaType,
          name: item.name,
        })),
    });
    // configList 每次 render 都是新陣列,只在資料真的換掉時重填
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: {
      values: { id: string; hasLock: boolean; location: string }[];
    }) => client.post("api/corning/setting-loc-by-mission-config", payload),
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      void queryClient.invalidateQueries({ queryKey: ["locByMissionConfig"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const submit = async () => {
    try {
      const values = await form.validateFields();
      saveMutation.mutate({
        values: (values.configs ?? []).map((item) => ({
          id: item.id,
          hasLock: !!item.hasLock,
          location: item.location,
        })),
      });
    } catch {
      /* 驗證沒過就不送出,antd 會自己把錯誤標在欄位上 */
    }
  };

  if (isLoading) return <Skeleton active />;

  return (
    <PanelShell>
      {contextHolder}
      <Section>
        <SectionTitle>
          <LockOutlined />
          任務卡住鎖定
        </SectionTitle>

        <Hint>勾起來的位置,在任務卡住時會被鎖定不讓其他任務進來。</Hint>

        <Form form={form} autoComplete="off" layout="vertical">
          <Form.List name="configs">
            {(fields) =>
              fields.length === 0 ? (
                <EmptyState>沒有可以設定的位置</EmptyState>
              ) : (
                <CardList>
                  {fields.map(({ key, name, ...restField }) => {
                    const row = form.getFieldValue([
                      "configs",
                      name,
                    ]) as FormConfig;
                    return (
                      <ItemCard key={key}>
                        <CardTitleRow>
                          <span>{row?.name || row?.location}</span>
                          <Tag>{row?.areaType}</Tag>
                        </CardTitleRow>

                        <CardTitleRow>
                          <CountNote>{row?.location}</CountNote>
                          <Form.Item
                            {...restField}
                            name={[name, "hasLock"]}
                            valuePropName="checked"
                            noStyle
                          >
                            <Switch size="small" />
                          </Form.Item>
                        </CardTitleRow>
                      </ItemCard>
                    );
                  })}
                </CardList>
              )
            }
          </Form.List>
        </Form>

        <Toolbar>
          <SolidButton
            type="button"
            disabled={saveMutation.isLoading}
            onClick={() => void submit()}
          >
            {saveMutation.isLoading ? t("utils.loading") : t("utils.save")}
          </SolidButton>
          <CountNote>{`${configList.length} LOCATIONS`}</CountNote>
        </Toolbar>
      </Section>
    </PanelShell>
  );
};

export default LockByMissionPanel;
