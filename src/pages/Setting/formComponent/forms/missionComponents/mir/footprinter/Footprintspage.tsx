import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
  Button,
  Drawer,
  Flex,
  Form,
  Input,
  Select,
  Table,
  Tooltip,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  QuestionCircleOutlined,
  SearchOutlined,
  EyeOutlined,
  LeftOutlined,
  RightOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  DeleteFilled,
} from "@ant-design/icons";
import { FootprintEditor, type FootprintRecord } from "./FootprintEditor";
import { useFootprint } from "@/api/useFootprint";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

/* ------------------------------------------------------------------ */
/*  Types & mock data                                                  */
/* ------------------------------------------------------------------ */

type ProductKey = "MIR250";

const PRODUCT_LABEL: Record<ProductKey, string> = {
  MIR250: "MiR250",
};

/** Starting footprint shape handed to the editor for each config_id family. */
const PRODUCT_TEMPLATE: Record<ProductKey, { points: string; height: number }> =
  {
    MIR250: {
      points: "[[0.54,-0.38],[0.54,0.38],[-0.54,0.38],[-0.54,-0.38]]",
      height: 1.4,
    },
  };

interface FootprintRow {
  id?: string;
  name: string;
  config_id: ProductKey;
  height: number;
  footprint_points: string;
}

/* ------------------------------------------------------------------ */
/*  Styled components                                                  */
/* ------------------------------------------------------------------ */

const PageWrap = styled.div`
  background: #eef0f4;
  min-height: 100%;
  padding: 24px;
  box-sizing: border-box;
  font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e2a4a;
`;

const HelpIcon = styled(QuestionCircleOutlined)`
  color: #98a2b3;
  font-size: 16px;
`;

const CreateButton = styled(Button)`
  background: #1e2a4a;
  border-color: #1e2a4a;

  &:hover,
  &:focus {
    background: #2a3a63 !important;
    border-color: #2a3a63 !important;
  }
`;

const Card = styled.div`
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.06);
  overflow: hidden;
`;

const ToolRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
`;

const SearchInput = styled(Input)`
  max-width: 420px;
  border-radius: 8px;
`;

const PaginationBar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const PageNavButton = styled.button`
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #475467;
  border-radius: 6px;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #f2f4f7;
  }
  &:disabled {
    color: #d0d5dd;
    cursor: not-allowed;
  }
`;

const PrevNextButton = styled(Button)`
  font-weight: 500;
`;

const PagePill = styled.div`
  min-width: 52px;
  text-align: center;
  padding: 4px 10px;
  background: #eef2ff;
  color: #1e2a4a;
  font-weight: 600;
  border-radius: 6px;
  font-size: 13px;
`;

const ActionButton = styled(Button)`
  background: #f2f4f7;
  border-color: #f2f4f7;
  color: #475467;

  &:hover {
    background: #e4e7ec !important;
    border-color: #e4e7ec !important;
    color: #1e2a4a !important;
  }
`;

const DrawerIntro = styled.p`
  color: #475467;
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 20px 0;
`;

const FieldHint = styled.div`
  color: #98a2b3;
  font-size: 12.5px;
  font-weight: 400;
  margin-top: 2px;
