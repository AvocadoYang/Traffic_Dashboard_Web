import React, { FC, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Input, Table, Tooltip, Button } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  LeftOutlined,
  RightOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
} from "@ant-design/icons";
import { useSound, type SoundRow } from "../../../../../../../api/useSound";

/* ------------------------------------------------------------------ */
/*  Styled components                                                  */
/* ------------------------------------------------------------------ */

const Card = styled.div`
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
`;

const ToolRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 16px 0;
`;

const SearchInput = styled(Input)`
  max-width: 360px;
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

const Muted = styled.span`
  color: #98a2b3;
`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const formatDuration = (seconds: number | null) => {
  if (seconds === null || Number.isNaN(seconds)) return <Muted>-</Muted>;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const PAGE_SIZE = 8;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const SoundsTable: FC<{ onSelect: (row: SoundRow) => void }> = ({
  onSelect,
}) => {
  const { data = [], isLoading } = useSound();
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState(1);

  useEffect(() => {
    setCurrent(1);
  }, [search]);

  const filtered = useMemo(
    () =>
      data.filter((r) =>
        r.name.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [data, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const columns: ColumnsType<SoundRow> = [
    {
      title: "Name",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, row) => (
        <a onClick={() => onSelect(row)}>{name}</a>
      ),
    },
    { title: "Created by", dataIndex: "created_by" },
    {
      title: "Duration",
      dataIndex: "duration",
      render: formatDuration,
    },
    {
      title: "Volume",
      dataIndex: "volume",
      sorter: (a, b) => a.volume - b.volume,
    },
    {
      title: "Description",
      dataIndex: "note",
      render: (note: string | null) => note || <Muted>-</Muted>,
    },
    {
      title: "Actions",
      dataIndex: "actions",
      align: "right",
      render: (_: unknown, row) => (
        <Tooltip title={row.created_by === "MiR" ? "檢視" : "編輯"}>
          <ActionButton
            icon={row.created_by === "MiR" ? <EyeOutlined /> : <EditOutlined />}
            onClick={() => onSelect(row)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
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
          <PageNavButton disabled={current === 1} onClick={() => setCurrent(1)}>
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

      <Table<SoundRow>
        rowKey="id"
        loading={isLoading}
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
  );
};

export default SoundsTable;