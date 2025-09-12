import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Flex,
  Form,
  Input,
  Popconfirm,
  Select,
  Table,
  Typography,
  message,
} from "antd";
import type { TableProps } from "antd";
import usePeripheralName from "@/api/usePeripheralName";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import usePeripheralGroup from "@/api/usePeripheralGroup";
import useCorningPeripheralFormat from "@/api/useCorningPeripheralFormat";
import { EndpointStatus } from "@/types/corning";

interface PeripheralData {
  id: string;
  name: string;
  description: string;
  group: string;
  status: EndpointStatus;
  quantity: number;
  peripheralNameDBId: string;
  level: number
}

const StyledTable = styled(Table)`
  .ant-table-thead > tr > th {
    background: #f0f2f5;
    font-weight: 500;
    color: #333;
    border-bottom: 2px solid #e8e8e8;
  }

  .ant-table-tbody > tr:hover > td {
    background: #fafafa;
  }

  .ant-table-cell {
    padding: 12px;
    font-size: 14px;
  }
`;

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
  editing: boolean;
  dataIndex: string;
  title: string;
  record: PeripheralData;
  index: number;
}
  const options = [
    { value: 0, label: "UNDEFINED" },
    { value: 10, label: "OFFLINE" },
    { value: 20, label: "EMPTY_AVAILABLE_FOR_RECEIVING"  },
    { value: 30, label: "EMPTY_ITEM_RESERVED" ,disabled: true },
    { value: 31, label: "EMPTY_DEFECT_ITEM_RESERVED",disabled: true  },
    { value: 40, label: "EMPTY_NOT_AVAILABLE"  },
    { value: 50, label: "OCCUPIED_AVAILABLE_FOR_PICKUP"  },
    { value: 60, label: "OCCUPIED_ITEM_PICKUP_RESERVED" ,disabled: true },
    { value: 70, label: "OCCUPIED_NOT_AVAILABLE" },
  ];

  const statusRecord = options.reduce<Record<number, string>>((acc, option) => {
    acc[option.value] = option.label;
    return acc;
  }, {});

const EditableCell: React.FC<React.PropsWithChildren<EditableCellProps>> = ({
  editing,
  dataIndex,
  title,
  record,
  index,
  children,
  ...restProps
}) => {
  const { data: peripheralGroups } = usePeripheralGroup();
  const peripheralOptions = useMemo(
    () =>
      peripheralGroups?.map((pg) => ({
        label: pg.name,
        value:  pg.name,
      })) || [],
    [peripheralGroups],
  );



  let inputNode;

  if (dataIndex === "group") {
    inputNode = (
      <Select options={peripheralOptions} placeholder="Select group"></Select>
    );
  } else if (dataIndex === "status") {
    inputNode = (
      <Select options={options} placeholder="Select status"></Select>
    );
  } else if (dataIndex === "quantity") {
    inputNode = <Input type="number" placeholder={`Enter ${title}`} />;
  } else {
    inputNode = <Input placeholder={`Enter ${title}`} />;
  }

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[
            {
              required: false,
              message: `Please input ${title}!`,
            },
          ]}
        >
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

