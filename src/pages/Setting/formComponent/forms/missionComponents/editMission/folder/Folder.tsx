import useMissionFolder from "@/api/useMissionFolder";
import { FolderOutlined, FolderOpenOutlined } from "@ant-design/icons";
import { FC } from "react";
import styled from "styled-components";

const FolderList = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  padding-bottom: 1em;
  flex-wrap: wrap;
`;

const FolderItem = styled.div<{ $isSelected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  background: ${({ $isSelected }) => ($isSelected ? "#f6ffed" : "#ffffff")};
  border: 1px solid
    ${({ $isSelected }) => ($isSelected ? "#52c41a" : "#d9d9d9")};
  border-left: 2px solid
    ${({ $isSelected }) => ($isSelected ? "#52c41a" : "#d9d9d9")};
  transition: all 0.2s;
  max-height: 2em;
  position: relative;
  box-shadow: ${({ $isSelected }) =>
    $isSelected
      ? "inset 0 0 20px rgba(82, 196, 26, 0.08), 0 2px 8px rgba(82, 196, 26, 0.25)"
      : "none"};

  ${({ $isSelected }) =>
    $isSelected &&
    `
    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(82, 196, 26, 0.03) 2px,
        rgba(82, 196, 26, 0.03) 4px
      );
      pointer-events: none;
    }
  `}

  &:hover {
    background: ${({ $isSelected }) => ($isSelected ? "#f6ffed" : "#f6ffed")};
    border-color: ${({ $isSelected }) => ($isSelected ? "#52c41a" : "#73d13d")};
    border-left-color: ${({ $isSelected }) =>
      $isSelected ? "#52c41a" : "#73d13d"};
    transform: ${({ $isSelected }) =>
      $isSelected ? "none" : "translateX(4px)"};
    box-shadow: ${({ $isSelected }) =>
      $isSelected
        ? "inset 0 0 20px rgba(82, 196, 26, 0.08), 0 2px 8px rgba(82, 196, 26, 0.25)"
        : "0 2px 8px rgba(82, 196, 26, 0.15)"};
  }
`;

const FolderName = styled.div<{ $isSelected: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  color: ${({ $isSelected }) => ($isSelected ? "#52c41a" : "#262626")};
  font-weight: ${({ $isSelected }) => ($isSelected ? 700 : 600)};
  text-transform: uppercase;
  letter-spacing: ${({ $isSelected }) => ($isSelected ? "1.2px" : "0.5px")};
  transition: all 0.2s;

  .anticon {
    font-size: 14px;
    color: ${({ $isSelected }) => ($isSelected ? "#52c41a" : "#8c8c8c")};
    transition: all 0.2s;
  }
`;

const FolderCount = styled.span<{ $isSelected: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 20px;
  padding: 0 6px;
  background: ${({ $isSelected }) => ($isSelected ? "#52c41a" : "#e6f7ff")};
  border: 1px solid
    ${({ $isSelected }) => ($isSelected ? "#389e0d" : "#1890ff")};
  color: ${({ $isSelected }) => ($isSelected ? "#ffffff" : "#1890ff")};
  font-size: 10px;
  font-weight: 700;
  font-family: "Roboto Mono", monospace;
  margin-left: 8px;
  transition: all 0.2s;
`;

const Folder: FC<{
  selected: string;
  handleFilterFolder: (v: string) => void;
}> = ({ selected, handleFilterFolder }) => {
  const { data: folders } = useMissionFolder();

  return (
    <>
      <FolderList>
        <FolderItem
          $isSelected={selected === ""}
          onClick={() => handleFilterFolder("")}
        >
          <FolderName $isSelected={selected === ""}>
            {selected === "" ? <FolderOpenOutlined /> : <FolderOutlined />}
            All
          </FolderName>
        </FolderItem>
        {folders && folders.length > 0
          ? folders.map((folder) => {
              const isSelected = selected === folder.id;
              const missionCount = folder.missionTitles?.length || 0;

              return (
                <FolderItem
                  key={folder.id}
                  $isSelected={isSelected}
                  onClick={() => handleFilterFolder(folder?.id || "")}
                >
                  <FolderName $isSelected={isSelected}>
                    {isSelected ? <FolderOpenOutlined /> : <FolderOutlined />}
                    {folder.name}
                    {missionCount > 0 && (
                      <FolderCount $isSelected={isSelected}>
                        {missionCount}
                      </FolderCount>
                    )}
                  </FolderName>
                </FolderItem>
              );
            })
          : []}
      </FolderList>
    </>
  );
};

export default Folder;
