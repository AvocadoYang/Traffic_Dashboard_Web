import client from "@/api/axiosClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { PlusOutlined } from "@ant-design/icons";
import { FC, memo, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { array, boolean, object, string } from "yup";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { QuestionCircleOutlined } from "@ant-design/icons";

type FieldType = {
  name: string;
};
const FloatBtn = styled.div`
  position: absolute;
  z-index: 4;
  top: 25%;
  left: 20px;
  transform: translateY(-50%);
  background-color: #f5f5f5;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  opacity: 0.9;
  transition: opacity 0.3s ease-in-out;
  width: 3em;
  height: 3em;
  padding: 1em 0em;
  justify-content: space-between;

  &:hover {
    opacity: 1;
  }
`;

const schema = array(
  object({
    id: string().required(),
    name: string().required(),
    isUsing: boolean().required(),
  }).optional(),
).required();

const getAllScript = async () => {
  const { data } = await client.get<unknown>("api/simulate/all-script");
  const result = await schema.validate(data, { stripUnknown: true });
  return result;
};

type DataType = {
  id: string;
  name: string;
  isUsing: boolean;
};

const SelectScript: FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [formNewScript] = Form.useForm();
  const [messageApi, contextHolders] = message.useMessage();
  const queryClient = useQueryClient();
  const { data, refetch } = useQuery(["_"], {
    queryFn: () => {
      return getAllScript();
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: FieldType) => {
      return client.post("api/simulate/create-script", payload);
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const changeScriptMutation = useMutation({
    mutationFn: (id: string) => {
      return client.post("api/simulate/change-script", { id });
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      refetch();
      queryClient.refetchQueries({ queryKey: ["simulate-script"] });
      queryClient.refetchQueries({ queryKey: ["script-robot"] });
      queryClient.refetchQueries({ queryKey: ["mock-robot"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return client.post("api/simulate/delete-script", { id });
    },
    onSuccess: () => {
      void messageApi.success(t("utils.success"));
      refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const showModal = () => {
    setIsOpen(true);
  };

  const handleOk = () => {
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const onFinishAddScript = () => {
    const name = formNewScript.getFieldValue("name") as string;

    createMutation.mutate({ name });
  };

  const columns = [
    {
      title: t("sim.select_script.script"),
      dataIndex: "scriptName",
      key: "scriptName",
      render: (_, record: DataType) => {
        return <Typography.Text>{record.name}</Typography.Text>;
      },
    },
    {
      title: t("sim.select_script.status"),
      dataIndex: "status",
      key: "status",
      render: (_, record: DataType) => {
        return record.isUsing ? (
          <Typography.Text type="success">
            {t("sim.select_script.using")}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">
            {t("sim.select_script.no_using")}
          </Typography.Text>
        );
      },
    },
    {
      title: "",
      dataIndex: "action",
      key: "action",
      render: (_, record: DataType) => {
        return (
          <Flex justify="end" gap="large">
            {record.isUsing ? (
              []
            ) : (
              <Button
                onClick={() => changeScriptMutation.mutate(record.id)}
                type="primary"
                loading={changeScriptMutation.isLoading}
              >
                {t("sim.select_script.using_this")}
              </Button>
            )}
            <Button
              variant="filled"
              danger
              onClick={() => deleteMutation.mutate(record.id)}
              loading={deleteMutation.isLoading}
            >
              {t("utils.delete")}
            </Button>
          </Flex>
        );
      },
    },
  ];

  return (
    <>
      {contextHolders}
      <Tooltip title={t("sim.select_script.change")} placement="right">
        <FloatBtn onClick={showModal}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <title>script-text-outline</title>
            <path d="M15,20A1,1 0 0,0 16,19V4H8A1,1 0 0,0 7,5V16H5V5A3,3 0 0,1 8,2H19A3,3 0 0,1 22,5V6H20V5A1,1 0 0,0 19,4A1,1 0 0,0 18,5V9L18,19A3,3 0 0,1 15,22H5A3,3 0 0,1 2,19V18H13A2,2 0 0,0 15,20M9,6H14V8H9V6M9,10H14V12H9V10M9,14H14V16H9V14Z" />
          </svg>
        </FloatBtn>
      </Tooltip>

      {isOpen ? (
        <Modal
          title={t("sim.select_script.add_or_change")}
          open={isOpen}
          onOk={handleOk}
          onCancel={handleCancel}
        >
          <Form form={formNewScript} onFinish={onFinishAddScript}>
            <Flex gap="large">
              <Form.Item
                label={t("utils.add")}
                name="name"
                rules={[{ required: true, message: t("utils.required") }]}
              >
                <Input />
              </Form.Item>

              <Form.Item>
                <Tooltip title={t("utils.add")}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<PlusOutlined />}
                  />
                </Tooltip>
              </Form.Item>
            </Flex>
          </Form>

          <Flex vertical gap="large">
            <Tooltip placement="left" title={t("sim.select_script.info")}>
              <QuestionCircleOutlined />
            </Tooltip>

            <Table
              rowKey={(record) => record?.id as string}
              columns={columns}
              dataSource={data as []}
            />
          </Flex>
        </Modal>
      ) : (
        []
      )}
    </>
  );
};

export default memo(SelectScript, () => true);
