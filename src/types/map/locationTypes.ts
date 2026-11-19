/** 設定頁編輯點位用的表單資料形狀 (後端 API 回傳的型別在 @/api/type/useLocation) */
export type LocationType = {
  id?: string;
  locationId: string;
  x: number;
  y: number;
  offset_x: number;
  offset_y: number;
  areaType: string;
  rotation: number;
  canRotate: boolean;
  rotate: number;
  map_id?: string;
  ip?: string | null;
  wait_area_id?: string | null;
  wait_order?: number;
  is_mir_waiting_point?: boolean | null;
  standby_accept_cargo?: boolean;
  currentMapId?: string;
};
