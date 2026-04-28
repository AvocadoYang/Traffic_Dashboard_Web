import client from "@/api/axiosClient";
import { EBLM } from "@/pages/Setting/utils/settingJotai";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Table, Flex, Popconfirm } from "antd";
import { useAtom } from "jotai";
import React, { FC, useMemo, useState } from "react";
import styled from "styled-components";
import { RedoOutlined, ToolOutlined } from "@ant-design/icons";
import useBlindMission from "@/api/useBlindMission";

// ===== 共用 Industrial Style（直接複用 TaskFormFork） =====
const IndustrialContainer = styled.div`
  background: #f5f5f5;
  min-height: 100vh;
  padding: 20px;
  font-family: "Roboto Mono", monospace;
`;

const StatusBar = styled.div`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-left: 4px solid #1890ff;
  padding: 12px 16px;
  margin-bottom: 20px;

  /* RWD 關鍵設置 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap; /* 空間不足時允許換行 */
  gap: 12px; /* 設定項目間固定的間距 */

  color: #1890ff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  /* 在小螢幕下，讓搜尋框佔滿寬度 */
  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;

    .search-wrapper {
      width: 100%;
    }
  }
`;

const IndustrialCard = styled.div`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
`;

const IndustrialButton = styled.button`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #1890ff;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  letter-spacing: 1px;
  height: 32px;
  padding: 0 12px;
  cursor: pointer;

  &:hover {
    background: #f0f5ff;
    border-color: #1890ff;
  }
`;

const IndustrialButtondELETE = styled.button`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #ff1837;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  letter-spacing: 1px;
  height: 32px;
  padding: 0 12px;
  cursor: pointer;

  &:hover {
    background: #f0f5ff;
    border-color: #ff0037;
  }
`;

// ⭐ Table 客製（關鍵）
const IndustrialTable = styled(Table)`
  .ant-table {
    font-family: "Roboto Mono", monospace;
  }

  .ant-table-thead > tr > th {
    background: #fafafa;
    color: #8c8c8c;
    font-size: 11px;
    text-transform: uppercase;
    border-bottom: 1px solid #d9d9d9;
  }

  .ant-table-tbody > tr > td {
    border-bottom: 1px solid #f0f0f0;
  }

  .ant-table-tbody > tr:hover > td {
    background: #fafafa;
  }
`;

const IndustrialSearchInput = styled.input`
  width: 280px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #d9d9d9;
  background: #ffffff;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  color: #262626;

  &::placeholder {
    color: #bfbfbf;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  &:focus {
    outline: none;
    border-color: #1890ff;
    box-shadow: 0 0 6px rgba(24, 144, 255, 0.3);
  }
`;

// ===== Component =====
const BlindTable: FC = () => {
  const [, setOpen] = useAtom(EBLM);
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, refetch } = useBlindMission();

  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string }) => {
      return client.post("api/setting/delete-blind-location-mission", {
        id: payload.id,
      });
    },
    onSuccess() {
      refetch();
    },
  });

  const filteredData = useMemo(() => {
    if (!data) return [];

    return data.filter((item: any) => {
      const keyword = searchText.toLowerCase();

      return (
        item.name?.toLowerCase().includes(keyword) ||
        item.bind_mission?.name?.toLowerCase().includes(keyword)
      );
    });
  }, [data, searchText]);

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const columns = [
    { title: "地點名稱", dataIndex: "name", key: "name" },
    {
      title: "location ID",
      dataIndex: "locationId",
      key: "locationId",
      sorter: (a, b) => a.locationId - b.locationId,
    },
    {
      title: "綁定任務",
      dataIndex: "bind_mission",
      key: "mission",
      render: (mission: any) => mission?.name || "無綁定",
    },
    {
      title: "操作",
      render: (_: any, record: any) => (
        <>
          <Flex gap={3}>
            <IndustrialButton
              onClick={() => setOpen({ locationId: record.id, isOpen: true })}
            >
              EDIT
            </IndustrialButton>
            <Popconfirm
              title="Sure to delete?"
              onConfirm={() => handleDelete(record.id)}
            >
              <IndustrialButtondELETE>DELETE</IndustrialButtondELETE>
            </Popconfirm>
          </Flex>
        </>
      ),
    },
  ];

  return (
    <IndustrialContainer>
      <IndustrialCard>
        <StatusBar>
          {/* 左側標題 */}
          <Flex align="center" gap={8}>
            <ToolOutlined />
            <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
              BLIND MISSION TABLE
            </span>
          </Flex>

          {/* 右側工具列 (搜尋框 + 按鈕) */}
          <Flex align="center" gap={8} className="search-wrapper">
            <IndustrialSearchInput
              placeholder="search location / mission..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ flex: 1 }} // 讓搜尋框自動填滿剩餘空間
            />
            <IndustrialButton onClick={() => refetch()}>
              <RedoOutlined />
            </IndustrialButton>
          </Flex>
        </StatusBar>
        <IndustrialTable
          dataSource={filteredData}
          columns={columns}
          loading={isLoading}
          rowKey="id"
        />
      </IndustrialCard>
    </IndustrialContainer>
  );
};

export default BlindTable;
