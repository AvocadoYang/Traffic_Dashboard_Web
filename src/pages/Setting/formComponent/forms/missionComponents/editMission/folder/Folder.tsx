import useMissionFolder from "@/api/useMissionFolder";
import { FolderOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { FC } from "react";
import styled from "styled-components";

const FolderList = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  padding-bottom: 1em;
  flex-wrap: wrap; // 👈 THIS IS THE FIX
`;

const FolderItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-left: 3px solid #52c41a;
  transition: all 0.2s;
  max-height: 2em;
  &:hover {
    background: #f6ffed;
    border-left-color: #73d13d;
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(82, 196, 26, 0.15);
  }
`;

const FolderName = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  color: #262626;
  font-weight: 600;
`;

const FolderActions = styled.div`
  display: flex;
  gap: 4px;
`;

const ActionButton = styled(Button)`
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d9d9d9;
  background: #ffffff;

  &:hover {
    border-color: #1890ff;
    color: #1890ff;
  }

  &.delete-btn:hover {
    border-color: #ff4d4f;
    color: #ff4d4f;
    background: #fff1f0;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2px;
  color: #8c8c8c;
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  border: 1px dashed #d9d9d9;
  max-height: 2em;
  background: #ffffff;
`;

const IndustrialButton = styled(Button)`
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  height: 36px;
  font-weight: 600;
  border-radius: 4px;
  transition: all 0.2s ease;

  &.ant-btn-primary {
    background: #1890ff;
    border-color: #1890ff;

    &:hover {
      background: #40a9ff;
      border-color: #40a9ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
    }
  }

  &.reload-btn {
    background: #ffffff;
    border: 1px solid #d9d9d9;
    color: #595959;

    &:hover {
      background: #fafafa;
      border-color: #1890ff;
      color: #1890ff;
    }
  }
`;

const Folder: FC<{ handleFilterFolder: (v: string) => void }> = ({
  handleFilterFolder,
}) => {
  const { data: folders } = useMissionFolder();

  return (
    <>
      <FolderList>
        <FolderItem onClick={() => handleFilterFolder("")}>
          <FolderName>
            <FolderOutlined />
            All
          </FolderName>
        </FolderItem>
        {folders && folders.length > 0
          ? folders.map((folder) => (
              <FolderItem
                key={folder.id}
                onClick={() => handleFilterFolder(folder?.id || "")}
              >
                <FolderName>
                  <FolderOutlined />
                  {folder.name}
                </FolderName>
              </FolderItem>
            ))
          : []}
      </FolderList>
    </>
  );
};

export default Folder;
