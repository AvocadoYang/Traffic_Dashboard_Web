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
  DeleteTwoTone,
  EditOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
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

const BtnBox = styled.div`
  width: 3em;
`;

const ActiveBox = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
`;

type DotStyle = {
  $active: boolean;
};

const Dot = styled.div<DotStyle>`
  border-radius: 99%;
  width: 7px;
  height: 7px;
  background-color: ${(prop) => (prop.$active ? "#2bea00" : "#ff1818")};
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
      width: 100,
      render: (_v, record) => {
        return (
          <ActiveBox>
            <Dot $active={record.active} />{" "}
            <>
              {record.active === true
                ? t("mission.charge_mission.executing")
                : t("mission.charge_mission.stale")}
            </>
          </ActiveBox>
        );
      },
    },
    {
      title: t("charge.name"),
      dataIndex: "name",
      key: "name",
      render(_, record) {
        return <>{record.title}</>;
      },
    },
    {
      title: t("charge.amrId"),
      dataIndex: "amrId",
      key: "amrId",
      render(_, record) {
        return <>{record.amr.map((v) => v.fullName)}</>;
      },
    },
    {
      title: t("charge.aggressive"),
      dataIndex: "aggressive",
      key: "aggressive",
      render(_, record) {
        return <>{record.aggressiveThreshold}</>;
      },
    },
    {
      title: t("charge.passiveThreshold"),
      dataIndex: "passiveThreshold",
      key: "passiveThreshold",
      render(_, record) {
        return <>{record.passiveThreshold}</>;
      },
    },
    {
      title: t("charge.full_rate"),
      dataIndex: "fullThreshold",
      key: "fullThreshold",
      render(_, record) {
        return <>{record.fullThreshold}</>;
      },
    },
    {
      title: t("charge.available_get_task"),
      dataIndex: "aggressiveThreshold",
      key: "aggressiveThreshold",
      render(_, record) {
        return <>{record.availableGetTaskThreshold}</>;
      },
    },

    {
      title: "",
      dataIndex: "action",
      key: "action",
      render(_, record) {
        return (
          <>
            <Flex gap="small">
              <Button
                onClick={() => showModal(record.id)}
                icon={<EditOutlined />}
                color="primary"
                variant="filled"
                type="link"
              >
                {t("utils.edit")}
              </Button>
              {record.active ? (
                <Button
                  onClick={() =>
                    handleActive(
                      false,
                      record.id,
                      record.amr.map((v) => v.fullName)
                    )
                  }
                  icon={<CloseCircleOutlined />}
                  color="default"
                  variant="filled"
                  type="link"
                >
                  {t("utils.inactive")}
                </Button>
              ) : (
                <Button
                  onClick={() =>
                    handleActive(
                      true,
                      record.id,
                      record.amr.map((v) => v.fullName)
                    )
                  }
                  icon={<PlayCircleOutlined />}
                  color="primary"
                  variant="filled"
                  type="link"
                >
                  {t("utils.active")}
                </Button>
              )}

              <Popconfirm
                title="Sure to delete?"
                onConfirm={() =>
                  handleDelete(
                    record.id,
                    record.amr.map((v) => v.fullName)
                  )
                }
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
        );
      },
    },
  ];

  return (
    <>
      {contextHolders}
      <div>
        <h3 className="drop_button_style" {...listeners} {...attributes}>
          {t("mission.charge_mission.charge_mission")}
        </h3>
        <FormHr />

        <Flex gap="middle" justify="flex-start" align="start" vertical>
          <Flex gap="large">
            <Button
              onClick={() => handleAdd()}
              icon={<PlusOutlined />}
              color="primary"
              variant="filled"
            >
              {t("utils.add")}
            </Button>

            <Button
              onClick={() => refetch()}
              icon={<ReloadOutlined></ReloadOutlined>}
            ></Button>
          </Flex>

          <Table
            rowKey={(record) => record.id}
            columns={columns}
            dataSource={data as ChargeData[]}
          />
        </Flex>
      </div>
      {open ? (
        <Modal
          width={900}
          title={t("mission.charge_mission.charge_mission")}
          open={open}
          onOk={() => handleSave()}
          onCancel={handleCancel}
        >
          <ChargeForm form={form} selectKey={selectKey} />
        </Modal>
      ) : (
        []
      )}
    </>
  );
};

export default ChargePanel;
