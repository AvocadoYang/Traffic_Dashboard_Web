import { FC } from "react";
import styled from "styled-components";
import { FolderOpenOutlined, FolderOutlined } from "@ant-design/icons";
import useMissionFolder from "@/api/useMissionFolder";
import { c, font, space, mqNarrow } from "../../../ui/tokens";

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.sm};
  flex-wrap: wrap;

  ${mqNarrow} {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
    > * {
      flex-shrink: 0;
    }
  }
`;

const Chip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  border-radius: 2px;
  cursor: pointer;
  font-family: ${font.mono};
  font-size: ${font.xs};
  letter-spacing: 0.5px;
  transition: all 0.15s ease;

  border: 1px solid ${({ $active }) => ($active ? c.accent : c.border)};
  background: ${({ $active }) => ($active ? c.accent : c.bg)};
  color: ${({ $active }) => ($active ? c.onAccent : c.textSecondary)};

  &:hover {
    border-color: ${({ $active }) => ($active ? c.accent : c.borderStrong)};
    color: ${({ $active }) => ($active ? c.onAccent : c.text)};
  }
`;

const Count = styled.span<{ $active: boolean }>`
  font-size: 10px;
  opacity: 0.7;
  color: ${({ $active }) => ($active ? c.onAccent : c.textMuted)};
`;

type Props = {
  /** 空字串代表「全部」 */
  selected: string;
  onSelect: (id: string) => void;
};

const FolderChips: FC<Props> = ({ selected, onSelect }) => {
  const { data: folders } = useMissionFolder();

  return (
    <Row>
      <Chip type="button" $active={selected === ""} onClick={() => onSelect("")}>
        {selected === "" ? <FolderOpenOutlined /> : <FolderOutlined />}
        ALL
      </Chip>

      {folders?.map((folder) => {
        const id = folder.id ?? "";
        const active = selected === id;
        const count = folder.missionTitles?.length ?? 0;
        return (
          <Chip
            key={id}
            type="button"
            $active={active}
            onClick={() => onSelect(active ? "" : id)}
          >
            {active ? <FolderOpenOutlined /> : <FolderOutlined />}
            {folder.name}
            {count > 0 && <Count $active={active}>{count}</Count>}
          </Chip>
        );
      })}
    </Row>
  );
};

export default FolderChips;
