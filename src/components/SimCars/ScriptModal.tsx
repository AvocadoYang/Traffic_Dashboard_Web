import { FC } from "react";
import {
  Button,
  Flex,
  Form,
  Input,
  message,
  Modal,
  Table,
  Tooltip,
  Typography,
} from "antd";
import { PlusOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { array, boolean, object, string } from "yup";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { refetchSimCars } from "./useSimCarPlacement";

const schema = array(
  object({
    id: string().required(),
    name: string().required(),
    isUsing: boolean().required(),
  }).required(),
).required();

type ScriptRow = { id: string; name: string; isUsing: boolean };

/** 新增 / 切換 / 刪除模擬腳本 (舊模擬頁左上角那顆按鈕的視窗) */
const ScriptModal: FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<{ name: string }>();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const { data, refetch } = useQuery(["simulate-all-script"], {
    queryFn: async () => {
      const res = await client.get<unknown>("api/simulate/all-script");
      return schema.validate(res.data, { stripUnknown: true });
    },
    enabled: open,
  });

  const afterChange = () => {
    void messageApi.success(t("utils.success"));
    void refetch();
    void queryClient.refetchQueries({ queryKey: ["simulate-script"] });
    refetchSimCars(queryClient);
  };

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      client.post("api/simulate/create-script", { name }),
    onSuccess: () => {
      form.resetFields();
      afterChange();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const changeMutation = useMutation({
    mutationFn: (id: string) =>
      client.post("api/simulate/change-script", { id }),
    onSuccess: afterChange,
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      client.post("api/simulate/delete-script", { id }),
    onSuccess: afterChange,
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const columns = [
    {
      title: t("sim.select_script.script"),
      key: "name",
      render: (_: unknown, r: ScriptRow) => (
        <Typography.Text>{r.name}</Typography.Text>
      ),
    },
    {
      title: t("sim.select_script.status"),
      key: "status",
      render: (_: unknown, r: ScriptRow) =>
        r.isUsing ? (
          <Typography.Text type="success">
            {t("sim.select_script.using")}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">
            {t("sim.select_script.no_using")}
          </Typography.Text>
        ),
    },
    {
      title: "",
      key: "action",
      render: (_: unknown, r: ScriptRow) => (
        <Flex justify="end" gap="middle">
          {r.isUsing ? null : (
            <Button
              type="primary"
              onClick={() => changeMutation.mutate(r.id)}
              loading={changeMutation.isLoading}
            >
              {t("sim.select_script.using_this")}
            </Button>
          )}
          <Button
            variant="filled"
            danger
            onClick={() => deleteMutation.mutate(r.id)}
            loading={deleteMutation.isLoading}
          >
            {t("utils.delete")}
          </Button>
        </Flex>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Modal
        title={t("sim.select_script.add_or_change")}
        open={open}
        onCancel={onClose}
        footer={null}
      >
        <Form
          form={form}
          onFinish={({ name }) => createMutation.mutate(name)}
        >
          <Flex gap="middle">
            <Form.Item
              label={t("utils.add")}
              name="name"
              rules={[{ required: true, message: t("utils.required") as string }]}
            >
              <Input />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<PlusOutlined />}
                loading={createMutation.isLoading}
              />
            </Form.Item>
            <Tooltip title={t("sim.select_script.info")}>
              <QuestionCircleOutlined style={{ alignSelf: "flex-start", marginTop: 8 }} />
            </Tooltip>
          </Flex>
        </Form>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          columns={columns}
          dataSource={data ?? []}
        />
      </Modal>
    </>
  );
};

export default ScriptModal;
