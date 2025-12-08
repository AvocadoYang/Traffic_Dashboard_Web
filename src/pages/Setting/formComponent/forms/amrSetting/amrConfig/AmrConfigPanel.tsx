import FormHr from "@/pages/Setting/utils/FormHr";
import client from "@/api/axiosClient";
import { Err } from "@/utils/responseErr";
import { QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Flex, Form, Input, InputNumber, message, Popconfirm, Table, TableProps } from "antd";
import form from "antd/es/form";
import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import useAMRsample from "@/api/useAMRsample";
import { EditOutlined, DeleteTwoTone } from "@ant-design/icons";

type Form_Data = {
  name: string;
  value: string;
  width: number;
  length: number;
  height: number;
};
interface TableDataType {
  id: string;
  name: string;
  value: string;
  width: number;
  length: number;
  height: number;
}

const AmrConfigPanel: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { data: robotTypes } = useAMRsample();

  const queryClient = useQueryClient();
  const [isEdit, setIsEdit] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const createMutation = useMutation({
    mutationFn: (payload: Form_Data) => {
      return client.post("api/setting/create-robot-type", payload);
    },
    onSuccess: async () => {
      messageApi.success(t("utils.success"));
      queryClient.refetchQueries({ queryKey: ["amr-sample"] })
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    },
  });

  const editMutation = useMutation({
    mutationFn: (payload: TableDataType) => {
      return client.post("api/setting/edit-robot-type", payload);
    },
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      queryClient.refetchQueries({ queryKey: ["amr-sample"] })
    },
    onError: (error: Err) => {
      messageApi.error(error.response.data.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      console.log(id,'???????????')
      return client.post("api/setting/delete-robot-type", { id });
    },
    onSuccess: () => {
      messageApi.success(t("utils.success"));
      queryClient.refetchQueries({ queryKey: ["amr-sample"] })
    },
    onError: (error: Err) => {
      messageApi.error(error.response.data.message);
    }
  })

  const handleAdd = () => {
    const values = form.getFieldsValue() as Form_Data;
    createMutation.mutate(values);
  };

  const handleSave = () => {
    const values = form.getFieldsValue() as TableDataType;
    editMutation.mutate({ ...values, id: form.getFieldValue("id")});
  }

  const handleDelete = (record: TableDataType) => {
    const id = record.id
    deleteMutation.mutate(id)
  }

  if(!robotTypes) return;

  const handleEdit = (record: TableDataType) => {
    form.setFieldsValue(record);
    console.log(form.getFieldValue("id"))
    setIsEdit(true);
  };


  const columns: TableProps<TableDataType>["columns"] = [
    {
      title: "id",
      key: "id", 
      dataIndex: "id",
      width: 0,
      hidden: true
    },
    {
      title: t("toolbar.amr_setting.amr_name"),
      key: "name",
      dataIndex: "name",
      width: 100,
      render: (_v: unknown, record: TableDataType) => {
        return (
          <p>{record.name}</p>
        )
      }
    },
    {
      title: t("toolbar.amr_setting.serial_name"),
      key: "value",
      dataIndex: "value",
      width: 100,
      render: (_v: unknown, record: TableDataType) => {
        return (
          <p>{record.value}</p>
        )
      }
    },
    {
      title: t("toolbar.amr_setting.length"),
      key: "length",
      dataIndex: "length",
      width: 50,
      render: (_v: unknown, record: TableDataType) => {
        return (
          <p>{record.length}</p>
        )
      }
    },
    {
      title: t("toolbar.amr_setting.width"),
      key: "width",
      dataIndex: "width",
      width: 50,
      render: (_v: unknown, record: TableDataType) => {
        return (
          <p>{record.width}</p>
        )
      }
    },
    {
      title: t("toolbar.amr_setting.height"),
      key: "height",
      dataIndex: "height",
      width: 50,
      render: (_v: unknown, record: TableDataType) => {
        return (
          <p>{record.height}</p>
        )
      }
    },
    {
      title: "",
      dataIndex: "option",
      key: "option",
      width: 50,
      render: (_v: unknown, record: TableDataType) => {
        return (
          <>
          <Flex gap="small">
              <Button
                onClick={() => handleEdit(record)}
                icon={<EditOutlined />}
                color="primary"
                variant="filled"
                type="link"
              >
                {t("utils.edit")}
              </Button>

              <Popconfirm
                title="Sure to delete?"
                onConfirm={() =>handleDelete(record)}
              >
                <Button
                  icon={<DeleteTwoTone twoToneColor="#f30303" />}
                  color="danger"
                  variant="filled"
                  type="link"
                >
                  {t("utils.delete")}
                </Button>
              </Popconfirm>
            </Flex>
          </>
        )
      }
    }
  ]


  return (
    <>
      <div>
        <h3 className="drop_button_style" {...listeners} {...attributes}>
          {t("toolbar.amr_setting.amr_config")}
        </h3>
        <FormHr />

        <Flex gap="middle" justify="flex-start" align="start" vertical>
        <Form form={form}>
          <Form.Item name="name" label={t("toolbar.amr_setting.amr_name")} rules={[{ required: true }]}>
            <Input placeholder="平衡式" max={999} min={1} />
          </Form.Item>

          <Form.Item name="value" label={t("toolbar.amr_setting.serial_name")} rules={[{ required: true }]}>
            <Input placeholder="anfa-ps14-16" max={999} min={1} />
          </Form.Item>

          <Form.Item name="width" label={t("toolbar.amr_setting.width")} rules={[{ required: true }]}>
            <InputNumber placeholder="1" max={999} min={1} addonAfter={"M"} />
          </Form.Item>

          <Form.Item
            name="length"
            label={t("toolbar.amr_setting.length")}
            rules={[{ required: true }]}
          >
            <InputNumber placeholder="1" max={999} min={1} addonAfter={"M"} />
          </Form.Item>

          <Form.Item
            name="height"
            label={t("toolbar.amr_setting.height")}
            rules={[{ required: true }]}
          >
            <InputNumber placeholder="1" max={999} min={1} addonAfter={"M"} />
          </Form.Item>
        {
          isEdit ? <Button onClick={handleSave}>{t("utils.save")}</Button>:
          <Button onClick={handleAdd}>{t("utils.add")}</Button>
        }
        </Form>
        <Table<TableDataType>
          rowKey={(record) => record.id}
          columns={columns.filter(col => !col.hidden)}
          dataSource={robotTypes}
          ></Table>
        </Flex>
      </div>
    </>
  );
};

export default AmrConfigPanel;
