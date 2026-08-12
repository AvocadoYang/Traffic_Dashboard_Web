import { useState } from "react";
import { Modal, Flex } from "antd";
import styled from "styled-components";
import { BulbOutlined } from "@ant-design/icons";


type LogType = "feature" | "fix" | "improvement";

interface LogEntry {
  version: string;
  date: string;
  type: LogType;
  description: string;
}


const LOG_DATA: LogEntry[] = [
  {
    version: "V20260404",
    date: "2026-04-04",
    type: "feature",
    description: "New feature: can show AGV warning panel on dashboard",
  },
  {
    version: "V20260320",
    date: "2026-03-20",
    type: "fix",
    description:
      "Fixed fork control sequence index mismatch after reorder operation",
  },
  {
    version: "V20260310",
    date: "2026-03-10",
    type: "improvement",
    description:
      "Improved validation panel real-time feedback for incomplete task config",
  },
  {
    version: "V20260228",
    date: "2026-02-28",
    type: "feature",
    description:
      "Added stack mode detection for fork height dynamic control fields",
  },
  {
    version: "V20260215",
    date: "2026-02-15",
    type: "fix",
    description:
      "Fixed yaw angle validation not triggering on spin action type switch",
  },
];


const FilterBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0 16px;
  border-bottom: 1px solid #f0f0f0;
`;

const FilterLabel = styled.span`
  color: #8c8c8c;
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-family: "Roboto Mono", monospace;
`;

const FilterButton = styled.button<{ active: boolean }>`
  background: ${({ active }) => (active ? "#1890ff" : "#fff")};
  border: 1px solid ${({ active }) => (active ? "#1890ff" : "#d9d9d9")};
  color: ${({ active }) => (active ? "#fff" : "#8c8c8c")};
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  letter-spacing: 1px;
  padding: 3px 12px;
  cursor: pointer;
  text-transform: uppercase;
  transition: all 0.2s;

  &:hover {
    background: ${({ active }) => (active ? "#40a9ff" : "#f0f5ff")};
    border-color: #1890ff;
    color: ${({ active }) => (active ? "#fff" : "#1890ff")};
  }
`;

const LogList = styled.div`
  max-height: 340px;
  overflow-y: auto;
`;

const LogRow = styled.div`
  border-bottom: 1px solid #f0f0f0;
  padding: 14px 4px;
  transition: background 0.15s;

  &:hover {
    background: #f0f5ff;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const VersionBadge = styled.span`
  background: #e6f7ff;
  border: 1px solid #1890ff;
  color: #1890ff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 8px;
  letter-spacing: 1px;
  font-family: "Roboto Mono", monospace;
`;

const TypeBadge = styled.span<{ type: LogType }>`
  font-size: 10px;
  font-weight: 700;
  padding: 1px 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-family: "Roboto Mono", monospace;

  ${({ type }) =>
    type === "feature" &&
    `
    background: #f6ffed;
    border: 1px solid #52c41a;
    color: #52c41a;
  `}

  ${({ type }) =>
    type === "fix" &&
    `
    background: #fff1f0;
    border: 1px solid #ff4d4f;
    color: #ff4d4f;
  `}

  ${({ type }) =>
    type === "improvement" &&
    `
    background: #fff7e6;
    border: 1px solid #fa8c16;
    color: #fa8c16;
  `}
`;

const DateText = styled.span`
  color: #bfbfbf;
  font-size: 10px;
  letter-spacing: 1px;
  font-family: "Roboto Mono", monospace;
`;

const DescriptionText = styled.div`
  color: #262626;
  font-size: 12px;
  letter-spacing: 0.5px;
  font-family: "Roboto Mono", monospace;
  margin-top: 6px;
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #d9d9d9;
  margin-top: 4px;
`;

const EntryCount = styled.span`
  color: #8c8c8c;
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-family: "Roboto Mono", monospace;
`;

const StatusDot = styled.div`
  width: 6px;
  height: 6px;
  background: #52c41a;
  border-radius: 50%;
`;

const StatusText = styled.span`
  color: #52c41a;
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-family: "Roboto Mono", monospace;
`;


const ModalTitle = () => (
  <Flex align="center" gap={10}>
    <div style={{ width: 10, height: 10, background: "#1890ff" }} />
    <span
      style={{
        fontFamily: "'Roboto Mono', monospace",
        letterSpacing: 2,
        fontSize: 13,
        color: "#1890ff",
        fontWeight: 700,
        textTransform: "uppercase",
      }}
    >
      System Update Log
    </span>
    <span
      style={{
        background: "#e6f7ff",
        border: "1px solid #1890ff",
        color: "#1890ff",
        fontSize: 10,
        fontWeight: 700,
        padding: "1px 8px",
        letterSpacing: 1,
        fontFamily: "'Roboto Mono', monospace",
      }}
    >
      LIVE
    </span>
  </Flex>
);


type FilterType = "all" | LogType;

const SystemUpdateLogModal = () => {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered =
    filter === "all" ? LOG_DATA : LOG_DATA.filter((e) => e.type === filter);

  const filters: { label: string; value: FilterType }[] = [
    { label: "All", value: "all" },
    { label: "Feature", value: "feature" },
    { label: "Fix", value: "fix" },
    { label: "Improvement", value: "improvement" },
  ];

  return (
    <>

      <button
        onClick={() => setOpen(true)}
        style={{
          background: "#fff",
          border: "1px solid #1890ff",
          color: "#1890ff",
          fontFamily: "'Roboto Mono', monospace",
          fontSize: 11,
          letterSpacing: 1,
          padding: "6px 16px",
          cursor: "pointer",
          textTransform: "uppercase",
        }}
      >
        <BulbOutlined style={{ marginRight: 6 }} />
        Update Log
      </button>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        title={<ModalTitle />}
        width={640}
        styles={{
          header: {
            borderBottom: "2px solid #1890ff",
            paddingBottom: 14,
          },
        }}
      >
    
        <FilterBar>
          <FilterLabel>Filter:</FilterLabel>
          {filters.map(({ label, value }) => (
            <FilterButton
              key={value}
              active={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </FilterButton>
          ))}
        </FilterBar>


        <LogList>
          {filtered.map((entry) => (
            <LogRow key={entry.version}>
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={10}>
                  <VersionBadge>{entry.version}</VersionBadge>
                  <TypeBadge type={entry.type}>{entry.type}</TypeBadge>
                </Flex>
                <DateText>{entry.date}</DateText>
              </Flex>
              <DescriptionText>{entry.description}</DescriptionText>
            </LogRow>
          ))}
        </LogList>

 
        <Footer>
          <EntryCount>
            {filtered.length} entr{filtered.length === 1 ? "y" : "ies"}
          </EntryCount>
          <Flex align="center" gap={8}>
            <StatusDot />
            <StatusText>System nominal</StatusText>
          </Flex>
        </Footer>
      </Modal>
    </>
  );
};

export default SystemUpdateLogModal;