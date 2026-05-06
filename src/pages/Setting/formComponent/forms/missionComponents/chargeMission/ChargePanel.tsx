import { FC, useState } from "react";
import { Button, Flex, Form, message, Modal, Popconfirm, Table } from "antd";
import type { TableProps } from "antd";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useMutation } from "@tanstack/react-query";
import useCharge from "@/api/useCharge";
import client from "@/api/axiosClient";
import ChargeForm from "./ChargeForm";
import FormHr from "@/pages/Setting/utils/FormHr";
import {
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Err } from "@/utils/responseErr";

type ChargeData = {
  id: string;
  active: boolean;
  amr: {
    isReal: boolean;
    fullName: string;
    id: string;
  }[];
  aggressiveThreshold: number;
  fullThreshold: number;
  passiveThreshold: number;
  passiveWaitTime: number;
  availableGetTaskThreshold: number;
  autoTimeZone: string;
  titleId: string;
  title: string;
};

type FormData = {
  id: string;
  amrId: string[];
  taskId: string;
  aggressiveThreshold: number;
  fullThreshold: number;
  activeIdle: boolean;
  passiveFullThreshold: number;
  passiveWaitTime: number;
  availableGetTaskThreshold: number;
  activeAuto: boolean;
  autoTimeZone: number;
};

// Industrial Styled Components
const IndustrialContainer = styled.div`
  font-family: "Roboto Mono", monospace;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const PanelHeader = styled.h3`
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-left: 4px solid #faad14;
  padding: 12px 16px;
  margin: 0 0 20px 0;
  font-family: "Roboto Mono", monospace;
  color: #262626;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 14px;
  cursor: move;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: #fffbe6;
    border-left-color: #fa8c16;
  }
`;

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;
  font-weight: 600;
  border-radius: 0;
  transition: all 0.2s ease;

  &.ant-btn-primary {
    background: #1890ff;
    border-color: #1890ff;

    &:hover {
      background: #40a9ff;
      border-color: #40a9ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  }

  &.add-btn {
    background: #52c41a;
    border-color: #52c41a;
    color: #ffffff;

    &:hover {
      background: #73d13d;
      border-color: #73d13d;
      box-shadow: 0 2px 8px rgba(82, 196, 26, 0.4);
    }
  }

  &.reload-btn {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    color: #595959;
    width: 36px;
    min-width: 36px;
    padding: 0;

    &:hover {
      background: #fafafa;
      border-color: #1890ff;
      color: #1890ff;
    }
  }

  &.edit-btn {
    background: #ffffff;
    border: 1px solid #1890ff;
    color: #1890ff;

    &:hover {
      background: #f0f5ff;
      border-color: #40a9ff;
      color: #40a9ff;
    }
  }

  &.activate-btn {
    background: #ffffff;
    border: 1px solid #52c41a;
    color: #52c41a;

    &:hover {
      background: #f6ffed;
      border-color: #73d13d;
      color: #73d13d;
    }
  }

  &.deactivate-btn {
    background: #ffffff;
    border: 1px solid #faad14;
    color: #faad14;

    &:hover {
      background: #fffbe6;
      border-color: #ffc53d;
      color: #ffc53d;
    }
  }

  &.delete-btn {
    background: #ffffff;
    border: 1px solid #ff4d4f;
    color: #ff4d4f;

    &:hover {
      background: #fff1f0;
      border-color: #ff7875;
      color: #ff7875;
    }
  }
`;

const IndustrialTable = styled(Table)`
  .ant-table {
    border: 1px solid #d9d9d9;
    border-radius: 0;
    font-family: "Roboto Mono", monospace;
  }

  .ant-table-thead > tr > th {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    color: #595959;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
    padding: 12px 16px;

    &::before {
      display: none;
    }
  }

  .ant-table-tbody > tr {
    transition: all 0.2s;
    position: relative;

    &:hover {
      background: #fffbe6;

      &::before {
        width: 4px;
      }

      td {
        background: transparent;
      }
    }
  }

  .ant-table-tbody > tr > td {
    border-bottom: 1px solid #f0f0f0;
    padding: 12px 16px;
    font-size: 12px;
  }
`;

const IndustrialModal = styled(Modal)`
  .ant-modal-content {
    background: #ffffff;
    border: 2px solid #d9d9d9;
    border-radius: 0;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .ant-modal-header {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    border-left: 4px solid #faad14;
    padding: 16px 24px;
    border-radius: 0;
  }

  .ant-modal-title {
    color: #faad14;
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: "Roboto Mono", monospace;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ant-modal-body {
    padding: 24px;
  }

  .ant-modal-footer {
    border-top: 1px solid #d9d9d9;
    padding: 16px 24px;

    .ant-btn {
      font-family: "Roboto Mono", monospace;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 1px;
      height: 36px;
      font-weight: 600;
      border-radius: 0;
    }
  }
`;

