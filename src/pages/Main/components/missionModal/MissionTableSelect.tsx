import { Button, Input, Modal, Table, Tag, Space, Flex } from "antd";
import { useState, useMemo } from "react";
import { SearchOutlined, DatabaseOutlined } from "@ant-design/icons";
import styled from "styled-components";
import Folder from "@/pages/Setting/formComponent/forms/missionComponents/editMission/folder/Folder";
import useAllMissionTitles from "@/api/useMissionTitle";
import { filter } from "rxjs";
import { useTranslation } from "react-i18next";

// Industrial Modal Styling
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
    padding: 16px 24px;
    position: relative;
    border-radius: 0;

    &::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: #1890ff;
    }
  }

  .ant-modal-title {
    font-family: "Roboto Mono", monospace;
    font-size: 16px;
    font-weight: 700;
    color: #1890ff;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .ant-modal-body {
    padding: 24px;
    background: #ffffff;
  }
`;

const IndustrialButton = styled(Button)`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #262626;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 44px;
  font-weight: 600;
  border-radius: 0;
  width: 100%;
  text-align: left;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 0;
    background: #1890ff;
    transition: width 0.2s;
  }

  &:hover {
    background: #f0f5ff;
    border-color: #1890ff;
    color: #1890ff;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);

    &::before {
      width: 4px;
    }
  }

  &.selected {
    background: #e6f7ff;
    border-color: #1890ff;
    color: #1890ff;
    box-shadow: inset 0 0 20px rgba(24, 144, 255, 0.08);

    &::before {
      width: 4px;
    }
  }
`;

const SearchContainer = styled.div`
  margin-bottom: 16px;
  position: relative;
`;

const IndustrialInput = styled(Input)`
  border-radius: 0;
  border: 1px solid #d9d9d9;
  font-family: "Roboto Mono", monospace;
  height: 44px;
  background: #fafafa;

  &:hover {
    border-color: #1890ff;
    background: #ffffff;
  }

  &:focus,
  &.ant-input-focused {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
    background: #ffffff;
  }

  .ant-input-prefix {
    color: #1890ff;
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
    border-radius: 0;

    &::before {
      display: none;
    }
  }

  .ant-table-tbody > tr {
    cursor: pointer;
    transition: all 0.2s;
    position: relative;

    /* &::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 0;
      background: #1890ff;
      transition: width 0.2s;
    } */

    &:hover {
      background: #f0f5ff;

      &::before {
        width: 4px;
      }

      td {
        background: transparent;
      }
    }

    &.ant-table-row-selected {
      background: #e6f7ff;

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

  .ant-table-pagination {
    margin: 16px 0 0 0;
  }

  .ant-pagination-item {
    border: 1px solid #d9d9d9;
    border-radius: 0;
    font-family: "Roboto Mono", monospace;
    background: #fafafa;

    &:hover {
      border-color: #1890ff;
      background: #f0f5ff;
    }

    &.ant-pagination-item-active {
      border-color: #1890ff;
      background: #1890ff;

      a {
        color: #ffffff;
      }
    }
  }
`;

const IndustrialTag = styled(Tag)`
  border-radius: 0;
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  padding: 2px 8px;
  border: 1px solid;
`;

const StatsBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fafafa;
  border: 1px solid #d9d9d9;
  margin-bottom: 16px;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  color: #8c8c8c;
  text-transform: uppercase;
  letter-spacing: 1px;

  .stat-value {
    color: #1890ff;
    font-weight: 700;
  }
`;

const MissionName = styled.div`
  font-weight: 600;
  color: #262626;
  font-size: 13px;
  font-family: "Roboto Mono", monospace;
`;

const MissionTableSelect = ({
  onSelect,
  placeholder,
}: {
  onSelect: (record: any) => void;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [selectFolder, setSelectFolder] = useState<string>("");
  const { data, refetch: refetchMissions } = useAllMissionTitles();

  const handleFilterFolder = (id: string) => {
    setSelectFolder(id);
  };

  const filterMissionData = useMemo(
    () =>
      data
        ?.filter((m) => m.name.includes(search))
        .filter((v) =>
          v.MissionTitleBridgeCategory.some(
            (w) => w.Category.tagName === "normal-mission"
          )
        )
        .filter((m) => {
          if (selectFolder === "") return true;
          return m.mission_folder?.id === selectFolder;
        }) || [],
    [search, data, handleFilterFolder]
  );
  const columns = [
    {
      title: t("main.mission_modal.mission_name"),
      dataIndex: "name",
      key: "name",
      render: (name: string) => <MissionName>{name}</MissionName>,
    },
    {
      title: t("main.mission_modal.tags"),
      dataIndex: "MissionTitleBridgeCategory",
      key: "tags",
      render: (list: any[]) => (
        <Space wrap>
          {list
            .filter((f) => f.Category?.tagName !== "normal-mission")
            .map((m) => (
              <IndustrialTag
                key={m.Category?.id}
                color={m.Category?.color}
                style={{
                  borderColor: m.Category?.color,
                  background: `${m.Category?.color}15`,
                }}
              >
                {m.Category?.tagName}
              </IndustrialTag>
            ))}
        </Space>
      ),
    },
  ];

  if (!data) return <>{t("main.mission_modal.loading")}</>;

  return (
    <>
      <IndustrialButton
        className={selected ? "selected" : ""}
        onClick={() => setOpen(true)}
      >
        {selected
          ? selected.name
          : (placeholder ?? t("main.mission_modal.select_mission_button"))}
      </IndustrialButton>

      <IndustrialModal
        title={
          <>
            <DatabaseOutlined />
            {t("main.mission_modal.title")}
          </>
        }
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={800}
      >
        <SearchContainer>
          <IndustrialInput
            prefix={<SearchOutlined />}
            placeholder={t("main.mission_modal.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </SearchContainer>

        {/* <StatsBar>
          <span>
            Total Missions: <span className="stat-value">{data.length}</span>
          </span>
          <span>
            Filtered:{" "}
            <span className="stat-value">{filterMissionData.length}</span>
          </span>
        </StatsBar> */}

        <Flex vertical>
          <Folder
            selected={selectFolder}
            handleFilterFolder={handleFilterFolder}
          />

          <IndustrialTable
            rowKey="id"
            dataSource={filterMissionData}
            columns={columns}
            pagination={{
              pageSize: 50,
              showSizeChanger: false,
            }}
            onRow={(record) => ({
              onClick: () => {
                setSelected(record);
                onSelect(record);
                setOpen(false);
                setSearch("");
              },
            })}
            rowClassName={(record: any) =>
              selected?.id === record.id ? "ant-table-row-selected" : ""
            }
          />
        </Flex>
      </IndustrialModal>
    </>
  );
};

export default MissionTableSelect;
