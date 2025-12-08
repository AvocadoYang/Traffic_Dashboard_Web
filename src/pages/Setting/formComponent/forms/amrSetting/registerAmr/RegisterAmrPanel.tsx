// ============= RegisterAmrPanel.tsx =============
import FormHr from "@/pages/Setting/utils/FormHr";
import { Flex } from "antd";
import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import RegisterForm from "./RegisterForm";
import RegisterTable from "./RegisterTable";

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

type When_Finish = {
  robot_type: string;
  full_name: string;
  serialNum: string;
};

const RegisterAmrPanel: FC<{
  sortableId: string;
  attributes: import("@dnd-kit/core").DraggableAttributes;
  listeners:
    | import("@dnd-kit/core/dist/hooks/utilities").SyntheticListenerMap
    | undefined;
}> = ({ attributes, listeners }) => {
  const { t } = useTranslation();
  const [isEdit, setIsEdit] = useState(false);
  const [editData, setEditData] = useState<When_Finish>();

  const props = {
    editData,
    setEditData,
    isEdit,
    setIsEdit,
  };

  return (
    <IndustrialContainer>
      <PanelHeader {...listeners} {...attributes}>
        {t("setting_amr.register_amr.title_name")}
      </PanelHeader>
      <FormHr />

      <Flex gap="middle" justify="flex-start" align="start" vertical>
        <RegisterForm {...props} />
        <RegisterTable {...props} />
      </Flex>
    </IndustrialContainer>
  );
};

export default RegisterAmrPanel;