const PeripheralNameTable: React.FC = () => {
  const [form] = Form.useForm();
  const [editingKey, setEditingKey] = useState<string>("");
  const { data, isLoading, error, refetch } = useCorningPeripheralFormat(null);
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();



  const isEditing = (record: PeripheralData) => record.id === editingKey;

  const updateMutation = useMutation({
    mutationFn: (payload: PeripheralData) => {
      return client.post("/api/setting/update-peripheral-name", payload);
    },
    onSuccess: () => {
      messageApi.success("Name updated successfully");
      queryClient.invalidateQueries({ queryKey: ["peripheral-name"] });
      refetch()
      setEditingKey("");
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const syncMutation = useMutation({
    mutationFn: () => {
      return client.post("/api/wcs/sync-with-corning");
    },
    onSuccess: () => {
      messageApi.success("sync successfully");
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleSync = () => {
    syncMutation.mutate();
  };

  const edit = (record: PeripheralData) => {
    form.setFieldsValue({ name: record.name || "" });
    form.setFieldsValue({ description: record.description || "" });
    form.setFieldsValue({ quantity: record.quantity });
    form.setFieldsValue({ group: record.group || null });
    form.setFieldsValue({ status: record.status });
    setEditingKey(record.id)
  };

  const cancel = () => {
    setEditingKey("");
  };

  const reload = () => {
    refetch();
    messageApi.success("ok");
  };

  const save = async ( peripheralNameDBId: string,locationId: string, level: number) => {
    try {
      const row = (await form.validateFields()) as {
        name: string;
        description: string;
        quantity: number;
        group: string;
        status: EndpointStatus;
      };
     // console.log(peripheralNameDBId,locationId)
      updateMutation.mutate({
        id: locationId,
        name: row.name,
        description: row.description,
        group: row.group,
        quantity: row.quantity,
        status: row.status,
        peripheralNameDBId,
        level,
      });
    } catch (errInfo) {
      console.log("Validate Failed:", errInfo);
      messageApi.error("Failed to save changes");
    }
  };

  const columns: TableProps<PeripheralData>["columns"] = [
    {
      title: t("peripheral_name_table.locationId"),
      dataIndex: "id",
      sorter: (a, b) => Number(a.id) - Number(b.id),
      render: (text: string) => <Typography.Text code>{text}</Typography.Text>,
      width: 120,
    },
    {
      title: "status",
      dataIndex: "status",
      editable: true,
      width: 270,
          render: (text: number) => <Typography.Text code>{statusRecord[text]}</Typography.Text>,
    },
    {
      title: t("peripheral_name_table.name"),
      dataIndex: "name",
      editable: true,
      render: (text: string | null) => text || "-",
      width: 200,
    },
    {
      title: t("peripheral_name_table.description"),
      dataIndex: "description",
      editable: true,
      render: (text: string | null) => text || "-",
      width: 250,
    },
    {
      title: t("peripheral_name_table.group"),
      dataIndex: "group",
      editable: true,
       render: (text: string) => <Typography.Text code>{text}</Typography.Text>,
      width: 250,
    },
    {
      title: "quantity",
      dataIndex: "quantity",
      editable: true,
      width: 50,
    },
    {
      title: t("peripheral_name_table.operation"),
      dataIndex: "operation",
      render: (_: any, record: PeripheralData) => {
        const editable = isEditing(record);
        return editable ? (
          <span>
            <Typography.Link
              onClick={() => save( record.peripheralNameDBId,record.id, record.level)}
              style={{ marginInlineEnd: 8 }}
            >
              {t("utils.save")}
            </Typography.Link>
            <a onClick={cancel}>{t("utils.cancel")}</a>
          </span>
        ) : (
          <Typography.Link
            disabled={editingKey !== ""}
            onClick={() => edit(record)}
          >
            {t("utils.edit")}
          </Typography.Link>
        );
      },
      width: 150,
    },
  ];

  const mergedColumns: TableProps<PeripheralData>["columns"] = columns?.map(
    (col) => {
      if (!col.editable) {
        return col;
      }
      return {
        ...col,
        onCell: (record: PeripheralData) => ({
          record,
          dataIndex: col.dataIndex,
          title: col.title,
          editing: isEditing(record),
        }),
      };
    },
  );

  if (error) {
    return <div>Error loading data: {error.message}</div>;
  }

  return (
    <>
      {contextHolder}

      <Flex gap="middle">
        <Button onClick={reload} style={{ marginBottom: 16 }}>
          {t("peripheral_name_table.reload")}
        </Button>

        <Button onClick={handleSync} style={{ marginBottom: 16 }}>
          SYNC WITH CORNING
        </Button>
      </Flex>

      <Form form={form} component={false}>
        <StyledTable
          components={{
            body: { cell: EditableCell },
          }}
          bordered
          loading={isLoading}
          dataSource={data?.payload}
          columns={mergedColumns as []}
          rowClassName="editable-row"
          pagination={{ pageSize: 10 }}
          rowKey={(record:PeripheralData)=> record.id }
        />
      </Form>
    </>
  );
};

export default PeripheralNameTable;
