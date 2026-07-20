import { FC, useEffect } from "react";
import { Select } from "antd";
import { useAtom } from "jotai";
import useMapList from "@/api/useMapList";
import { currentMapIdAtom } from "@/utils/mapSelection";

// 使用中群組內每張地圖都算使用中, 這個下拉選單純粹是使用者選擇「目前要看/要畫的
// 是哪一張地圖」——選擇結果同時也是新增點位/路徑/區域時綁定 map_id 的依據。
const MapSelector: FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const { data: maps } = useMapList();
  const [mapId, setMapId] = useAtom(currentMapIdAtom);

  useEffect(() => {
    if (!maps || maps.length === 0) return;
    if (!mapId || !maps.some((m) => m.id === mapId)) {
      setMapId(maps[0].id);
    }
  }, [maps, mapId, setMapId]);

  if (!maps || maps.length <= 1) return null;

  return (
    <Select
      size="small"
      style={{ minWidth: 180, ...style }}
      value={mapId ?? undefined}
      onChange={(value) => setMapId(value)}
      options={maps.map((m) => ({
        label: m.floor ? `${m.fileName} (F${m.floor})` : m.fileName,
        value: m.id,
      }))}
    />
  );
};

export default MapSelector;
