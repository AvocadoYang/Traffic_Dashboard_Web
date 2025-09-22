import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Form,
  Input,
  Modal,
  Transfer,
  TransferProps,
  message,
} from "antd";
import { useTranslation } from "react-i18next";
import usePeripheralName from "@/api/usePeripheralName";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import { PeripheralGroupName } from "@/api/usePeripheralGroup";
import { prefixLevelName } from "@/utils/globalFunction";

interface AddModalProps {
  isOpenModal: boolean;
  isEdit: boolean;
  editValue: PeripheralGroupName | null;
  resetEdit: () => void;
}

const AddModal: React.FC<AddModalProps> = ({
  isOpenModal,
  isEdit,
  editValue,
  resetEdit,
}) => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const { data: peripherals } = usePeripheralName();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  // Transform peripherals data for Transfer component
  const transferDataSource = useMemo(
    () =>
      peripherals
        ?.filter((v) => v.name)
        .map((v) => ({
          key: v.peripheralNameId,
          title: v.name as string,
          description: `${t("sim.timeline.location")}: ${v.locationId} | ${t("sim.timeline.type")}: ${v.type}${
            v.level !== null && v.level !== undefined
              ? ` | ${t("sim.timeline.level")}: ${v.level + 1}`
              : ""
          }`,
        }))
        .sort((a, b) => a.title.localeCompare(b.title)) || [],
    [peripherals, t],
  );

  const [targetKeys, setTargetKeys] = useState<TransferProps["targetKeys"]>(
    transferDataSource as [],
  );
  const [selectedKeys, setSelectedKeys] = useState<TransferProps["targetKeys"]>(
    [],
  );

  const onChange: TransferProps["onChange"] = (
    nextTargetKeys,
    direction,
    moveKeys,
  ) => {
    //  console.log("targetKeys:", nextTargetKeys);
    //   console.log("direction:", direction);
    //   console.log("moveKeys:", moveKeys);
    setTargetKeys(nextTargetKeys);
  };

  const onSelectChange: TransferProps["onSelectChange"] = (
    sourceSelectedKeys,
    targetSelectedKeys,
  ) => {
    // console.log("sourceSelectedKeys:", sourceSelectedKeys);
    // console.log("targetSelectedKeys:", targetSelectedKeys);
    setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
  };

  const addMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      description: string | null;
      peripheralNameIds: string[];
    }) => {
      return client.post("/api/setting/add-peripheral-group", payload);
    },
    onSuccess: () => {
      messageApi.success("success");
      queryClient.invalidateQueries({ queryKey: ["peripheral-group"] });
      queryClient.invalidateQueries({ queryKey: ["peripheral-corning"] });
      form.resetFields();
      handleCancel();
    },
    onError: (e: ErrorResponse) => {
      errorHandler(e, messageApi);
    },
  });

  const editMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      name: string;
      description: string | null;
      peripheralNameIds: string[];
    }) => {
      return client.post("/api/setting/edit-peripheral-group", payload);
    },
    onSuccess: () => {
      messageApi.success("Updated successfully");
      queryClient.invalidateQueries({ queryKey: ["peripheral-group"] });
      queryClient.invalidateQueries({ queryKey: ["peripheral-corning"] });
      form.resetFields();
      handleCancel();
    },
    onError: (e: ErrorResponse) => {
      errorHandler(e, messageApi);
    },
  });
  // console.log(targetKeys)
  const handleSubmit = async () => {
    try {
      if (!targetKeys || targetKeys.length == 0) {
        messageApi.error("peripheral is require !");
        return;
      }
      const values = await form.validateFields();

      if (!values.name) {
        messageApi.error("name is require !");
        return;
      }
      const safeTargetKeys = targetKeys.filter(
        (k): k is string => typeof k === "string",
      );
      if (isEdit && editValue?.id) {
        editMutation.mutate({
          id: editValue.id,
          name: values.name,
          description: values.description || null,
          peripheralNameIds: safeTargetKeys,
        });
      } else {
        addMutation.mutate({
          name: values.name,
          description: values.description || null,
          peripheralNameIds: safeTargetKeys,
        });
      }
    } catch (errInfo) {
      console.log("Submit Failed:", errInfo);
      messageApi.error("field has miss data");
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedKeys([]);
    setTargetKeys([]);
    resetEdit();
  };

  // Corrected useEffect hook
  useEffect(() => {
    if (!isEdit || !editValue) {
      form.resetFields();
      return;
    }

    form.setFieldsValue({
      name: editValue.name,
      description: editValue.description,
      peripherals: editValue.peripherals || [],
    });

    // Fix: Change v.id to v.key to correctly access the unique identifier
    setTargetKeys(editValue.peripherals.map((v) => v.id));
  }, [form, isEdit, editValue]);

  const renderTransferItem = (item: {
    key: string;
    title: string;
    description: string;
  }) => {
    return (
      <div>
        <div style={{ fontWeight: 500 }}>{item.title}</div>
        <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
          {item.description}
        </div>
      </div>
    );
  };

  if (!isOpenModal) return null;

  return (
    <>
      {contextHolder}
      <Modal
        width={1000}
        open={isOpenModal}
        title={
          isEdit
            ? t("peripheral_group_table.edit_title")
            : t("peripheral_group_table.add_title")
        }
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            {t("peripheral_name_table.cancel")}
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleSubmit}
            loading={addMutation.isPending || editMutation.isPending}
          >
            {t("peripheral_name_table.save")}
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t("peripheral_name_table.name")}
            rules={[
              {
                required: true,
                message: t("peripheral_name_table.inputPlaceholder", {
                  title: t("peripheral_name_table.name"),
                }),
              },
            ]}
          >
            <Input
              placeholder={t("peripheral_name_table.inputPlaceholder", {
                title: t("peripheral_name_table.name"),
              })}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label={t("peripheral_group_table.description")}
          >
            <Input
              placeholder={t("peripheral_name_table.inputPlaceholder", {
                title: t("peripheral_group_table.description"),
              })}
            />
          </Form.Item>

          <Form.Item
            name="peripherals"
            label={t("peripheral_group_table.peripherals")}
            rules={[
              {
                required: true,
                message: t("utils.required"),
              },
            ]}
          >
            <Transfer
              dataSource={transferDataSource}
              targetKeys={targetKeys}
              selectedKeys={selectedKeys}
              onChange={onChange}
              onSelectChange={onSelectChange}
              render={renderTransferItem}
              listStyle={{ width: 400, height: 400 }}
              titles={[
                t("peripheral_group_table.available_peripherals"),
                t("peripheral_group_table.selected_peripherals"),
              ]}
              showSearch
              filterOption={(inputValue, item) =>
                item.title.toLowerCase().includes(inputValue.toLowerCase()) ||
                item.description
                  .toLowerCase()
                  .includes(inputValue.toLowerCase())
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AddModal;
