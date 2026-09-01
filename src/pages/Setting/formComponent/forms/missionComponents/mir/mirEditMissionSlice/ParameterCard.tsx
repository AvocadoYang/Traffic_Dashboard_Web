import { SettingOutlined } from "@ant-design/icons";
import { Input, Popover, Switch } from "antd";
import React, { FC, ReactNode, useState } from "react";
import styled from "styled-components";
import { useMirVariableField } from "./MirVariableContext";

const IndustrialCard = styled.div`
  background: #ffffff;
  border: 1px solid #d9d9d9;
  margin-bottom: 20px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  position: relative;

  &:hover {
    border-color: #bfbfbf;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

export const FieldLabel = styled.span`
  color: #595959;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: "Roboto Mono", monospace;
`;

const GearIcon = styled(SettingOutlined)<{ $active: boolean }>`
  cursor: pointer;
  color: ${({ $active }) => ($active ? "#1890ff" : "#bfbfbf")};

  &:hover {
    color: #1890ff;
  }
`;

const VariableChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px dashed #1890ff;
  border-radius: 4px;
  color: #1890ff;
  font-family: "Roboto Mono", monospace;
  cursor: pointer;
  background: #f0f5ff;

  &:hover {
    background: #e6f7ff;
  }
`;

const PopoverBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 220px;
`;

const PopoverRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const VariablePopoverContent: FC<{
  enabled: boolean;
  name: string;
  onChange: (enabled: boolean, name: string) => void;
}> = ({ enabled, name, onChange }) => {
  return (
    <PopoverBody>
      <PopoverRow>
        <FieldLabel>Use a variable</FieldLabel>
        <Switch
          checked={enabled}
          onChange={(checked) => onChange(checked, name)}
        />
      </PopoverRow>
      <PopoverRow>
        <FieldLabel>Name</FieldLabel>
        <Input
          size="small"
          disabled={!enabled}
          value={name}
          onChange={(e) => onChange(enabled, e.target.value)}
          placeholder="variable name"
        />
      </PopoverRow>
    </PopoverBody>
  );
};

const ParameterCard: FC<{
  fieldName: string;
  label: ReactNode;
  children: ReactNode;
}> = ({ fieldName, label, children }) => {
  const { enabled, name, setVariable } = useMirVariableField(fieldName);
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <IndustrialCard>
      <CardHeader>
        <FieldLabel>{label}</FieldLabel>
        <Popover
          open={popoverOpen}
          onOpenChange={setPopoverOpen}
          trigger="click"
          placement="bottomRight"
          content={
            <VariablePopoverContent
              enabled={enabled}
              name={name}
              onChange={(nextEnabled, nextName) => {
                setVariable(nextEnabled, nextName);
                if (!nextEnabled) setPopoverOpen(false);
              }}
            />
          }
        >
          <GearIcon $active={enabled} />
        </Popover>
      </CardHeader>

      {enabled ? (
        <VariableChip onClick={() => setPopoverOpen(true)}>
          <SettingOutlined />
          {name || "(未命名變數)"}
        </VariableChip>
      ) : (
        children
      )}
    </IndustrialCard>
  );
};

export default ParameterCard;