`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 8;

export const FootprintsPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [view, setView] = useState<"list" | "editor">("list");
  const [activeRow, setActiveRow] = useState<FootprintRow | null>(null);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const { data = [], refetch } = useFootprint();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: FootprintRow) =>
      client.post<{ ok: string; id: string }>(
        "api/setting/create-footprint",
        payload,
      ),
    onSuccess: async (_res, variables) => {
      messageApi.success(`已建立「${variables.name}」`);
      refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const editMutation = useMutation({
    mutationFn: (payload: FootprintRow) =>
      client.post("api/setting/edit-footprint", payload),
    onSuccess: async (_res, variables) => {
      messageApi.success(`已儲存「${variables.name}」`);
      refetch();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return client.post("api/setting/delete-footprint", { id: id });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["footprint"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  useEffect(() => {
    setCurrent(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));

  const openEditorFor = (row: FootprintRow) => {
    setActiveRow(row);
    setView("editor");
  };

  const handleCreateSubmit = async () => {
    let values: { name: string; config_id: ProductKey };
    try {
      values = await form.validateFields();
    } catch {
      /* validation errors are shown inline by antd */
      return;
    }

    const config_id = values.config_id;
    const template = PRODUCT_TEMPLATE[config_id];
    const newRow: FootprintRow = {
      name: values.name.trim(),
      config_id,
      height: template.height,
      footprint_points: template.points,
    };

    try {
      // wait for the server to actually confirm creation (and hand back
      // the generated id) before ever leaving the drawer / list screen
      const res = await createMutation.mutateAsync(newRow);
      setDrawerOpen(false);
      form.resetFields();
      openEditorFor({ ...newRow, id: res.data?.id });
    } catch {
      // createMutation's onError already showed the reason (e.g. duplicate
      // name) — keep the drawer open so the user can fix it and retry
    }
  };

  const handleEditorSave = async (next: FootprintRecord) => {
    if (!activeRow?.id) {
      messageApi.error("找不到這筆 footprint 的 ID，無法儲存");
      return;
    }
    try {
      await editMutation.mutateAsync({
        ...next,
        id: activeRow.id,
      } as FootprintRow);
      setView("list");
      setActiveRow(null);
    } catch {
      // editMutation's onError already showed the reason — stay on the
      // editor screen so the user doesn't lose their in-progress edits
    }
  };

  const columns: ColumnsType<FootprintRow> = [
    {
      title: "Name",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, row) => (
        <a onClick={() => openEditorFor(row)}>{name}</a>
      ),
    },
    {
      title: "Product",
      dataIndex: "config_id",
      render: (p: ProductKey) => PRODUCT_LABEL[p],
    },
    {
      title: "Height",
      dataIndex: "height",
      sorter: (a, b) => a.height - b.height,
    },
    {
      title: "Actions",
      dataIndex: "actions",
      align: "right",
      render: (_: unknown, row) => (
        <Flex>
          <Tooltip title="檢視 / 編輯">
            <ActionButton
              icon={<EyeOutlined />}
              onClick={() => openEditorFor(row)}
            />
          </Tooltip>

          <Tooltip title="摧毀">
            <ActionButton
              onClick={() => {
                if (row.id) {
                  deleteMutation.mutate(row.id);
                }
              }}
              icon={<DeleteFilled />}
            ></ActionButton>
          </Tooltip>
        </Flex>
      ),
    },
  ];

  if (view === "editor") {
    const editorData: FootprintRecord | undefined = activeRow
      ? {
          id: activeRow.id,
          name: activeRow.name,
          config_id: activeRow.config_id,
          footprint_points: activeRow.footprint_points,
          height: activeRow.height,
        }
      : undefined;

    return (
      <PageWrap style={{ height: "calc(100vh - 48px)" }}>
        <div style={{ height: "100%" }}>
          <FootprintEditor
            data={editorData}
            onBack={() => {
              setView("list");
              setActiveRow(null);
            }}
            onSave={handleEditorSave}
            messageApi={messageApi}
          />
        </div>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      {contextHolder}
      <HeaderRow>
        <TitleGroup>
          <Title>Footprints</Title>
          <Tooltip title="定義機器人外框的形狀">
            <HelpIcon />
          </Tooltip>
        </TitleGroup>
        <CreateButton type="primary" onClick={() => setDrawerOpen(true)}>
          Create
        </CreateButton>
      </HeaderRow>

      <Card>
        <ToolRow>
          <SearchInput
            placeholder="Search"
            prefix={<SearchOutlined style={{ color: "#98a2b3" }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />

          <PaginationBar>
            <PageNavButton
              disabled={current === 1}
              onClick={() => setCurrent(1)}
            >
              <DoubleLeftOutlined />
            </PageNavButton>
            <PrevNextButton
              disabled={current === 1}
              onClick={() => setCurrent((c) => Math.max(1, c - 1))}
            >
              <LeftOutlined /> Previous
            </PrevNextButton>
            <PagePill>
              {current} / {totalPages}
            </PagePill>
            <PrevNextButton
              disabled={current === totalPages}
              onClick={() => setCurrent((c) => Math.min(totalPages, c + 1))}
            >
              Next <RightOutlined />
            </PrevNextButton>
            <PageNavButton
              disabled={current === totalPages}
              onClick={() => setCurrent(totalPages)}
            >
              <DoubleRightOutlined />
            </PageNavButton>
          </PaginationBar>
        </ToolRow>

        <Table<FootprintRow>
          rowKey="id"
          columns={columns}
          dataSource={data}
          pagination={{
            current,
            pageSize: PAGE_SIZE,
            total: data.length,
            onChange: setCurrent,
            style: { display: "none" },
          }}
        />
      </Card>

      <Drawer
        title="Create footprint"
        placement="right"
        width={480}
        open={drawerOpen}
        closable={!createMutation.isPending}
        maskClosable={!createMutation.isPending}
        onClose={() => {
          if (createMutation.isPending) return;
          setDrawerOpen(false);
          form.resetFields();
        }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <CreateButton
              type="primary"
              loading={createMutation.isPending}
              onClick={handleCreateSubmit}
            >
              Create
            </CreateButton>
          </div>
        }
      >
        <DrawerIntro>
          To create a new footprint, first enter a name, then select{" "}
          <strong>Create</strong> to continue to the Footprint editor.
        </DrawerIntro>

        <Form
          form={form}
          layout="vertical"
          initialValues={{ hook: "no", config_id: "MIR100-200" }}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "請輸入 footprint 名稱" }]}
          >
            <Input placeholder="Enter a name for the footprint." />
          </Form.Item>

          <Form.Item
            name="config_id"
            label={
              <div>
                Product
                <FieldHint>
                  Select the robot your footprint should be based on.
                </FieldHint>
              </div>
            }
          >
            <Select
              options={Object.entries(PRODUCT_LABEL).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </PageWrap>
  );
};

export default FootprintsPage;