import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
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
  EditOutlined,
  LeftOutlined,
  RightOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

// ⚠️ "docking_type" 目前只確認 Bar Shelf Marker = 22（來自你貼的
// payload 範例）。Leg Shelf Marker 對應的數字我不知道，先放一個佔位值
// SHELF_TYPE_LEG_PLACEHOLDER——建立/編輯 Leg Shelf Marker 之前一定要把
// 這個數字換成正確值，不然送出去的 docking_type 會是錯的。
const SHELF_TYPE_BAR = 22;
const SHELF_TYPE_LEG_PLACEHOLDER = 21; // TODO: 跟 MiR 確認正確數值

type ShelfTypeKey = "BAR" | "LEG";

const SHELF_TYPE_LABEL: Record<ShelfTypeKey, string> = {
  BAR: "Bar Shelf Marker",
  LEG: "Leg Shelf Marker",
};

const SHELF_TYPE_DOCKING_TYPE: Record<ShelfTypeKey, number> = {
  BAR: SHELF_TYPE_BAR,
  LEG: SHELF_TYPE_LEG_PLACEHOLDER,
};

const dockingTypeToShelfKey = (dockingType: number): ShelfTypeKey =>
  dockingType === SHELF_TYPE_BAR ? "BAR" : "LEG";

interface MarkerTypeRow {
  id?: string;
  name: string;
  docking_type: number;
  bar_length: number;
  bar_distance: number;
  orientation_offset: number;
  x_offset: number;
  y_offset: number;
  created_by?: string;
}

interface MarkerTypeFormValues {
  name: string;
  shelfType: ShelfTypeKey;
  bar_length: number;
  bar_distance: number;
  orientation_offset: number;
  x_offset: number;
  y_offset: number;
}

/* ------------------------------------------------------------------ */
/*  Styled components (跟 FootprintsPage 保持一致)                     */
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

// ⚠️ 「列出所有 marker type」的 GET endpoint 我沒有拿到確切名稱，這裡
// 先照你們既有的命名慣例（footprint 是 all-footprint）猜成
// all-marker-type。如果實際路徑不同，跟我說一聲，我改這一行就好。
const LIST_URL = "api/setting/all-marker-type";
const CREATE_URL = "api/setting/add-marker-type";
// ⚠️ 編輯用的 endpoint 完全是我猜的，還沒有依據——目前只有「建立」是
// 你確認過的 REST API。點編輯（Distributor 那幾筆的鉛筆圖示）目前只
// 會打開表單、不會真的送出，等你把正確的 endpoint 給我再接上。
const EDIT_URL = "api/setting/edit-marker-type";

