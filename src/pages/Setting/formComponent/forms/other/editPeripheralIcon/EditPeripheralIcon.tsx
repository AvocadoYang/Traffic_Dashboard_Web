import { SingleChargeStation } from "@/api/useAllCharge";
import FormHr from "@/pages/Setting/utils/FormHr";
import { PeripheralEditData, IsEditPeripheralStyle } from "@/utils/gloable";
import { Button, Drawer, Flex, Select, Table, Input } from "antd";
import { useAtom, useSetAtom } from "jotai";
import { FC, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import SettingStyleForm from "./SettingStyleForm";
import {
  FormatPainterOutlined,
  ReloadOutlined,
  EditOutlined,
  SettingOutlined,
  SearchOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import usePeripheralStyle from "@/api/usePeripheralStyle";
import SettingMultiStyleForm from "./SettingMultiStyleForm";
import styled from "styled-components";

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
  border-left: 4px solid #eb2f96;
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
    background: #fff0f6;
    border-left-color: #f759ab;
  }
`;

const Container = styled.div`
  display: flex;
  width: 100%;
  transition: all 0.3s ease;
`;

const Panel = styled.div<{ width: string; hidden?: boolean }>`
  width: ${(p) => p.width};
  transition: all 0.3s ease;
  overflow: hidden;
  ${(p) => p.hidden && `visibility: hidden; height: 0;`}
`;

const ToolbarSection = styled(Flex)`
  background: #fafafa;
  border: 2px solid #d9d9d9;
  padding: 16px;
  margin-bottom: 16px;
  border-left: 4px solid #eb2f96;
  gap: 12px;
  flex-wrap: wrap;
`;

const IndustrialInput = styled(Input)`
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  height: 36px;
  border-radius: 0;
  border: 1px solid #d9d9d9;

  &:hover {
    border-color: #f759ab;
  }

  &:focus {
    border-color: #eb2f96;
    box-shadow: 0 0 0 2px rgba(235, 47, 150, 0.2);
  }

  &::placeholder {
    color: #bfbfbf;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
  }
`;

const IndustrialSelect = styled(Select)`
  font-family: "Roboto Mono", monospace;

  .ant-select-selector {
    height: 36px !important;
    border: 1px solid #d9d9d9 !important;
    border-radius: 0 !important;
    font-size: 12px;
    display: flex;
    align-items: center;

    &:hover {
      border-color: #f759ab !important;
    }
  }

  &.ant-select-focused .ant-select-selector {
    border-color: #eb2f96 !important;
    box-shadow: 0 0 0 2px rgba(235, 47, 150, 0.2) !important;
  }

  .ant-select-selection-placeholder {
    color: #bfbfbf;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
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

  &.edit-btn {
    background: #ffffff;
    border: 1px solid #eb2f96;
    color: #eb2f96;

    &:hover {
      background: #fff0f6;
      border-color: #f759ab;
      color: #f759ab;
      box-shadow: 0 2px 8px rgba(235, 47, 150, 0.3);
    }

    &:disabled {
      background: #f5f5f5;
      border-color: #d9d9d9;
      color: #bfbfbf;
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
      border-color: #eb2f96;
      color: #eb2f96;
    }
  }

  &.position-btn {
    background: #eb2f96;
    border-color: #eb2f96;
    color: #ffffff;

    &:hover {
      background: #f759ab;
      border-color: #f759ab;
      box-shadow: 0 2px 8px rgba(235, 47, 150, 0.4);
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
    font-weight: 500;
    padding: 12px 16px;

    &::before {
      display: none;
    }
  }

  .ant-table-tbody > tr {
    transition: all 0.2s;
    position: relative;

    &:hover {
      background: #fff0f6;

      &::before {
        width: 4px;
      }

      td {
        background: transparent;
      }
    }

    &.ant-table-row-selected {
      background: #fff0f6;

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

  .ant-table-selection-column {
    .ant-checkbox-wrapper {
      .ant-checkbox {
        .ant-checkbox-inner {
          border-radius: 0;
          border-color: #d9d9d9;
        }

        &.ant-checkbox-checked .ant-checkbox-inner {
          background-color: #eb2f96;
          border-color: #eb2f96;
        }
      }
    }
  }
`;

const IndustrialDrawer = styled(Drawer)`
  .ant-drawer-content {
    background: #ffffff;
  }

  .ant-drawer-header {
    background: #fafafa;
    border-bottom: 2px solid #d9d9d9;
    border-left: 4px solid #eb2f96;
  }

  .ant-drawer-title {
    color: #eb2f96;
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: "Roboto Mono", monospace;
  }
`;

const ValueBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 50px;
  padding: 2px 8px;
  background: #fff0f6;
  border: 1px solid #eb2f96;
  color: #eb2f96;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 700;
`;

const LocationBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: #f9f0ff;
  border: 1px solid #d3adf7;
  color: #722ed1;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
`;

const AreaTypeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: #e6fffb;
  border: 1px solid #87e8de;
  color: #13c2c2;
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const EditPeripheralIcon: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const { t } = useTranslation();
  const setSelectStation = useSetAtom(PeripheralEditData);
  const [isEditStation, setIsEditStation] = useAtom(IsEditPeripheralStyle);
  const [filterType, setFilterType] = useState<string | null>(null);
  const { data, refetch } = usePeripheralStyle(filterType);
  const [searchText, setSearchText] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [openDrawer, setOpenDrawer] = useState(false);

  const uniqueAreaTypes = Array.from(
    new Set((data ?? []).map((item) => item?.areaType))
  );

  const onChangeAreaType = (type: string) => {
    setFilterType(type ?? null);
  };

  const handleEdit = (loc: number) => {
    if (!data) return;
    const targetIndex = data.findIndex((a) => a?.locationId === loc);

    if (targetIndex === -1) {
      setSelectStation(null);
      return;
    }

    setSelectStation({
      loc: data[targetIndex]?.locationId as number,
      peripheralType: data[targetIndex]?.areaType as string,
      translateX: data[targetIndex]?.translateX as number,
      translateY: data[targetIndex]?.translateY as number,
      rotate: data[targetIndex]?.rotate as number,
      scale: data[targetIndex]?.scale as number,
      flex_direction: data[targetIndex]?.flex_direction as string,
    });

    setIsEditStation(true);
  };

  const columns = [
    {
      title: t("other.edit_charge_station_icon_style.edit_position"),
      dataIndex: "operation",
      key: "operation",

      render: (_v: unknown, record: SingleChargeStation) => {
        return (
          <IndustrialButton
            className="position-btn"
            icon={<FormatPainterOutlined />}
            onClick={() => handleEdit(record.locationId)}
            size="small"
          >
            Edit
          </IndustrialButton>
        );
      },
    },
    {
      title: t("other.edit_mission_tag.location"),
      dataIndex: "locationId",
      key: "locationId",

      sorter: (a, b) => Number(a.locationId) - Number(b.locationId),
      render: (value: number) => <LocationBadge>{value}</LocationBadge>,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: t("peripheral_style.areaType"),
      dataIndex: "areaType",
      key: "areaType",

      filteredValue: filterType ? [filterType] : null,
      onFilter: (value, record) => record.areaType === value,
      sorter: (a, b) => a.areaType.localeCompare(b.areaType),
      render: (value: string) => <AreaTypeBadge>{value}</AreaTypeBadge>,
    },
    {
      title: "X",
      dataIndex: "x",
      key: "x",

      render: (value: number) => <ValueBadge>{value}</ValueBadge>,
    },
    {
      title: "Y",
      dataIndex: "y",
      key: "y",

      render: (value: number) => <ValueBadge>{value}</ValueBadge>,
    },
    {
      title: "translateX",
      dataIndex: "translateX",
      key: "translateX",

      render: (value: number) => <ValueBadge>{value}</ValueBadge>,
    },
    {
      title: "translateY",
      dataIndex: "translateY",
      key: "translateY",

      render: (value: number) => <ValueBadge>{value}</ValueBadge>,
    },
    {
      title: "Rotate",
      dataIndex: "rotate",
      key: "rotate",

      render: (value: number) => <ValueBadge>{value}°</ValueBadge>,
    },
    {
      title: "Scale",
      dataIndex: "scale",
      key: "scale",

      render: (value: number) => <ValueBadge>{value}x</ValueBadge>,
    },
  ];

  const onclose = () => {
    setOpenDrawer(false);
  };

  const handleEditMulti = () => {
    setOpenDrawer(true);
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    const q = searchText.trim().toLowerCase();
    if (!q) return data;
    return data.filter((item) => {
      const loc = String(item?.locationId ?? "").toLowerCase();
      const name = String(item?.name ?? "").toLowerCase();
      return loc.includes(q) || name.includes(q);
    });
  }, [data, searchText]);

  return (
    <IndustrialContainer>
      <PanelHeader {...listeners} {...attributes}>
        <SettingOutlined />
        {t("toolbar.others.edit_peripheral_style")}
      </PanelHeader>
      <FormHr />

      <Container>
        {/* Form Panel */}
        <Panel width={isEditStation ? "100%" : "0%"}>
          <SettingStyleForm />
        </Panel>

        {/* Table Panel */}
        <Panel width={isEditStation ? "0%" : "100%"} hidden={isEditStation}>
          <ToolbarSection>
            <IndustrialInput
              prefix={<SearchOutlined />}
              placeholder="Search location ID or name"
              allowClear
              style={{ width: 280 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <IndustrialButton
              className="edit-btn"
              disabled={selectedRowKeys.length === 0}
              onClick={handleEditMulti}
              icon={<EditOutlined />}
            >
              Edit ({selectedRowKeys.length})
            </IndustrialButton>

            <IndustrialSelect
              allowClear
              style={{ width: 200 }}
              placeholder="Filter by type"
              onChange={(value) => onChangeAreaType(value)}
              options={uniqueAreaTypes.map((type) => ({
                label: type,
                value: type,
              }))}
              value={filterType ?? undefined}
              suffixIcon={<FilterOutlined />}
            />

            <IndustrialButton
              className="reload-btn"
              onClick={() => refetch()}
              icon={<ReloadOutlined />}
            />
          </ToolbarSection>

          <IndustrialTable
            rowSelection={rowSelection}
            dataSource={filteredData as SingleChargeStation[]}
            columns={columns as []}
            rowKey={(record: SingleChargeStation) => record.locationId}
            pagination={{
              pageSize: 20,
              showTotal: (total, range) => (
                <span style={{ fontFamily: "Roboto Mono, monospace" }}>
                  {range[0]}-{range[1]} of {total}
                </span>
              ),
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
            }}
            scroll={{ x: 1400 }}
          />
        </Panel>
      </Container>

      {openDrawer && (
        <IndustrialDrawer
          title="Bulk Edit Peripheral Styles"
          placement="right"
          onClose={onclose}
          open={openDrawer}
          width={600}
        >
          <SettingMultiStyleForm locations={selectedRowKeys as string[]} />
        </IndustrialDrawer>
      )}
    </IndustrialContainer>
  );
};

export default EditPeripheralIcon;
