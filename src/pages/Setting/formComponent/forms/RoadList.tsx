import {
  Button,
  Flex,
  Form,
  FormInstance,
  Input,
  InputNumber,
  InputRef,
  message,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  TableColumnType,
  Typography,
} from "antd";
import { FC, memo, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import {
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  SearchOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { nanoid } from "nanoid";
import { FilterDropdownProps } from "antd/es/table/interface";
import { useSetAtom } from "jotai";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useMap from "@/api/useMap";
import { hoverRoad } from "@/utils/gloable";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import FormHr from "../../utils/FormHr";

type RoadListType = {
  id: string;
  roadId: string;
  validYawList?: string | number[];
  spot1Id: string;
  spot2Id: string;
  priority: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  disabled: boolean;
  limit: boolean;
  roadType: string;
};

type DataIndex = keyof RoadListType;

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
  editing?: boolean;
  dataIndex?: string;
  title: string;
  children: React.ReactNode;
  form?: FormInstance;
}

const yawOptions = ["0", "90", "180", "270", "*"].map((v) => ({
  value: v,
  label: v === "*" ? "All Angles" : `${v}°`,
}));

const whenAll = yawOptions.slice(1);
const when0 = [
  { value: "0", label: "0°" },
  { value: "180", label: "180°" },
];
const when90 = [
  { value: "90", label: "90°" },
  { value: "270", label: "270°" },
];
const when180 = [
  { value: "0", label: "0°" },
  { value: "180", label: "180°" },
];
const when270 = [
  { value: "90", label: "90°" },
  { value: "270", label: "270°" },
];

// Industrial Styled Components
const IndustrialContainer = styled.div`
  font-family: "Roboto Mono", monospace;
`;

const IndustrialButton = styled(Button)`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #1890ff;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;

  &:hover {
    background: #f0f5ff;
    border-color: #1890ff;
    color: #1890ff;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
  }

  &.danger {
    border-color: #ff4d4f;
    color: #ff4d4f;

    &:hover {
      background: #fff1f0;
      border-color: #ff7875;
      color: #ff7875;
      box-shadow: 0 2px 8px rgba(255, 77, 79, 0.2);
    }
  }

  &.primary {
    background: #1890ff;
    border-color: #1890ff;
    color: #ffffff;
    font-weight: 600;

    &:hover {
      background: #40a9ff;
      border-color: #40a9ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  }

  &:disabled {
    background: #f5f5f5;
    border-color: #d9d9d9;
    color: #bfbfbf;
  }
`;

const StyledTable = styled(Table)`
  font-family: "Roboto Mono", monospace;

  .ant-table {
    border: 1px solid #d9d9d9;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    background: #ffffff;

    &:hover {
      border-color: #bfbfbf;
    }
  }

  .ant-table-thead > tr > th {
    background: #ffffff;
    border-bottom: 2px solid #1890ff;
    color: #262626;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: "Roboto Mono", monospace;
    padding: 12px 16px;
  }

  .ant-table-tbody > tr > td {
    padding: 12px 16px;
    color: #595959;
    border-bottom: 1px solid #d9d9d9;
    font-family: "Roboto Mono", monospace;
    font-size: 12px;
  }

  .ant-table-tbody > tr:hover > td {
    background: #fafafa;
  }

  .ant-table-tbody > tr.ant-table-row-selected > td {
    background: #f0f5ff;
    border-left: 3px solid #1890ff;
  }

  .ant-table-tbody > tr.ant-table-row-selected:hover > td {
    background: #e6f7ff;
  }

  .ant-pagination-item {
    border: 1px solid #d9d9d9;
    font-weight: 500;
    font-family: "Roboto Mono", monospace;
  }

  .ant-pagination-item-active {
    background: #1890ff;
    border-color: #1890ff;

    a {
      color: #ffffff;
    }
  }

  .ant-table-filter-trigger {
    color: #8c8c8c;

    &.active {
      color: #1890ff;
    }
  }
`;

const SearchDropdown = styled.div`
  padding: 8px;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  .ant-input {
    font-family: "Roboto Mono", monospace;
    font-size: 12px;
  }

  .ant-btn {
    font-family: "Roboto Mono", monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const ActiveBox = styled.div`
  min-width: 4em;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  font-family: "Roboto Mono", monospace;
`;

type DotStyle = { $active: boolean };

const Dot = styled.div<DotStyle>`
  border-radius: 50%;
  width: 8px;
  height: 8px;
  background-color: ${(prop) => (prop.$active ? "#ff4d4f" : "#52c41a")};
  box-shadow: 0 0 4px
    ${(prop) =>
      prop.$active ? "rgba(255, 77, 79, 0.5)" : "rgba(82, 196, 26, 0.5)"};
`;

const StatusText = styled.span<{ $active: boolean }>`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${(prop) => (prop.$active ? "#ff4d4f" : "#52c41a")};
  font-weight: 600;
`;

type SubmitRoad = {
  id: string;
  limit: boolean;
  spot1Id: number;
  spot2Id: number;
  roadType: string;
  priority: number;
  disabled: boolean;
  validYawList: number[] | string[];
};

const EditableCell: FC<EditableCellProps> = ({
  editing,
  dataIndex,
  children,
  form,
  ...restProps
}) => {
  const { t } = useTranslation();
  const [chooseAngle, setChooseAngle] = useState<string>("");
  const [yawOption, setYawOption] = useState<typeof yawOptions>(whenAll);

  const levelOption = [
    { value: 5, label: t("edit_road_panel.low") },
    { value: 3, label: t("edit_road_panel.medium") },
    { value: 1, label: t("edit_road_panel.high") },
  ];

  useEffect(() => {
    if (!chooseAngle) {
      setYawOption(whenAll);
      return;
    }

    switch (chooseAngle) {
      case "*":
        setYawOption(whenAll);
        break;
      case "0":
        setYawOption(when0);
        break;
      case "90":
        setYawOption(when90);
        break;
      case "180":
        setYawOption(when180);
        break;
      case "270":
        setYawOption(when270);
        break;
      default:
        setYawOption(whenAll);
        break;
    }
  }, [chooseAngle]);

  useEffect(() => {
    if (editing && dataIndex === "validYawList" && form) {
      const initialValue = form.getFieldValue("validYawList") || [];
      setChooseAngle(initialValue[0] || "");
    }
  }, [editing, dataIndex, form]);

  let inputNode;
  switch (dataIndex) {
    case "spot1Id":
      inputNode = <InputNumber style={{ width: "100%" }} />;
      break;
    case "spot2Id":
      inputNode = <InputNumber style={{ width: "100%" }} />;
      break;
    case "disabled":
      inputNode = <Switch />;
      break;
    case "limit":
      inputNode = <Switch />;
      break;
    case "roadType":
      inputNode = (
        <Radio.Group buttonStyle="solid">
          <Radio.Button value="oneWayRoad">
            {t("edit_road_panel.single_road")}
          </Radio.Button>
          <Radio.Button value="twoWayRoad">
            {t("edit_road_panel.two_way_road")}
          </Radio.Button>
        </Radio.Group>
      );
      break;
    case "priority":
      inputNode = <Select options={levelOption} style={{ minWidth: 120 }} />;
      break;
    case "validYawList":
      inputNode = (
        <Select
          mode="multiple"
          options={yawOption}
          onChange={(value: string[]) => {
            setChooseAngle(value[0] || "");
          }}
          style={{ minWidth: 120 }}
          allowClear
          placeholder={t("utils.required")}
        />
      );
      break;
    default:
      inputNode = <Input />;
  }

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[{ required: true, message: t("utils.required") }]}
        >
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

const RoadList: React.FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const { data: currentMap } = useMap();
  const searchInput = useRef<InputRef>(null);
  const [messageApi, contextHolders] = message.useMessage();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const isEditing = (record: RoadListType) => record.roadId === editingKey;
  const setHoverRoad = useSetAtom(hoverRoad);
  const [formRoad] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const deleteRoadMutation = useMutation({
    mutationFn: (roadId: string) =>
      client.post("api/setting/delete-edit-road", { roadId }),
    onSuccess: () => {
      void messageApi.success("success");
      queryClient.refetchQueries({ queryKey: ["map"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const editRoadMutation = useMutation({
    mutationFn: (payload: SubmitRoad) =>
      client.post("api/setting/edit-edit-road", payload),
    onSuccess: () => {
      void messageApi.success("success");
      queryClient.refetchQueries({ queryKey: ["map"] });
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const deleteMultiRoadMutation = useMutation({
    mutationFn: (roadId: string[]) =>
      client.post("api/setting/delete-multi-edit-road", { roadId }),
    onSuccess: () => {
      void messageApi.success("success");
      queryClient.refetchQueries({ queryKey: ["map"] });
      setSelectedRowKeys([]);
    },
    onError: (e: ErrorResponse) => errorHandler(e, messageApi),
  });

  const handleSearch = (confirm: FilterDropdownProps["confirm"]) => confirm();
  const handleReset = (clearFilters: () => void) => clearFilters();
  const handleHover = (id: string) => id && setHoverRoad(id);
  const handleMouseLeave = () => setHoverRoad("");

  const getColumnSearchProps = (
    dataIndex: DataIndex
  ): TableColumnType<RoadListType> => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
      close,
    }) => (
      <SearchDropdown onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() => handleSearch(confirm)}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button
            color="primary"
            variant="filled"
            onClick={() => handleSearch(confirm)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            {t("utils.search")}
          </Button>
          <Button
            color="default"
            variant="filled"
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            style={{ width: 90 }}
          >
            {t("utils.reset")}
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => confirm({ closeDropdown: false })}
          >
            {t("utils.filter")}
          </Button>
          <Button type="link" size="small" onClick={() => close()}>
            {t("utils.cancel")}
          </Button>
        </Space>
      </SearchDropdown>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined
        style={{ color: filtered ? "#1890ff" : "#8c8c8c" }}
        className={filtered ? "active" : ""}
      />
    ),
    onFilter: (value, record) =>
      record[dataIndex]
        ?.toString()
        .toLowerCase()
        .includes((value as string).toLowerCase()) as boolean,
    filterDropdownProps: {
      onOpenChange: (visible) => {
        if (visible) setTimeout(() => searchInput.current?.select(), 100);
      },
    },
    render: (text: string) => text,
  });

  const edit = (record: Partial<RoadListType> & { roadId: string }) => {
    const validYawList =
      record.validYawList === "*"
        ? ["*"]
        : (record.validYawList as number[]).map((c) => c.toString());
    formRoad.setFieldsValue({
      spot1Id: record.spot1Id,
      spot2Id: record.spot2Id,
      limit: record.limit,
      priority: record.priority,
      roadType: record.roadType,
      disabled: record.disabled,
      validYawList,
    });
    setEditingKey(record.roadId);
  };

  const cancel = () => setEditingKey(null);

  const save = (key: string) => {
    const payload: SubmitRoad = {
      id: key,
      spot1Id: formRoad.getFieldValue("spot1Id") as number,
      spot2Id: formRoad.getFieldValue("spot2Id") as number,
      roadType: formRoad.getFieldValue("roadType") as string,
      limit: formRoad.getFieldValue("limit") as boolean,
      priority: formRoad.getFieldValue("priority"),
      disabled: formRoad.getFieldValue("disabled") as boolean,
      validYawList: formRoad.getFieldValue("validYawList") as
        | number[]
        | string[],
    };

    editRoadMutation.mutate(payload);
    formRoad.setFieldsValue(payload);
    setEditingKey(null);
  };

  const deleteMultiItem = () => {
    if (selectedRowKeys.length === 0) return;
    deleteMultiRoadMutation.mutate(selectedRowKeys as string[]);
  };

  const columns = [
    {
      title: t("edit_road_panel.start_point"),
      dataIndex: "spot1Id",
      key: "spot1Id",
      editable: true,
      minWidth: 120,
      sorter: (a: RoadListType, b: RoadListType) =>
        Number(a.spot1Id) - Number(b.spot2Id),
      ...getColumnSearchProps("spot1Id"),
    },
    {
      title: t("edit_road_panel.end_point"),
      dataIndex: "spot2Id",
      key: "spot2Id",
      editable: true,
      minWidth: 120,
      sorter: (a: RoadListType, b: RoadListType) =>
        Number(a.spot2Id) - Number(b.spot1Id),
      ...getColumnSearchProps("spot2Id"),
    },
    {
      title: t("utils.point_type"),
      dataIndex: "roadType",
      key: "roadType",
      editable: true,
      minWidth: 150,
      render: (_v: unknown, record: RoadListType) =>
        record.roadType === "oneWayRoad"
          ? t("edit_road_panel.single_road")
          : t("edit_road_panel.two_way_road"),
      sorter: (a: RoadListType, b: RoadListType) =>
        a.roadType.localeCompare(b.roadType),
    },
    {
      title: t("edit_road_panel.yaw"),
      dataIndex: "validYawList",
      key: "validYawList",
      editable: true,
      minWidth: 80,
      render: (_: unknown, record: RoadListType) =>
        record.validYawList?.toString() || "",
    },
    {
      title: t("edit_road_panel.priority"),
      dataIndex: "priority",
      key: "priority",
      editable: true,
      minWidth: 80,
      render: (_: unknown, record: RoadListType) => {
        const level = record.priority;
        if (level === 1) return t("edit_road_panel.low");
        if (level === 5) return t("edit_road_panel.high");
        return t("edit_road_panel.medium");
      },
    },
    {
      title: t("edit_road_panel.limit"),
      dataIndex: "limit",
      key: "limit",
      editable: true,
      minWidth: 50,
      render: (_: unknown, record: RoadListType) =>
        record.limit ? t("utils.yes") : t("utils.no"),
    },
    {
      title: t("edit_road_panel.disabled"),
      key: "disabled",
      dataIndex: "disabled",
      editable: true,
      minWidth: 100,
      render: (_v: unknown, record: RoadListType) => (
        <ActiveBox>
          <Dot $active={record.disabled as boolean} />
          <StatusText $active={record.disabled as boolean}>
            {record.disabled ? t("utils.yes") : t("utils.no")}
          </StatusText>
        </ActiveBox>
      ),
    },
    {
      title: "",
      dataIndex: "operation",
      key: nanoid(),
      minWidth: 150,
      render(_v: unknown, record: RoadListType) {
        const editable = isEditing(record);
        return editable ? (
          <Flex gap="small">
            <IndustrialButton
              className="primary"
              onClick={() => save(record.id)}
              icon={<SaveOutlined />}
            >
              {t("utils.save")}
            </IndustrialButton>
            <IndustrialButton onClick={() => cancel()} icon={<CloseOutlined />}>
              {t("utils.cancel")}
            </IndustrialButton>
          </Flex>
        ) : (
          <Flex gap="small">
            <IndustrialButton
              className="primary"
              onClick={() => edit(record)}
              icon={<EditOutlined />}
            >
              {t("utils.edit")}
            </IndustrialButton>
            <Popconfirm
              title="Delete the task"
              description="Are you sure to delete this road?"
              onConfirm={() => deleteRoadMutation.mutate(record.roadId)}
              onCancel={cancel}
              okText="Yes"
              cancelText="No"
            >
              <IndustrialButton className="danger" icon={<DeleteOutlined />}>
                {t("utils.delete")}
              </IndustrialButton>
            </Popconfirm>
          </Flex>
        );
      },
    },
  ];

  const mergedColumns = columns.map((col) => {
    if (!col.editable) return col;
    return {
      ...col,
      onCell: (record: RoadListType) => ({
        record,
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
        form: formRoad,
      }),
    };
  });

  return (
    <IndustrialContainer>
      {contextHolders}
      <h3 className="drop_button_style" {...listeners} {...attributes}>
        {t("edit_road_panel.road_table")}
      </h3>
      <FormHr />
      <Flex
        gap="middle"
        justify="flex-start"
        align="start"
        vertical
        onMouseLeave={handleMouseLeave}
      >
        <IndustrialButton
          className="danger"
          onClick={deleteMultiItem}
          loading={deleteMultiRoadMutation.isLoading}
          disabled={selectedRowKeys.length === 0}
        >
          {t("utils.delete")}
        </IndustrialButton>
        <Form form={formRoad} component={false}>
          <StyledTable
            dataSource={currentMap?.roads}
            rowKey={(v) => v.roadId}
            rowSelection={{
              type: "checkbox",
              onChange: (selectedRowKeys: React.Key[]) =>
                setSelectedRowKeys([...selectedRowKeys]),
            }}
            components={{ body: { cell: EditableCell } }}
            onRow={(record) => ({
              onMouseEnter: () => handleHover(record.roadId),
            })}
            columns={mergedColumns as []}
            pagination={{ pageSize: 8 }}
          />
        </Form>
      </Flex>
    </IndustrialContainer>
  );
};

export default memo(RoadList);
