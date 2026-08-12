import { FC, useEffect } from "react";
import { Select } from "antd";
import { useAtom } from "jotai";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useMapList from "@/api/useMapList";
import useMapGroup from "@/api/useMapGroup";
import client from "@/api/axiosClient";
import { ErrorResponse } from "@/utils/globalType";
import { currentMapIdAtom } from "@/utils/mapSelection";

// 使用中群組內每張地圖都算使用中, 這個下拉選單純粹是使用者選擇「目前要看/要畫的
// 是哪一張地圖」——選擇結果同時也是新增點位/路徑/區域時綁定 map_id 的依據。
// 選擇結果會回存到後端(map_groups.active_map_id), 下次重開網頁時直接帶回這張,
// 不用每次都跳回群組的第一張地圖。
const MapSelector: FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const { data: maps } = useMapList();
  const { data: groups, isSuccess: groupsLoaded } = useMapGroup();
  const [mapId, setMapId] = useAtom(currentMapIdAtom);
  const queryClient = useQueryClient();

  const activeGroup = groups?.find((g) => g.isUsing);

  const saveActiveMap = useMutation({
    mutationFn: ({ groupId, mapId }: { groupId: string; mapId: string }) =>
      client.patch("api/setting/map-group/active-map", { groupId, mapId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["map-group"] });
    },
    onError: (e: ErrorResponse) => {
      console.error("failed to save last selected map", e);
    },
  });

  useEffect(() => {
    if (!maps || maps.length === 0) return;
    // 群組資料還沒回來就先不決定要用哪張當預設值, 避免先跳第一張、群組資料回來後又跳一次
    if (!groupsLoaded) return;
    if (mapId && maps.some((m) => m.id === mapId)) return;

    const lastSelected = activeGroup?.active_map_id;
    // 記錄的地圖如果已經不屬於目前使用中群組(被刪除/搬走), 安全退回第一張
    const nextMapId =
      lastSelected && maps.some((m) => m.id === lastSelected)
        ? lastSelected
        : maps[0].id;
    setMapId(nextMapId);
  }, [maps, groupsLoaded, activeGroup, mapId, setMapId]);

  if (!maps || maps.length <= 1) return null;

  const handleChange = (value: string) => {
    setMapId(value);
    if (activeGroup?.id) {
      saveActiveMap.mutate({ groupId: activeGroup.id, mapId: value });
    }
  };
  console.log(maps ,'@@@@')
  return (
    <Select
      size="small"
      style={{ minWidth: 180, ...style }}
      value={mapId ?? undefined}
      onChange={handleChange}
      options={maps.map((m) => ({
        label: m.floor ? `${m.fileName} (F${m.floor})` : m.fileName,
        value: m.id,
      }))}
    />
  );
};

export default MapSelector;
