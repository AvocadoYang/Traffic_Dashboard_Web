import { FC } from "react";
import { FolderOpenOutlined, FolderOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { useTranslation } from "react-i18next";

const FolderSection = styled.div`
  margin-bottom: 0.75em;
`;

const FolderRow = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  flex-wrap: wrap;
`;

// 標題只是區分「地圖群組」與「地圖」兩個區塊，與下方項目的選取／使用中狀態無關，
// 因此維持各自的標題色（群組藍、地圖紫）。
const HEADER_ACCENT = {
  group: "#1890ff",
  map: "#722ed1",
} as const;

const SectionTitle = styled.div<{ $accent?: keyof typeof HEADER_ACCENT }>`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ $accent = "group" }) => HEADER_ACCENT[$accent]};

  &::before {
    content: "";
    width: 3px;
    height: 11px;
    border-radius: 2px;
    background: ${({ $accent = "group" }) => HEADER_ACCENT[$accent]};
  }
`;

// 群組列與地圖列的形狀不同（方形 / 圓角）以利兩層瀏覽視覺分辨，
// 但選取狀態統一採用綠色（與編輯任務的資料夾選取樣式一致），
// 使用中／顯示中則統一採用藍色，避免顏色語意衝突。
const ACCENT = {
  group: { radius: "2px" },
  map: { radius: "10px" },
} as const;

const SELECTED = { main: "#52c41a", bg: "#f6ffed" };
const IN_USE = { main: "#1890ff", bg: "#e6f7ff" };

const FolderItem = styled.div<{
  $isSelected: boolean;
  $isMarked?: boolean;
  $accent?: keyof typeof ACCENT;
}>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  cursor: pointer;
  border-radius: ${({ $accent = "group" }) => ACCENT[$accent].radius};
  background: ${({ $isSelected }) => ($isSelected ? SELECTED.bg : "#ffffff")};
  border: 1px solid
    ${({ $isSelected }) => ($isSelected ? SELECTED.main : "#d9d9d9")};
  border-left: 2px solid
    ${({ $isSelected, $isMarked }) =>
      $isMarked ? IN_USE.main : $isSelected ? SELECTED.main : "#d9d9d9"};
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: ${({ $isSelected }) => ($isSelected ? 700 : 600)};
  color: ${({ $isSelected }) => ($isSelected ? SELECTED.main : "#262626")};
  transition: all 0.15s;
  box-shadow: ${({ $isSelected }) =>
    $isSelected
      ? `0 2px 8px ${SELECTED.main}40`
      : "0 1px 3px rgba(0, 0, 0, 0.1)"};

${({ $isMarked }) =>
    $isMarked &&
    `
    border-left: 3px solid ${IN_USE.main};
    box-shadow: 0 0 0 1px rgba(24, 144, 255, 0.35), 0 2px 8px rgba(24, 144, 255, 0.25);
  `}


  .anticon {
    color: ${({ $isSelected }) => ($isSelected ? SELECTED.main : "#8c8c8c")};
  }

  &:hover {
    border-color: ${SELECTED.main};
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }
`;

const FolderCount = styled.span<{
  $isSelected: boolean;
  $accent?: keyof typeof ACCENT;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  padding: 0 4px;
  background: ${({ $isSelected }) => ($isSelected ? SELECTED.main : "#f0f0f0")};
  color: ${({ $isSelected }) => ($isSelected ? "#ffffff" : "#595959")};
  font-size: 10px;
  font-weight: 700;
  border-radius: ${({ $accent = "group" }) => ACCENT[$accent].radius};
`;

const MarkBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  background: ${({ $color }) => `${$color}18`};
  border: 1px solid ${({ $color }) => $color};
  color: ${({ $color }) => $color};
  font-size: 9px;
  font-weight: 700;
  font-family: "Roboto Mono", monospace;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export type GroupFolder = {
  groupId: string;
  groupName: string;
  isUsing: boolean;
  maps: { mapId: string; fileName: string; floor?: number; count: number }[];
};

// 兩層資料夾瀏覽: 第一層是所有地圖群組(標示使用中的群組), 點擊後在第二層展開
// 該群組底下所有地圖(標示目前畫布顯示中的地圖)。
const GroupMapFolderBrowser: FC<{
  groups: GroupFolder[];
  selectedGroupId: string | null;
  selectedMapId: string | null;
  currentMapId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onSelectMap: (mapId: string | null) => void;
}> = ({
  groups,
  selectedGroupId,
  selectedMapId,
  currentMapId,
  onSelectGroup,
  onSelectMap,
}) => {
  const { t } = useTranslation();

  const totalCount = groups.reduce(
    (sum, g) => sum + g.maps.reduce((s, m) => s + m.count, 0),
    0,
  );

  const selectedGroup = groups.find((g) => g.groupId === selectedGroupId) ?? null;

  return (
    <>
      <FolderSection>
        <SectionTitle $accent="group">{t("map_manager.map_group")}</SectionTitle>
        <FolderRow>
          <FolderItem
            $isSelected={selectedGroupId === null}
            $accent="group"
            onClick={() => {
              onSelectGroup(null);
              onSelectMap(null);
            }}
          >
            {selectedGroupId === null ? <FolderOpenOutlined /> : <FolderOutlined />}
            {t("map_manager.all_groups")}
            <FolderCount $isSelected={selectedGroupId === null} $accent="group">
              {totalCount}
            </FolderCount>
          </FolderItem>
          {groups.map((group) => {
            const isSelected = selectedGroupId === group.groupId;
            const count = group.maps.reduce((s, m) => s + m.count, 0);
            return (
              <FolderItem
                key={group.groupId}
                $isSelected={isSelected}
                $isMarked={group.isUsing}
                $accent="group"
                onClick={() => {
                  onSelectGroup(group.groupId);
                  onSelectMap(null);
                }}
              >
                {isSelected ? <FolderOpenOutlined /> : <FolderOutlined />}
                {group.groupName}
                <FolderCount $isSelected={isSelected} $accent="group">
                  {count}
                </FolderCount>
                {group.isUsing && (
                  <MarkBadge $color={IN_USE.main}>
                    {t("map_group_table.active")}
                  </MarkBadge>
                )}
              </FolderItem>
            );
          })}
        </FolderRow>
      </FolderSection>

      {selectedGroup && (
        <FolderSection>
          <SectionTitle $accent="map">{t("map_group_table.maps")}</SectionTitle>
          <FolderRow>
            {selectedGroup.maps.map((map) => {
              const isSelected = selectedMapId === map.mapId;
              const isCurrent = currentMapId === map.mapId;
              return (
                <FolderItem
                  key={map.mapId}
                  $isSelected={isSelected}
                  $isMarked={isCurrent}
                  $accent="map"
                  onClick={() => onSelectMap(isSelected ? null : map.mapId)}
                >
                  {isSelected ? <FolderOpenOutlined /> : <FolderOutlined />}
                  {map.floor ? `${map.fileName} (F${map.floor})` : map.fileName}
                  <FolderCount $isSelected={isSelected} $accent="map">
                    {map.count}
                  </FolderCount>
                  {isCurrent && (
                    <MarkBadge $color={IN_USE.main}>
                      {t("map_manager.currently_displayed")}
                    </MarkBadge>
                  )}
                </FolderItem>
              );
            })}
          </FolderRow>
        </FolderSection>
      )}
    </>
  );
};

export default GroupMapFolderBrowser;
