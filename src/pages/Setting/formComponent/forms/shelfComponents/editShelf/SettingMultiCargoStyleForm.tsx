import { Alert, Button, Flex, Form, InputNumber, message, Select, Switch } from "antd";
import { FC, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import client from "@/api/axiosClient";
import useLoc, { LocWithoutArr } from "@/api/useLoc";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

type Field = "translateX" | "translateY" | "scale" | "rotate" | "flex_direction";

type FormValues = {
  translateX: number;
  translateY: number;
  scale: number;
  rotate: number;
  flex_direction: string;
  isEditTranslateX: boolean;
  isEditTranslateY: boolean;
  isEditScale: boolean;
  isEditRotate: boolean;
  isEditDirection: boolean;
};

export type MultiSubmitValue = Partial<FormValues> & { ids: string[] };

const flexOption = [
  { value: "row" },
  { value: "column" },
  { value: "row-reverse" },
  { value: "column-reverse" },
];

const FLAG_OF: Record<Field, keyof FormValues> = {
  translateX: "isEditTranslateX",
  translateY: "isEditTranslateY",
  scale: "isEditScale",
  rotate: "isEditRotate",
  flex_direction: "isEditDirection",
};

const Row = styled.div<{ $on: boolean }>`
  display: grid;
  grid-template-columns: 52px 110px 1fr;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  margin-bottom: 8px;
  border: 1px solid ${({ $on }) => ($on ? "#1890ff" : "#e8e8e8")};
  border-left: 4px solid ${({ $on }) => ($on ? "#1890ff" : "#d9d9d9")};
  background: ${({ $on }) => ($on ? "#f0f5ff" : "#fafafa")};
  transition: all 0.15s;

  .row-label {
    font-weight: 600;
    color: ${({ $on }) => ($on ? "#262626" : "#8c8c8c")};
  }
`;

const SettingMultiCargoStyleForm: FC<{
  // Loc.id (不是貨架 id)
  locIds: string[];
  locationIds: string[];
  onDone: () => void;
}> = ({ locIds, locationIds, onDone }) => {
  const [form] = Form.useForm<FormValues>();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { data: locData } = useLoc(undefined);
  const [messageApi, contextHolder] = message.useMessage();

  const flags = Form.useWatch(
    ["isEditTranslateX", "isEditTranslateY", "isEditScale", "isEditRotate", "isEditDirection"],
    form,
  ) as boolean[] | undefined;
  const anyEnabled = flags?.some(Boolean) ?? false;

  // 用第一個被選到的貨架當起始值，開啟開關後可以從目前的樣子微調
  const firstLoc = useMemo(
    () => (locData as LocWithoutArr[] | undefined)?.find((l) => l.id === locIds[0]),
    [locData, locIds],
  );

  useEffect(() => {
    if (!firstLoc) return;
    form.setFieldsValue({
      translateX: firstLoc.translateX,
      translateY: firstLoc.translateY,
      scale: firstLoc.scale,
      rotate: firstLoc.rotate,
      flex_direction: firstLoc.flex_direction,
    });
  }, [firstLoc]);

  const submitMutation = useMutation({
    mutationFn: (payload: MultiSubmitValue) =>
      client.post("api/setting/edit-multi-loc-style", payload),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["cargoLoc-mission"] });
      await queryClient.refetchQueries({ queryKey: ["loc-only"] });
      void messageApi.success(t("utils.success"));
      onDone();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const onFinish = (values: FormValues) => {
    submitMutation.mutate({ ...values, ids: locIds });
  };

  // 改動某個欄位的值就自動打開它的開關，不用另外再去點
  const handleValuesChange = (changed: Partial<FormValues>) => {
    (Object.keys(changed) as (keyof FormValues)[]).forEach((key) => {
      if (key in FLAG_OF) form.setFieldValue(FLAG_OF[key as Field], true);
    });
  };

  const renderRow = (field: Field, label: string, editLabel: string) => {
    const flag = FLAG_OF[field];
    return (
      <Form.Item noStyle shouldUpdate={(p, c) => p[flag] !== c[flag]}>
        {({ getFieldValue }) => {
          const on = Boolean(getFieldValue(flag));
          return (
            <Row $on={on}>
              <Form.Item name={flag} valuePropName="checked" noStyle>
                <Switch aria-label={editLabel} />
              </Form.Item>
              <span className="row-label">{label}</span>
              <Form.Item name={field} noStyle>
                {field === "flex_direction" ? (
                  <Select
                    options={flexOption}
                    placeholder={t("multiStyle.selectDirection")}
                    disabled={!on}
                  />
                ) : (
                  <InputNumber
                    style={{ width: "100%" }}
                    step={field === "rotate" ? 1 : 0.1}
                    disabled={!on}
                  />
                )}
              </Form.Item>
            </Row>
          );
        }}
      </Form.Item>
    );
  };

  return (
    <>
      {contextHolder}
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        title={t("multiStyle.selected", { n: locIds.length })}
        description={
          <div>
            <div style={{ wordBreak: "break-all" }}>{locationIds.join(", ")}</div>
            <div style={{ marginTop: 4 }}>{t("multiStyle.hint")}</div>
          </div>
        }
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onValuesChange={handleValuesChange}
        initialValues={{
          isEditTranslateX: false,
          isEditTranslateY: false,
          isEditScale: false,
          isEditRotate: false,
          isEditDirection: false,
        }}
      >
        {renderRow("translateX", t("multiStyle.x"), t("multiStyle.editX"))}
        {renderRow("translateY", t("multiStyle.y"), t("multiStyle.editY"))}
        {renderRow("scale", t("multiStyle.scale"), t("multiStyle.editScale"))}
        {renderRow("rotate", t("multiStyle.rotate"), t("multiStyle.editRotate"))}
        {renderRow(
          "flex_direction",
          t("multiStyle.flexDirection"),
          t("multiStyle.editDirection"),
        )}

        <Flex justify="flex-end" gap="small" style={{ marginTop: 16 }}>
          <Button onClick={onDone}>{t("utils.cancel")}</Button>
          <Button
            type="primary"
            htmlType="submit"
            disabled={!anyEnabled}
            loading={submitMutation.isPending}
          >
            {t("utils.submit")}
          </Button>
        </Flex>
      </Form>
    </>
  );
};

export default SettingMultiCargoStyleForm;
