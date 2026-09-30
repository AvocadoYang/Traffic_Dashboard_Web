import { FC } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { c, font, space, mqNarrow } from "./tokens";

export type GroupFolder = {
  groupId: string;
  groupName: string;
  isUsing: boolean;
  maps: { mapId: string; fileName: string; floor: number; count: number }[];
  /** 群組上要顯示的筆數。沒給就把各地圖的 count 加總,給了就以它為準 */
  count?: number;
};

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.sm};
`;

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

const RowLabel = styled.span`
  font-size: ${font.xs};
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: ${c.textMuted};
  min-width: 54px;
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

/** 使用中群組的標記,用外框線表示,不另外用顏色 */
const InUseDot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
`;

type Props = {
  groups: GroupFolder[];
  selectedGroupId: string | null;
  selectedMapId: string | null;
  onSelectGroup: (id: string | null) => void;
  onSelectMap: (id: string | null) => void;
};

const GroupMapFilter: FC<Props> = ({
  groups,
  selectedGroupId,
  selectedMapId,
  onSelectGroup,
  onSelectMap,
}) => {
  const { t } = useTranslation();
  const maps = groups.find((g) => g.groupId === selectedGroupId)?.maps ?? [];

  return (
    <Wrap>
      <Row>
        <RowLabel>{t("map_manager.map_group")}</RowLabel>
        <Chip
          type="button"
          $active={selectedGroupId === null}
          onClick={() => {
            onSelectGroup(null);
            onSelectMap(null);
          }}
        >
          {t("map_manager.all_groups")}
        </Chip>
        {groups.map((g) => {
          const active = g.groupId === selectedGroupId;
          const total = g.count ?? g.maps.reduce((s, m) => s + m.count, 0);
          return (
            <Chip
              key={g.groupId}
              type="button"
              $active={active}
              onClick={() => {
                onSelectGroup(active ? null : g.groupId);
                onSelectMap(null);
              }}
            >
              {g.isUsing && <InUseDot />}
              {g.groupName}
              <Count $active={active}>{total}</Count>
            </Chip>
          );
        })}
      </Row>

      {maps.length > 0 && (
        <Row>
          <RowLabel>{t("map_manager.file_name")}</RowLabel>
          <Chip
            type="button"
            $active={selectedMapId === null}
            onClick={() => onSelectMap(null)}
          >
            ALL
          </Chip>
          {maps.map((m) => {
            const active = m.mapId === selectedMapId;
            return (
              <Chip
                key={m.mapId}
                type="button"
                $active={active}
                onClick={() => onSelectMap(active ? null : m.mapId)}
              >
                {m.fileName}
                {m.floor ? ` (F${m.floor})` : ""}
                <Count $active={active}>{m.count}</Count>
              </Chip>
            );
          })}
        </Row>
      )}
    </Wrap>
  );
};

export default GroupMapFilter;
