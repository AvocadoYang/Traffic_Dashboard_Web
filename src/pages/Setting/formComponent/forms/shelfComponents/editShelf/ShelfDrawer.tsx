import client from "@/api/axiosClient";
import useAllMissionTitles from "@/api/useMissionTitle";
import useShelfCategory from "@/api/useShelfCategory";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Form,
  InputNumber,
  message,
  Modal,
  Select,
} from "antd";
import { Dispatch, FC, Key, SetStateAction, useMemo } from "react";
import { useTranslation } from "react-i18next";

type FieldType = {
  shelfId?: Key[];
  category: string;
  load: string;
  offload: string;
  yaw: string;
  cargo_limit: number;
};

const ShelfDrawer: FC<{
  openDrawer: boolean;
  setOpenDrawer: Dispatch<SetStateAction<boolean>>;
  selectedRowKeys: Key[];
}> = ({ openDrawer, setOpenDrawer, selectedRowKeys }) => {
  const { data: missionTitle } = useAllMissionTitles();
  const { data: allCategory } = useShelfCategory();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();



  const misOptions = useMemo(() => {
    if (!missionTitle) return [];
    return missionTitle
      ?.filter((g) =>
        g.MissionTitleBridgeCategory.some(
          (s) => s.Category?.tagName === "dynamic-mission",
        ),
      )
      .map((v) => {
        return {
          value: v.id,
          label: v.name,
        };
      });
  }, [missionTitle]);

  const submitMutation = useMutation({
    mutationFn: (payload: FieldType) => {
      return client.post("api/setting/edit-multi-shelf", payload);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["shelf"],
      });
      (await queryClient.refetchQueries({ queryKey: ["loc-only"] }),
        messageApi.success(t("utils.success")));
      setOpenDrawer(false);
    },
    onError: (e: ErrorResponse) => {
      errorHandler(e, messageApi);
    },
  });

  const onFinish = () => {
    const values = form.getFieldsValue();
    const payload: FieldType = {
      ...values,
      shelfId: selectedRowKeys,
    };
    submitMutation.mutate(payload);
    form.resetFields();
  };

  return (
    <>
      {contextHolder}
      {openDrawer ? (
        <Modal
          title={t("edit_shelf_panel.edit_shelf")}
          onClose={() => setOpenDrawer(false)}
          onCancel={() => setOpenDrawer(false)}
          open={openDrawer}
          onOk={() => onFinish()}
        >
          <Card>
            <Form onFinish={onFinish} form={form} autoComplete="off">
              <Form.Item label={t("edit_shelf_panel.category")} name="category">
                <Select
                  disabled={selectedRowKeys.length === 0}
                  options={allCategory?.map((v) => {
                    return { value: v.id, label: v.name };
                  })}
                />
              </Form.Item>

              <Form.Item label={t("edit_shelf_panel.load_mission")} name="load">
                <Select
                  disabled={selectedRowKeys.length === 0}
                  allowClear
                  options={misOptions}
                />
              </Form.Item>

              <Form.Item
                label={t("edit_shelf_panel.offload_mission")}
                name="offload"
              >
                <Select
                  disabled={selectedRowKeys.length === 0}
                  allowClear
                  options={misOptions}
                />
              </Form.Item>

              <Form.Item
                label={t("edit_shelf_panel.cargo_limit")}
                name="cargo_limit"
              >
                <InputNumber disabled={selectedRowKeys.length === 0} />
              </Form.Item>

            </Form>
          </Card>
        </Modal>
      ) : (
        []
      )}
    </>
  );
};

export default ShelfDrawer;
