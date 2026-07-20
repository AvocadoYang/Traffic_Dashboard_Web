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

const SectionTitle = styled.div<{ $accent?: keyof typeof ACCENT }>`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-family: "Roboto Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ $accent = "group" }) => ACCENT[$accent].main};

  &::before {
    content: "";
    width: 3px;
    height: 11px;
    border-radius: 2px;
    background: ${({ $accent = "group" }) => ACCENT[$accent].main};
  }
`;

// 群組列使用藍色系表示「選取中」, 地圖列則改用紫色系, 讓兩層瀏覽在視覺上能一眼分辨。
const ACCENT = {
  group: { main: "#1890ff", bg: "#e6f7ff" },
  map: { main: "#722ed1", bg: "#f9f0ff" },
} as const;

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
  border-radius: ${({ $accent = "group" }) => ($accent === "map" ? "10px" : "2px")};
  background: ${({ $isSelected, $accent = "group" }) =>
    $isSelected ? ACCENT[$accent].bg : "#ffffff"};
  border: 1px solid
    ${({ $isSelected, $accent = "group" }) =>
      $isSelected ? ACCENT[$accent].main : "#d9d9d9"};
  border-left: 2px solid
    ${({ $isSelected, $isMarked, $accent = "group" }) =>
      $isMarked ? "#eb2f96" : $isSelected ? ACCENT[$accent].main : "#d9d9d9"};
  font-family: "Roboto Mono", monospace;
  font-size: 11px;
  font-weight: ${({ $isSelected }) => ($isSelected ? 700 : 600)};
  color: ${({ $isSelected, $accent = "group" }) =>
    $isSelected ? ACCENT[$accent].main : "#262626"};
  transition: all 0.15s;
  box-shadow: ${({ $isSelected, $accent = "group" }) =>
    $isSelected
      ? `0 2px 8px ${ACCENT[$accent].main}40`
      : "0 1px 3px rgba(0, 0, 0, 0.1)"};

${({ $isMarked }) =>
    $isMarked &&
    `
    border-left: 3px solid #eb2f96;
    box-shadow: 0 0 0 1px rgba(235, 47, 150, 0.35), 0 2px 8px rgba(235, 47, 150, 0.25);
  `}


  .anticon {
    color: ${({ $isSelected, $accent = "group" }) =>
      $isSelected ? ACCENT[$accent].main : "#8c8c8c"};
  }

  &:hover {
    border-color: ${({ $accent = "group" }) => ACCENT[$accent].main};
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
  background: ${({ $isSelected, $accent = "group" }) =>
    $isSelected ? ACCENT[$accent].main : "#f0f0f0"};
  color: ${({ $isSelected }) => ($isSelected ? "#ffffff" : "#595959")};
  font-size: 10px;
  font-weight: 700;
  border-radius: ${({ $accent = "group" }) => ($accent === "map" ? "8px" : "2px")};
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
                  <MarkBadge $color="#eb2f96">
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
            <FolderItem $isSelected={selectedMapId === null} $accent="map">
              {selectedMapId === null ? <FolderOpenOutlined /> : <FolderOutlined />}
              {t("map_manager.all_groups")}
              <FolderCount $isSelected={selectedMapId === null} $accent="map">
                {selectedGroup.maps.reduce((s, m) => s + m.count, 0)}
              </FolderCount>
            </FolderItem>
            {selectedGroup.maps.map((map) => {
              const isSelected = selectedMapId === map.mapId;
              const isCurrent = currentMapId === map.mapId;
              return (
                <FolderItem
                  key={map.mapId}
                  $isSelected={isSelected}
                  $isMarked={isCurrent}
                  $accent="map"
                  onClick={() => onSelectMap(map.mapId)}
                >
                  {isSelected ? <FolderOpenOutlined /> : <FolderOutlined />}
                  {map.floor ? `${map.fileName} (F${map.floor})` : map.fileName}
                  <FolderCount $isSelected={isSelected} $accent="map">
                    {map.count}
                  </FolderCount>
                  {isCurrent && (
                    <MarkBadge $color="#eb2f96">
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
