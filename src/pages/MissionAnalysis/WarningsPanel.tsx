import React from "react";
import { Card, Alert, Flex, Typography } from "antd";
import { WarningOutlined } from "@ant-design/icons";

const warnings = [
  { id: 1, message: "Low battery on AMR_001", type: "warning" as const },
  {
    id: 2,
    message: "Emergency button triggered on AMR_003",
    type: "error" as const,
  },
];

const WarningsPanel: React.FC = () => {
  return (
    <Card
      title={
        <Flex align="center" gap="small">
          <WarningOutlined style={{ color: "#faad14" }} />
          <span>Warnings</span>
        </Flex>
      }
      styles={{ body: { padding: "12px" } }} // Modern AntD 5.x syntax for body padding
    >
      <Flex vertical gap="small">
        {warnings.length > 0 ? (
          warnings.map((item) => (
            <Alert
              key={item.id}
              title={item.message}
              type={item.type} // "warning" or "error"
              showIcon
              style={{ borderRadius: "4px" }}
            />
          ))
        ) : (
          <Typography.Text type="secondary">No active warnings</Typography.Text>
        )}
      </Flex>
    </Card>
  );
};

export default WarningsPanel;
