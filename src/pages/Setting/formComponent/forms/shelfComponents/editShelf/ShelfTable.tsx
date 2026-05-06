import { FormatPainterOutlined, SearchOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Descriptions,
  Flex,
  Input,
  InputRef,
  Skeleton,
  Space,
  Table,
  TableColumnType,
  Tag,
  Tooltip,
} from "antd";
import { ColumnsType } from "antd/es/table";
import { FC, useRef, useState } from "react";
import styled from "styled-components";
import { useSetAtom } from "jotai";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import useYaw from "@/api/useYaw";
import { cargoStyle, shelfSelectedStyleLocationId } from "@/utils/gloable";
import useShelf from "@/api/useShelf";
import { ShelfWithoutList } from "@/api/type/useShelf";
import SettingCargoStyleForm from "./SettingCargoStyleForm";
import { DataIndex } from "../../antd";
import { FilterDropdownProps } from "antd/es/table/interface";
import useLoc, { LocWithoutArr } from "@/api/useLoc";

const ExpandedRowWrapper = styled.div`
  padding: 20px;
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-left: 4px solid #1890ff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  font-family: "Roboto Mono", monospace;
`;

const ConfigCard = styled(Card)`
  margin-bottom: 16px;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

  .ant-card-head {
    background: #ffffff;
    border-bottom: 2px solid #fa8c16;
    padding: 10px 16px;
    font-family: "Roboto Mono", monospace;
    color: #fa8c16;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 13px;
  }

  .ant-card-body {
    padding: 20px;
    background: #ffffff;
  }

  .ant-descriptions-bordered .ant-descriptions-item-label {
    background: #fafafa;
    font-weight: 500;
    color: #262626;
    font-family: "Roboto Mono", monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-right: 1px solid #d9d9d9;
  }

  .ant-descriptions-bordered .ant-descriptions-item-content {
    background: #ffffff;
    color: #595959;
    font-family: "Roboto Mono", monospace;
    font-size: 12px;
  }

  .ant-descriptions-bordered .ant-descriptions-row {
    border-bottom: 1px solid #d9d9d9;
  }
`;

const LevelTag = styled(Tag)`
  margin-right: 8px;
  font-size: 11px;
  font-weight: 700;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
  border: 1px solid currentColor;
  box-shadow: 0 1px 4px rgba(24, 144, 255, 0.15);
`;