const StatusBadge = styled.div<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: ${({ $active }) => ($active ? "#f6ffed" : "#fff1f0")};
  border: 1px solid ${({ $active }) => ($active ? "#52c41a" : "#ff4d4f")};
  color: ${({ $active }) => ($active ? "#52c41a" : "#ff4d4f")};
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const StatusDot = styled.div<{ $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $active }) => ($active ? "#52c41a" : "#ff4d4f")};
  box-shadow: 0 0 8px
    ${({ $active }) =>
      $active ? "rgba(82, 196, 26, 0.5)" : "rgba(255, 77, 79, 0.5)"};
`;

const ThresholdValue = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  padding: 2px 8px;
  background: #e6f7ff;
  border: 1px solid #1890ff;
  color: #1890ff;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 700;
`;

const AmrList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const AmrTag = styled.span`
  padding: 2px 8px;
  background: #fafafa;
  border: 1px solid #d9d9d9;
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  color: #595959;
  text-transform: uppercase;
`;

const ChargePanel: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const { data, refetch } = useCharge();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [selectKey, setSelectKey] = useState("");
  const [messageApi, contextHolders] = message.useMessage();

  const showModal = (id: string) => {
    setSelectKey(id);
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (payload: FormData) => {
      return client.post("api/setting/save-charge-mission", payload);
    },
    onSuccess() {
      void refetch();
      form.resetFields();
      setOpen(false);
    },
    onError(error: Err) {
      messageApi.error(error.response.data.message);
    },
  });

  const handleSave = () => {
    const payload = form.getFieldsValue() as FormData;

    const newPayload = {
      ...payload,
      id: selectKey,
    };

    if (!Array.isArray(newPayload.amrId) || newPayload.amrId.length === 0) {
      messageApi.warning(t("mission.charge_mission.amr_warn"));
      return;
    }

    if (
      !newPayload.taskId ||
      typeof newPayload.taskId !== "string" ||
      newPayload.taskId.trim() === ""
    ) {
      messageApi.warning(t("mission.charge_mission.mission_warn"));
      return;
    }

    if (
      typeof newPayload.aggressiveThreshold !== "number" ||
      isNaN(newPayload.aggressiveThreshold) ||
      newPayload.aggressiveThreshold <= 0
    ) {
      messageApi.warning(t("mission.charge_mission.aggressive_warn"));
      return;
    }

    if (
      typeof newPayload.fullThreshold !== "number" ||
      isNaN(newPayload.fullThreshold) ||
      newPayload.fullThreshold <= newPayload.aggressiveThreshold
    ) {
      messageApi.warning(t("mission.charge_mission.full_less_than_aggressive"));
      return;
    }

    if (
      typeof newPayload.availableGetTaskThreshold !== "number" ||
      isNaN(newPayload.availableGetTaskThreshold) ||
      newPayload.availableGetTaskThreshold <= newPayload.aggressiveThreshold
    ) {
      messageApi.warning(
        t("mission.charge_mission.available_less_than_aggressive")
      );
      return;
    }

    if (
      newPayload.availableGetTaskThreshold === 0 ||
      newPayload.availableGetTaskThreshold === null
    ) {
      messageApi.warning(t("mission.charge_mission.aggressive_warn"));
      return;
    }

    saveMutation.mutate(newPayload);
  };

  const handleCancel = () => {
    form.resetFields();
    setOpen(false);
  };

  const addMutation = useMutation({
    mutationFn: () => {
      return client.post("api/setting/add-charge-mission");
    },
    onSuccess() {
      void refetch();
    },
  });

  const activeMutation = useMutation({
    mutationFn: (payload: { active: boolean; id: string; amrId: string[] }) => {
      return client.post("api/setting/active-charge-mission", payload);
    },
    onSuccess() {
      void refetch();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string; amrId: string[] }) => {
      return client.post("api/setting/delete-charge-mission", payload);
    },
    onSuccess() {
      void refetch();
    },
  });

  const handleAdd = () => {
    addMutation.mutate();
  };

  const handleActive = (event: boolean, id: string, amrId: string[]) => {
    activeMutation.mutate({ active: event, id, amrId });
  };

  const handleDelete = (id: string, amrId: string[]) => {
    deleteMutation.mutate({ id, amrId });
  };

  const columns: TableProps<ChargeData>["columns"] = [
    {
      title: t("charge.active"),
      dataIndex: "active",
      key: "active",
      width: 140,
      render: (_v, record) => {
        return (
          <StatusBadge $active={record.active}>
            <StatusDot $active={record.active} />
            {record.active
              ? t("mission.charge_mission.executing")
              : t("mission.charge_mission.stale")}
          </StatusBadge>
        );
      },
    },
    {
      title: t("charge.name"),
      dataIndex: "name",
      key: "name",
      render(_, record) {
        return (
          <Flex align="center" gap="small">
            <ThunderboltOutlined style={{ color: "#faad14" }} />
            <span style={{ fontWeight: 600 }}>{record.title}</span>
          </Flex>
        );
      },
    },
    {
      title: t("charge.amrId"),
      dataIndex: "amrId",
      key: "amrId",
      render(_, record) {
        return (
          <AmrList>
            {record.amr.map((v, idx) => (
              <AmrTag key={idx}>{v.fullName}</AmrTag>
            ))}
          </AmrList>
        );
      },
    },
    {
      title: t("charge.aggressive"),
      dataIndex: "aggressive",
      key: "aggressive",
      render(_, record) {
        return <ThresholdValue>{record.aggressiveThreshold}%</ThresholdValue>;
      },
    },
    {
      title: t("charge.passiveThreshold"),
      dataIndex: "passiveThreshold",
      key: "passiveThreshold",
      render(_, record) {
        return <ThresholdValue>{record.passiveThreshold}%</ThresholdValue>;
      },
    },
    {
      title: t("charge.full_rate"),
      dataIndex: "fullThreshold",
      key: "fullThreshold",
      render(_, record) {
        return <ThresholdValue>{record.fullThreshold}%</ThresholdValue>;
      },
    },
    {
      title: t("charge.available_get_task"),
      dataIndex: "aggressiveThreshold",
      key: "aggressiveThreshold",
      render(_, record) {
        return (
          <ThresholdValue>{record.availableGetTaskThreshold}%</ThresholdValue>
        );
      },
    },
    {
      title: "Actions",
      dataIndex: "action",
      key: "action",
      width: 300,
      render(_, record) {
        return (
          <Flex gap="small" wrap="wrap">
            <IndustrialButton
              className="edit-btn"
              onClick={() => showModal(record.id)}
              icon={<EditOutlined />}
              size="small"
            >
              Edit
            </IndustrialButton>
            {record.active ? (
              <IndustrialButton
                className="deactivate-btn"
                onClick={() =>
                  handleActive(
                    false,
                    record.id,
                    record.amr.map((v) => v.fullName)
                  )
                }
                icon={<CloseCircleOutlined />}
                size="small"
              >
                Stop
              </IndustrialButton>
            ) : (
              <IndustrialButton
                className="activate-btn"
                onClick={() =>
                  handleActive(
                    true,
                    record.id,
                    record.amr.map((v) => v.fullName)
                  )
                }
                icon={<PlayCircleOutlined />}
                size="small"
              >
                Start
              </IndustrialButton>
            )}
            <Popconfirm
              title="Delete charge mission?"
              description="Are you sure you want to delete this charge mission?"
              onConfirm={() =>
                handleDelete(
                  record.id,
                  record.amr.map((v) => v.fullName)
                )
              }
              okText="Yes"
              cancelText="No"
            >
              <IndustrialButton
                className="delete-btn"
                icon={<DeleteOutlined />}
                size="small"
              >
                Delete
              </IndustrialButton>
            </Popconfirm>
          </Flex>
        );
      },
    },
  ];

  return (
    <>
      {contextHolders}
      <IndustrialContainer>
        <PanelHeader {...listeners} {...attributes}>
          <ThunderboltOutlined />
          {t("mission.charge_mission.charge_mission")}
        </PanelHeader>
        <FormHr />

        <Flex gap="middle" justify="flex-start" align="start" vertical>
          <Flex gap="middle">
            <IndustrialButton
              className="add-btn"
              onClick={() => handleAdd()}
              icon={<PlusOutlined />}
            >
              {t("utils.add")}
            </IndustrialButton>

            <IndustrialButton
              className="reload-btn"
              onClick={() => refetch()}
              icon={<ReloadOutlined />}
            />
          </Flex>

          <IndustrialTable
            rowKey={(record: any) => record.id}
            columns={columns as []}
            dataSource={data as ChargeData[]}
            pagination={{
              pageSize: 10,
              showTotal: (total, range) => (
                <span style={{ fontFamily: "Roboto Mono, monospace" }}>
                  {range[0]}-{range[1]} of {total}
                </span>
              ),
            }}
          />
        </Flex>
      </IndustrialContainer>

      {open && (
        <IndustrialModal
          width={900}
          title={
            <>
              <ThunderboltOutlined />
              {t("mission.charge_mission.charge_mission")}
            </>
          }
          open={open}
          onOk={() => handleSave()}
          onCancel={handleCancel}
          okText="Save"
          cancelText="Cancel"
          confirmLoading={saveMutation.isLoading}
        >
          <ChargeForm form={form} selectKey={selectKey} />
        </IndustrialModal>
      )}
    </>
  );
};

export default ChargePanel;
