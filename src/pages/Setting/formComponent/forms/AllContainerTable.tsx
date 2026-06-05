import "./form.css";
import {
  InputNumber,
  Select,
  InputRef,
  TableColumnType,
  Typography,
  Input,
  Checkbox,
  Button,
  message,
  Popconfirm,
  Flex,
  Space,
  Table,
  Tag,
  Form,
} from "antd";
import { useSetAtom } from "jotai";
import { LocationType } from "@/utils/jotai";
import { useRef, useState, memo } from "react";
import { FilterDropdownProps } from "antd/es/table/interface";
import { useTranslation } from "react-i18next";
import { tooltipProp } from "@/utils/gloable";
import styled from "styled-components";
import {
  SearchOutlined,
  DeleteTwoTone,
  EditOutlined,
  CloseOutlined,
  ReloadOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { EditableCellProps, DataIndex } from "./antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { errorHandler } from "@/utils/utils";
import useMap from "@/api/useMap";
import FormHr from "../../utils/FormHr";
import SubmitButton from "@/utils/SubmitButton";
import useContainerLocation, { Loc_For_CD } from "@/api/useContainerLocation";

// Industrial Styled Components
const IndustrialContainer = styled.div`
  font-family: "Roboto Mono", monospace;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const PanelHeader = styled.h3`
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-left: 4px solid #1890ff;
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
  transition: all 0.2s ease;

  &:hover {
    background: #f0f5ff;
    border-left-color: #40a9ff;
  }
`;

const IndustrialTableContainer = styled.div`
  .ant-table {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .ant-table-thead > tr > th {
    background: #fafafa;
    color: #262626;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 1px;
    border-bottom: 2px solid #d9d9d9;
    font-family: "Roboto Mono", monospace;
  }

  .ant-table-tbody > tr {
    background: #ffffff;
    transition: all 0.2s ease;
    font-family: "Roboto Mono", monospace;

    &:hover {
      background: #f0f5ff !important;
      box-shadow: 0 2px 4px rgba(24, 144, 255, 0.1);
    }
  }

  .ant-table-tbody > tr > td {
    border-bottom: 1px solid #f0f0f0;
    font-size: 12px;
    color: #595959;
  }

  .ant-checkbox-wrapper {
    font-family: "Roboto Mono", monospace;
  }
`;

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.5px;
  height: 32px;
  font-weight: 600;
  border-radius: 4px;
  transition: all 0.2s ease;

  &.delete-btn {
    background: #fff1f0;
    border: 1px solid #ff4d4f;
    color: #ff4d4f;

    &:hover {
      background: #ff4d4f;
      border-color: #ff4d4f;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(255, 77, 79, 0.3);
    }

    &:disabled {
      background: #f5f5f5;
      border-color: #d9d9d9;
      color: #bfbfbf;
    }
  }

  &.edit-btn {
    background: #e6f7ff;
    border: 1px solid #1890ff;
    color: #1890ff;

    &:hover {
      background: #1890ff;
      border-color: #1890ff;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
    }
  }

  &.save-btn {
    background: #f6ffed;
    border: 1px solid #52c41a;
    color: #52c41a;

    &:hover {
      background: #52c41a;
      border-color: #52c41a;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(82, 196, 26, 0.3);
    }
  }

  &.cancel-btn {
    background: #fff1f0;
    border: 1px solid #ff4d4f;
    color: #ff4d4f;

    &:hover {
      background: #ff4d4f;
      border-color: #ff4d4f;
      color: #ffffff;
    }
  }

  &.reload-btn {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    color: #595959;

    &:hover {
      background: #fafafa;
      border-color: #1890ff;
      color: #1890ff;
    }
  }
`;

const LocationIdBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background: #e6f7ff;
  border: 1px solid #1890ff;
  border-radius: 4px;
  color: #1890ff;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 600;
`;

const CoordinateText = styled.span`
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 600;
  color: #262626;
`;

const IndustrialTag = styled(Tag)`
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
`;

const SearchDropdown = styled.div`
  padding: 8px;
  font-family: "Roboto Mono", monospace;

  .ant-input {
    font-family: "Roboto Mono", monospace;
    font-size: 11px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;

    &:focus {
      border-color: #1890ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
    }
  }

  .ant-btn {
    font-family: "Roboto Mono", monospace;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
  }
`;

const pointTypeWithColor = {
  EXTRA: "#2d7df6",
  CHARGING: "#e7ab29",
  DISPATCH: "#7fc035",
  STORAGE: "#e06a0a",
  STANDBY: "#e0dcd8",
};

const EditableCell: React.FC<EditableCellProps> = ({
  editing,
  dataIndex,
  children,
  ...restProps
}) => {
  const { t } = useTranslation();
  const pointTypeOption = [
    { value: "EXTRA", label: t("utils.location_property.none") },
    { value: "CHARGING", label: t("utils.location_property.charge_station") },
    { value: "DISPATCH", label: t("utils.location_property.prepare_side") },
    { value: "STORAGE", label: t("utils.location_property.shelve") },
    { value: "STANDBY", label: t("utils.location_property.wait_side") },
  ];

  const canRotateOption = [
    { value: true, label: t("utils.yes") },
    { value: false, label: t("utils.no") },
  ];

  let inputNode;

  switch (dataIndex) {
    case "locationId":
      inputNode = <InputNumber style={{ width: "100%" }} />;
      break;
    case "x":
      inputNode = <InputNumber style={{ width: "100%" }} />;
      break;
    case "y":
      inputNode = <InputNumber style={{ width: "100%" }} />;
      break;
    case "areaType":
      inputNode = (
        <Select options={pointTypeOption} style={{ width: "100%" }} />
      );
      break;
    case "canRotate":
      inputNode = (
        <Select options={canRotateOption} style={{ width: "100%" }} />
      );
      break;
    default:
      inputNode = <InputNumber style={{ width: "100%" }} />;
  }

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[{ required: true, message: "REQUIRED!" }]}
        >
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

export type LocationSubmit = {
  oldLocationId: string;
  newLocationId: string;
  x: number;
  y: number;
  areaType: string;
  rotation: number;
  canRotate: boolean;
};

const AllContainerTable: React.FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ listeners, attributes }) => {
  const [locationPanelForm] = Form.useForm();
  const searchInput = useRef<InputRef>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const { data: mapData, refetch } = useContainerLocation();
  const setTooltip = useSetAtom(tooltipProp);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [messageApi, contextHolders] = message.useMessage();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const isEditing = (record: LocationType) => record.locationId === editingKey;

  const handleSearch = (confirm: FilterDropdownProps["confirm"]) => {
    confirm();
  };

  const getColumnSearchProps = (
    dataIndex: DataIndex,
  ): TableColumnType<LocationType> => ({
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
          placeholder={`SEARCH ${String(dataIndex).toUpperCase()}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() => handleSearch(confirm)}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <IndustrialButton
            className="edit-btn"
            onClick={() => handleSearch(confirm)}
            icon={<SearchOutlined />}
            size="small"
          >
            {t("utils.search")}
          </IndustrialButton>
          <IndustrialButton
            className="reload-btn"
            onClick={() => clearFilters}
            size="small"
          >
            {t("utils.reset")}
          </IndustrialButton>
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
      <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
    ),
    onFilter: (value, record) => {
      const fieldValue = record[dataIndex];
      if (fieldValue === undefined || fieldValue === null) return false;
      return fieldValue
        .toString()
        .toLowerCase()
        .includes((value as string).toLowerCase());
    },
    filterDropdownProps: {
      onOpenChange: (visible) => {
        if (visible) {
          setTimeout(() => searchInput.current?.select(), 100);
        }
      },
    },
    render: (text: string) => text,
  });

  const cancel = () => {
    setEditingKey(null);
  };

  const handleHover = (locationId: string, x: number, y: number) => {
    setTooltip({ x, y, locationId });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const columns = [
    {
      title: t("utils.location"),
      dataIndex: "locationId",
      key: "locationId",
      width: "30%",
      sorter: (a: Loc_For_CD, b: Loc_For_CD) =>
        Number(a.locationId) - Number(b.locationId),
      ...getColumnSearchProps("locationId"),
      render: (text: string) => <LocationIdBadge>{text}</LocationIdBadge>,
    },
    {
      title: t("utils.location"),
      dataIndex: "locationName",
      key: "locationName",
      width: "30%",
      render: (text: string) => <LocationIdBadge>{text}</LocationIdBadge>,
    },
    {
      title: t("container_table.container_info"),
      key: "container_info",
      render: (_: any, record: Loc_For_CD) => {
        // 檢查 container 是否存在且裡面有資料
        if (!record.container || Object.keys(record.container).length === 0) {
          return <span>-</span>; // 或顯示為空
        }
        return <>{JSON.stringify(record.container)}</>;
      },
    },
    {
      title: t("utils.point_type"),
      dataIndex: "areaType",
      key: "areaType",
      width: "18%",
      sorter: (a: Loc_For_CD, b: Loc_For_CD) =>
        a.areaType.localeCompare(b.areaType),
      render: (_: unknown, record: Loc_For_CD) => {
        const label =
          record.areaType === "EXTRA"
            ? t("utils.location_property.none")
            : record.areaType;
        return (
          <IndustrialTag color={pointTypeWithColor[record.areaType]}>
            {label}
          </IndustrialTag>
        );
      },
    },
  ];

  if (!mapData) return <>loading...</>;

  return (
    <IndustrialContainer onMouseLeave={handleMouseLeave}>
      {contextHolders}
      <PanelHeader {...listeners} {...attributes}>
        {t("container_table.title")}
      </PanelHeader>
      <FormHr />
      <Flex gap="middle" justify="flex-start" align="start" vertical>
        <Flex gap="middle">
          <IndustrialButton
            className="delete-btn"
            icon={<DeleteTwoTone twoToneColor="#ff4d4f" />}
            disabled={selectedRowKeys.length === 0}
          >
            {t("utils.delete")} ({selectedRowKeys.length})
          </IndustrialButton>

          <IndustrialButton
            className="reload-btn"
            onClick={() => refetch()}
            icon={<ReloadOutlined />}
          >
            {t("utils.reload")}
          </IndustrialButton>
        </Flex>

        <IndustrialTableContainer>
          <Form form={locationPanelForm} component={false}>
            <Table
              // rowSelection={{
              //   type: "checkbox",
              //   onChange: (selectedRowKeys: React.Key[]) => {
              //     setSelectedRowKeys([...selectedRowKeys]);
              //   },
              // }}
              rowKey={(property) => property.locationId}
              components={{
                body: {
                  cell: EditableCell,
                },
              }}
              dataSource={mapData?.map((loc) => {
                return { ...loc, x: loc.x.toFixed(3), y: loc.y.toFixed(3) };
              })}
              columns={columns as []}
              pagination={{
                onChange: cancel,
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `TOTAL: ${total} LOCATIONS`,
              }}
              onRow={(record) => {
                return {
                  onMouseEnter: () =>
                    handleHover(
                      record.locationId,
                      Number(record.x),
                      Number(record.y),
                    ),
                };
              }}
              bordered
            />
          </Form>
        </IndustrialTableContainer>
      </Flex>
    </IndustrialContainer>
  );
};

export default memo(AllContainerTable);