export const MarkerTypesPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<MarkerTypeRow | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [form] = Form.useForm<MarkerTypeFormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  const { data = [], refetch } = useQuery({
    queryKey: ["marker-types"],
    queryFn: async () => {
      const res = await client.get<MarkerTypeRow[]>(LIST_URL);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: Omit<MarkerTypeRow, "id" | "created_by">) =>
      client.post(CREATE_URL, payload),
    onSuccess: () => {
      messageApi.success(`已建立 marker type`);
      refetch();
      setDrawerOpen(false);
      form.resetFields();
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  useEffect(() => {
    setCurrent(1);
  }, [search]);

  const filtered = data.filter((row) =>
    row.name.toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const openCreate = () => {
    setEditingRow(null);
    setViewOnly(false);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openRow = (row: MarkerTypeRow, readOnly: boolean) => {
    setEditingRow(row);
    setViewOnly(readOnly);
    form.setFieldsValue({
      name: row.name,
      shelfType: dockingTypeToShelfKey(row.docking_type),
      bar_length: row.bar_length,
      bar_distance: row.bar_distance,
      orientation_offset: row.orientation_offset,
      x_offset: row.x_offset,
      y_offset: row.y_offset,
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    let values: MarkerTypeFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const payload = {
      name: values.name.trim(),
      docking_type: SHELF_TYPE_DOCKING_TYPE[values.shelfType],
      bar_length: values.bar_length,
      bar_distance: values.bar_distance,
      orientation_offset: values.orientation_offset,
      x_offset: values.x_offset,
      y_offset: values.y_offset,
    };

    if (editingRow) {
      // TODO: EDIT_URL 還沒確認，先不送出，避免打到錯的 endpoint。
      messageApi.warning(
        "編輯功能還沒接上正確的 API，麻煩先跟開發者確認 endpoint",
      );
      return;
    }

    createMutation.mutate(payload);
  };

  const columns: ColumnsType<MarkerTypeRow> = [
    {
      title: "Name",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, row) => (
        <a onClick={() => openRow(row, row.created_by === "MiR")}>{name}</a>
      ),
    },
    {
      title: "Marker type",
      dataIndex: "docking_type",
      render: (dockingType: number) =>
        SHELF_TYPE_LABEL[dockingTypeToShelfKey(dockingType)],
    },
    {
      title: "Bar length",
      dataIndex: "bar_length",
      sorter: (a, b) => a.bar_length - b.bar_length,
    },
    {
      title: "Bar distance",
      dataIndex: "bar_distance",
      sorter: (a, b) => a.bar_distance - b.bar_distance,
    },
    {
      title: "Created by",
      dataIndex: "created_by",
    },
    {
      title: "Actions",
      dataIndex: "actions",
      align: "right",
      render: (_: unknown, row) => {
        const readOnly = row.created_by === "MiR";
        return (
          <Tooltip title={readOnly ? "檢視" : "編輯"}>
            <ActionButton
              icon={readOnly ? <EyeOutlined /> : <EditOutlined />}
              onClick={() => openRow(row, readOnly)}
            />
          </Tooltip>
        );
      },
    },
  ];

  return (
    <PageWrap>
      {contextHolder}
      <HeaderRow>
        <TitleGroup>
          <Title>Marker Types</Title>
          <Tooltip title="定義貨架 marker 的偵測形狀">
            <HelpIcon />
          </Tooltip>
        </TitleGroup>
        <CreateButton type="primary" onClick={openCreate}>
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

        <Table<MarkerTypeRow>
          rowKey={(row) => row.id ?? row.name}
          columns={columns}
          dataSource={filtered}
          pagination={{
            current,
            pageSize: PAGE_SIZE,
            total: filtered.length,
            onChange: setCurrent,
            style: { display: "none" },
          }}
        />
      </Card>

      <Drawer
        title={
          editingRow
            ? viewOnly
              ? "View marker type"
              : "Edit marker type"
            : "Create marker type"
        }
        placement="right"
        width={480}
        open={drawerOpen}
        closable={!createMutation.isPending}
        maskClosable={!createMutation.isPending}
        onClose={() => {
          if (createMutation.isPending) return;
          setDrawerOpen(false);
          setEditingRow(null);
          form.resetFields();
        }}
        footer={
          viewOnly ? undefined : (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <CreateButton
                type="primary"
                loading={createMutation.isPending}
                onClick={handleSubmit}
              >
                {editingRow ? "Save" : "Create"}
              </CreateButton>
            </div>
          )
        }
      >
        {!editingRow && (
          <DrawerIntro>
            To create a new marker type, first enter the necessary information,
            then select <strong>Create</strong> to continue.
          </DrawerIntro>
        )}

        <Form
          form={form}
          layout="vertical"
          disabled={viewOnly}
          initialValues={{
            shelfType: "BAR",
            bar_length: 0,
            bar_distance: 0,
            orientation_offset: 0,
            x_offset: 0,
            y_offset: 0,
          }}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "請輸入 marker type 名稱" }]}
          >
            <Input placeholder="my_test" />
          </Form.Item>

          <Form.Item
            name="shelfType"
            label={
              <div>
                Shelf type
                <FieldHint>
                  Select the shelf marker type you want to create.
                </FieldHint>
              </div>
            }
          >
            <Select
              options={[
                { value: "BAR", label: SHELF_TYPE_LABEL.BAR },
                { value: "LEG", label: SHELF_TYPE_LABEL.LEG },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="bar_length"
            rules={[
              {
                required: true,
                type: "number", // 👈 必須加上這行宣告型別為 number
                min: 0.4,
                max: 0.75,
                message: "請輸入 0.4 到 0.75 之間的數值", // 👈 自訂訊息可避免出現預設英文錯誤
              },
            ]}
            label={
              <div>
                Bar length
                <FieldHint>
                  For Bar shelf markers: enter the length of one of the side
                  bars. The side bars are to the left and right sides of the
                  robot.
                  <br />
                  For Leg shelf markers: enter the distance between a pair of
                  legs on one side of the robot.
                </FieldHint>
              </div>
            }
          >
            <InputNumber addonAfter="m" style={{ width: "100%" }} step={0.01} />
          </Form.Item>

          <Form.Item
            name="bar_distance"
            rules={[
              {
                required: true,
                type: "number", // 👈 必須加上這行
                min: 0.75,
                max: 1.5,
                message: "請輸入 0.75 到 1.5 之間的數值",
              },
            ]}
            label={
              <div>
                Bar distance
                <FieldHint>
                  For Bar shelf markers: enter the distance between the side
                  bars.
                  <br />
                  For Leg shelf markers: enter the distance between a pair of
                  legs on opposite sides of the robot.
                </FieldHint>
              </div>
            }
          >
            <InputNumber addonAfter="m" style={{ width: "100%" }} step={0.01} />
          </Form.Item>

          <Form.Item
            name="orientation_offset"
            label={
              <div>
                Orientation offset
                <FieldHint>Enter the orientation offset in degrees.</FieldHint>
              </div>
            }
          >
            <InputNumber addonAfter="deg" style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="x_offset"
            label={
              <div>
                X-offset
                <FieldHint>
                  Modifies how far forward the robot drives to dock to the
                  shelf.
                </FieldHint>
              </div>
            }
          >
            <InputNumber addonAfter="m" style={{ width: "100%" }} step={0.01} />
          </Form.Item>

          <Form.Item
            name="y_offset"
            label={
              <div>
                Y-offset
                <FieldHint>
                  Modifies how far to either side the robot drives to dock to
                  the shelf.
                </FieldHint>
              </div>
            }
          >
            <InputNumber addonAfter="m" style={{ width: "100%" }} step={0.01} />
          </Form.Item>
        </Form>
      </Drawer>
    </PageWrap>
  );
};

export default MarkerTypesPage;
