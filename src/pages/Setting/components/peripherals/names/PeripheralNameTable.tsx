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

interface PeripheralData {
  peripheralNameId: string;
  locationId: string;
  name: string | null;
  description: string | null;
  quantity: number;
  group: {
    id: string;
    name: string;
  }[];
  type: string;
  level: number | null;
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
        value: pg.id,
      })) || [],
    [peripheralGroups],
  );

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
          {dataIndex === "group" ? (
            <Select
              options={peripheralOptions}
              placeholder="Select group"
            ></Select>
          ) : (
            <Input placeholder={`Enter ${title}`} />
          )}
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
  const { data, isLoading, error, refetch } = usePeripheralName();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useTranslation();

  const isEditing = (record: PeripheralData) =>
    record.peripheralNameId === editingKey;

  const updateMutation = useMutation({
    mutationFn: (payload: {
      locationId: string;
      level: number | null;
      peripheralNameId: string;
      name: string | null;
      description: string | null;
      group: string;
      quantity: number;
    }) => {
      return client.post("/api/setting/update-peripheral-name", payload);
    },
    onSuccess: () => {
      messageApi.success("Name updated successfully");
      queryClient.invalidateQueries({ queryKey: ["peripheral-name"] });
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
    form.setFieldsValue({ group: record.group[0]?.id || null });
    setEditingKey(record.peripheralNameId);
  };

  const cancel = () => {
    setEditingKey("");
  };

  const reload = () => {
    refetch();
    messageApi.success("ok");
  };

  const save = async (
    peripheralNameId: string,
    locationId: string,
    level: number | null,
  ) => {
    try {
      const row = (await form.validateFields()) as {
        name: string;
        description: string;
        quantity: number;
        group: string;
      };
      updateMutation.mutate({
        peripheralNameId,
        name: row.name || null,
        locationId,
        level,
        description: row.description,
        group: row.group,
        quantity: row.quantity,
      });
    } catch (errInfo) {
      console.log("Validate Failed:", errInfo);
      messageApi.error("Failed to save changes");
    }
  };

  const columns: TableProps<PeripheralData>["columns"] = [
    {
      title: t("peripheral_name_table.locationId"),
      dataIndex: "locationId",
      sorter: (a, b) => Number(a.locationId) - Number(b.locationId),
      render: (text: string) => <Typography.Text code>{text}</Typography.Text>,
      width: 120,
    },
    {
      title: t("peripheral_name_table.type"),
      dataIndex: "type",
      width: 100,
    },
    {
      title: t("peripheral_name_table.level"),
      dataIndex: "level",
      render: (text: number | null) => (text !== null ? text + 1 : "-"),
      width: 80,
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
      render: (text: { id: string; name: string }[]) =>
        text.map((v) => v.name).join(",") || "-",
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
              onClick={() =>
                save(record.peripheralNameId, record.locationId, record.level)
              }
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
          dataSource={data}
          columns={mergedColumns as []}
          rowClassName="editable-row"
          pagination={{ pageSize: 10 }}
          rowKey="peripheralNameId"
        />
      </Form>
    </>
  );
};

export default PeripheralNameTable;
