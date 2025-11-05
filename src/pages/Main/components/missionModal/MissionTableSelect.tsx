import { Button, Input, Modal, Table, Tag, Space } from "antd";
import { useState, useMemo } from "react";
import { SearchOutlined } from "@ant-design/icons";

const MissionTableSelect = ({
  data,
  onSelect,
  placeholder = "Select Mission",
}: {
  data: any[];
  onSelect: (record: any) => void;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const filteredData = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return data;
    return data.filter((item) => {
      const nameMatch = item.name?.toLowerCase().includes(s);
      const tagMatch = item.MissionTitleBridgeCategory?.some((m: any) =>
        m.Category?.tagName?.toLowerCase().includes(s)
      );
      return nameMatch || tagMatch;
    });
  }, [data, search]);

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: "40%",
    },
    {
      title: "Tags",
      dataIndex: "MissionTitleBridgeCategory",
      key: "tags",
      render: (list: any[]) => (
        <Space wrap>
          {list
            .filter((f) => f.Category?.tagName !== "normal-mission")
            .map((m) => (
              <Tag key={m.Category?.id} color={m.Category?.color}>
                {m.Category?.tagName}
              </Tag>
            ))}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Button block onClick={() => setOpen(true)}>
        {selected ? selected.name : placeholder}
      </Button>

      <Modal
        title="Select a Mission"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={800}
      >
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search by name or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ marginBottom: 12 }}
        />

        <Table
          rowKey="id"
          dataSource={filteredData}
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
            },
          })}
          rowClassName={() => "hover-row"}
        />
      </Modal>
    </>
  );
};

export default MissionTableSelect;