const Wrapper = styled.div<{ $hasSelect: boolean }>`
  display: ${(prop) => (prop.$hasSelect ? "none" : "flex")};
  align-items: center;
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

type ShelfCell = {
  Loc: {
    locationId: string;
  };
};

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
  dataIndex: string;
  title: string;
  inputType: string;
  record: ShelfCell;
  index: number;
  children: React.ReactNode;
}

const EditableCell: React.FC<EditableCellProps> = ({
  children,
  ...restProps
}) => {
  return <td {...restProps}>{children}</td>;
};

const ShelfTable: FC<{
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
}> = ({ selectedRowKeys, setSelectedRowKeys }) => {
  const [selectId, setSelectId] = useState<string | null>(null);
  const { data: yaw } = useYaw();
  const setCStyle = useSetAtom(cargoStyle);
  const setShelfSelectedStyle = useSetAtom(shelfSelectedStyleLocationId);
  const { data: shelfDataSource, isLoading: isLoadingShelf } = useShelf();
  const { data: locData } = useLoc(undefined);

  const { t } = useTranslation();
  const searchInput = useRef<InputRef>(null);

  const handleSearch = (confirm: FilterDropdownProps["confirm"]) => {
    confirm();
  };

  const handleReset = (clearFilters: () => void) => {
    clearFilters();
  };

  const getColumnSearchProps = (
    dataIndex: DataIndex
  ): TableColumnType<ShelfWithoutList> => ({
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
            onClick={() => {
              confirm({ closeDropdown: false });
            }}
          >
            {t("utils.filter")}
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              close();
            }}
          >
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
    onFilter: (value, record) => {
      return record.Loc.locationId
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

  const columns: ColumnsType<ShelfWithoutList> = [
    {
      title: t("edit_shelf_panel.location_id"),
      dataIndex: "locationId",
      key: "locationId",
      sortDirections: ["ascend", "descend"],
      defaultSortOrder: "ascend",
      sorter: (a, b) => Number(a.Loc.locationId) - Number(b.Loc.locationId),
      ...getColumnSearchProps("locationId"),
      render: (_v, recorder) => {
        const { locationId } = recorder.Loc;
        return locationId;
      },
    },
    {
      title: t("edit_shelf_panel.category"),
      dataIndex: "type",
      key: "type",
      render: (_c, recorder) => {
        if (!recorder.ShelfCategory) return t("utils.no");
        const type = recorder.ShelfCategory.name;
        return type;
      },
    },
    {
      title: t("edit_shelf_panel.level"),
      dataIndex: "level",
      key: "level",
      render: (_v, recorder) => {
        if (!recorder.ShelfConfig) return 0;
        const level = recorder.ShelfCategory.Height?.length;
        return level;
      },
    },
    {
      title: t("edit_shelf_panel.yaw"),
      dataIndex: "yaw",
      key: "yaw",
      render: (_v, recorder) => {
        if (!yaw) return "-";
        const yawIndex = yaw?.findIndex((s) => s.id === recorder.Loc.dirId);
        if (yawIndex === -1) return "-";
        return yaw[yawIndex].yaw;
      },
    },
    {
      title: t("edit_shelf_panel.region_name"),
      dataIndex: "region_name",
      key: "region_name",
      render: (_v, recorder) => {
        return recorder.Loc?.loc_regions?.name || "";
      },
    },
  ];

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const cancelEditStyle = () => {
    setSelectId(null);
    setCStyle(null);
    setShelfSelectedStyle("");
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const mergedColumns = columns.map((col) => {
    return {
      ...col,
      onCell: (record: ShelfWithoutList) => ({
        record,
      }),
    };
  });

  if (isLoadingShelf) return <Skeleton active />;

  return (
    <>
      <Wrapper $hasSelect={selectId !== null}>
        <Table
          components={{
            body: {
              cell: EditableCell,
            },
          }}
          rowSelection={rowSelection}
          dataSource={shelfDataSource as []}
          columns={mergedColumns as unknown as undefined}
          rowKey={(record: ShelfWithoutList) => record.id}
          pagination={{ pageSize: 8 }}
          expandable={{
            expandedRowRender: (record) => {
              const sortedConfig = record.ShelfConfig.sort(
                (a, b) => a.level - b.level
              );
              const thisLocationInfo = (locData as LocWithoutArr[]).find(
                (v) => v.locationId === record.Loc.locationId
              );

              const relationshipsDisplay = thisLocationInfo?.relationships
                ? Object.entries(thisLocationInfo.relationships)
                    .map(
                      ([locId, type]) =>
                        `${locId}: ${type === "fixed" ? t("shelf.cargo_mission.relationship_fixed") : t("shelf.cargo_mission.relationship_non_fixed")}`
                    )
                    .join(", ")
                : t("utils.none");

              return (
                <ExpandedRowWrapper>
                  <ConfigCard
                    title={
                      <Flex align="center" gap="small">
                        <span>{t("edit_shelf_panel.shelf_config")}</span>
                        <Tooltip title={t("edit_shelf_panel.config_tooltip")}>
                          <InfoCircleOutlined style={{ color: "#1890ff" }} />
                        </Tooltip>
                      </Flex>
                    }
                  >
                    <Descriptions column={2} bordered size="small">
                      {sortedConfig.map((item) => {
                        const itemArr = item?.name?.split("-") || [];
                        return (
                          <Descriptions.Item
                            key={item.id}
                            label={
                              <Flex align="center" gap="small">
                                <LevelTag color="blue">
                                  {t("edit_shelf_panel.level")} {item.level + 1}
                                </LevelTag>
                                {item?.name ? (
                                  <span>
                                    (
                                    {itemArr
                                      .slice(0, itemArr.length - 1)
                                      .join("-")}
                                    )
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </Flex>
                            }
                            span={2}
                          >
                            <Flex vertical gap="small">
                              <span>
                                {t("edit_shelf_panel.disabled")}:{" "}
                                <Tag color={item.disable ? "red" : "green"}>
                                  {item.disable
                                    ? t("utils.yes")
                                    : t("utils.no")}
                                </Tag>
                              </span>
                              <span>
                                {t("edit_shelf_panel.height")}:{" "}
                                {item.cargo_limit} mm
                              </span>
                            </Flex>
                          </Descriptions.Item>
                        );
                      })}
                      <Descriptions.Item
                        label={
                          <Flex align="center" gap="small">
                            <span>
                              {t("edit_shelf_panel.placement_priority")}
                            </span>
                            <Tooltip
                              title={t("shelf.cargo_mission.priority_desc")}
                            >
                              <InfoCircleOutlined
                                style={{ color: "#1890ff" }}
                              />
                            </Tooltip>
                          </Flex>
                        }
                        span={2}
                      >
                        {thisLocationInfo?.placement_priority ??
                          t("utils.none")}
                      </Descriptions.Item>
                      <Descriptions.Item
                        label={
                          <Flex align="center" gap="small">
                            <span>{t("edit_shelf_panel.relationships")}</span>
                            <Tooltip
                              title={t(
                                "shelf.cargo_mission.relationships_desc"
                              )}
                            >
                              <InfoCircleOutlined
                                style={{ color: "#1890ff" }}
                              />
                            </Tooltip>
                          </Flex>
                        }
                        span={2}
                      >
                        {relationshipsDisplay}
                      </Descriptions.Item>
                    </Descriptions>
                  </ConfigCard>
                </ExpandedRowWrapper>
              );
            },
          }}
        />
      </Wrapper>
    </>
  );
};

export default ShelfTable;
